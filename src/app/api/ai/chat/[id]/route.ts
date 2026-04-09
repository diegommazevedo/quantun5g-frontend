/**
 * POST /api/ai/chat/[id]
 * Chat streaming com o agente IA.
 * Body: { message: string }
 * Retorna: text/event-stream (SSE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import { createClient }              from '@supabase/supabase-js'
import { getGroq, GROQ_MODEL, CHAT_TEMPERATURE } from '@/lib/ai/groq-client'
import { SYSTEM_PROMPT, buildDiagnosticContext } from '@/lib/ai/system-prompt'
import { embedText }                 from '@/lib/ai/openai-embeddings'
import type { DiagnosticResult, Laudo, AiReport, AiChatMessage } from '@/types/database'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  // Permissão
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single() as { data: { role: string } | null }
  const isAdmin      = profile?.role === 'admin'
  const isConsultant = profile?.role === 'consultant'
  if (!isAdmin && !isConsultant) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const body = await req.json() as { message?: string }
  const userMessage = body.message?.trim()
  if (!userMessage) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  const admin = adminClient()

  // Dados do diagnóstico
  const { data: diag } = await admin
    .from('diagnostics')
    .select('*, companies(name)')
    .eq('id', id)
    .single()

  if (!diag) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })

  const { data: result } = await admin
    .from('diagnostic_results')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: DiagnosticResult | null }

  // Laudos
  const laudoIds = [
    result?.laudo_fisica_id, result?.laudo_afetiva_id, result?.laudo_racional_id,
    result?.laudo_social_id, result?.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } = laudoIds.length > 0
    ? await admin.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
    : { data: [] as Laudo[] }

  const laudos: Record<string, string> = {}
  for (const l of laudosRows ?? []) laudos[l.dimensao] = l.texto

  // AI Report
  const { data: aiReport } = await admin
    .from('ai_reports')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: AiReport | null }

  // Histórico (últimas 20)
  const { data: history } = await admin
    .from('ai_chat_history')
    .select('*')
    .eq('diagnostic_id', id)
    .order('created_at', { ascending: true })
    .limit(20) as { data: AiChatMessage[] | null }

  // Busca semântica (RAG)
  let ragChunks: string[] = []
  try {
    const queryEmbedding = await embedText(userMessage)
    const { data: similar } = await admin.rpc('match_diagnostic_embeddings', {
      p_diagnostic_id: id,
      p_embedding:     JSON.stringify(queryEmbedding),
      p_limit:         5,
    })
    ragChunks = (similar as Array<{ content: string }> ?? []).map(r => r.content)
  } catch {
    // RAG falha silenciosamente — continua sem contexto semântico
  }

  // Contexto completo
  const context = result ? buildDiagnosticContext({
    companyName:  (diag.companies as { name: string })?.name ?? 'Empresa',
    leaderName:   diag.leader_name,
    nRespondents: result.n_ic_respondents,
    result,
    laudos,
    aiReport,
    chatHistory:  history ?? [],
    ragChunks,
  }) : ''

  // Salva mensagem do usuário
  await admin.from('ai_chat_history').insert({
    diagnostic_id: id,
    role:          'user',
    content:       userMessage,
  })

  // Monta mensagens para Groq
  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: SYSTEM_PROMPT + '\n\n' + context },
    ...(history ?? []).map(m => ({
      role:    m.role as 'user' | 'assistant',
      content: m.content,
    })),
    { role: 'user', content: userMessage },
  ]

  // Streaming via Groq
  const groq   = getGroq()
  const stream = await groq.chat.completions.create({
    model:       GROQ_MODEL,
    temperature: CHAT_TEMPERATURE,
    max_tokens:  4096,
    stream:      true,
    messages,
  })

  // SSE stream → cliente
  let fullResponse = ''
  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            fullResponse += delta
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
        // Salva resposta do assistente
        if (fullResponse) {
          await admin.from('ai_chat_history').insert({
            diagnostic_id: id,
            role:          'assistant',
            content:       fullResponse,
          })
        }
      }
    },
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
