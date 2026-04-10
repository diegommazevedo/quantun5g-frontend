/**
 * QUANTUM5G — Chat Service
 * Lógica compartilhada entre /api/agente/chat e /api/ai/chat/[id].
 * Busca contexto diagnóstico, RAG, histórico, e stream Groq.
 */

import { createClient }             from '@supabase/supabase-js'
import { getGroq, GROQ_MODEL, CHAT_TEMPERATURE } from './groq-client'
import { SYSTEM_PROMPT, buildDiagnosticContext }  from './system-prompt'
import { embedText }                 from './openai-embeddings'
import type { DiagnosticResult, Laudo, AiReport, AiChatMessage } from '@/types/database'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── Contexto diagnóstico completo ──────────────────────────────

export interface DiagnosticChatContext {
  systemContent: string
  companyName:   string
  history:       AiChatMessage[]
}

export async function fetchDiagnosticChatContext(
  diagnosticId: string,
  userMessage:   string,
): Promise<DiagnosticChatContext | null> {
  const admin = adminClient()

  const [diagRes, resultRes] = await Promise.all([
    admin.from('diagnostics').select('*, companies(name)').eq('id', diagnosticId).single(),
    admin.from('diagnostic_results').select('*').eq('diagnostic_id', diagnosticId).single() as unknown as Promise<{ data: DiagnosticResult | null }>,
  ])

  const diag   = diagRes.data
  const result = resultRes.data
  if (!diag || !result) return null

  // Laudos
  const laudoIds = [
    result.laudo_fisica_id, result.laudo_afetiva_id, result.laudo_racional_id,
    result.laudo_social_id, result.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } = laudoIds.length > 0
    ? await admin.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
    : { data: [] as Laudo[] }

  const laudos: Record<string, string> = {}
  for (const l of laudosRows ?? []) laudos[l.dimensao] = l.texto

  // AI Report (busca o inicial)
  const { data: aiReport } = await admin
    .from('ai_reports')
    .select('*')
    .eq('diagnostic_id', diagnosticId)
    .eq('report_type', 'inicial')
    .single() as { data: AiReport | null }

  // Histórico (últimas 20)
  const { data: history } = await admin
    .from('ai_chat_history')
    .select('*')
    .eq('diagnostic_id', diagnosticId)
    .order('created_at', { ascending: true })
    .limit(20) as { data: AiChatMessage[] | null }

  // RAG semântico
  let ragChunks: string[] = []
  try {
    const queryEmbedding = await embedText(userMessage)
    const { data: similar } = await admin.rpc('match_diagnostic_embeddings', {
      p_diagnostic_id: diagnosticId,
      p_embedding:     JSON.stringify(queryEmbedding),
      p_limit:         5,
    })
    ragChunks = (similar as Array<{ content: string }> ?? []).map(r => r.content)
  } catch {
    // RAG falha silenciosamente
  }

  const companyName = (diag.companies as { name: string })?.name ?? 'Empresa'

  const context = buildDiagnosticContext({
    companyName,
    leaderName:   diag.leader_name,
    nRespondents: result.n_ic_respondents,
    result,
    laudos,
    aiReport,
    chatHistory:  history ?? [],
    ragChunks,
  })

  return {
    systemContent: SYSTEM_PROMPT + '\n\n' + context,
    companyName,
    history:       history ?? [],
  }
}

// ── Salvar mensagem no histórico ───────────────────────────────

export async function saveChatMessage(
  diagnosticId: string,
  role:          'user' | 'assistant',
  content:       string,
) {
  const admin = adminClient()
  await admin.from('ai_chat_history').insert({
    diagnostic_id: diagnosticId,
    role,
    content,
  })
}

// ── Stream Groq → ReadableStream SSE ───────────────────────────

export interface StreamOptions {
  systemContent:  string
  history:        Array<{ role: 'user' | 'assistant'; content: string }>
  userMessage:    string
  maxTokens?:     number
  diagnosticId?:  string | null  // se fornecido, salva resposta no histórico
}

export function createChatStream(options: StreamOptions): ReadableStream {
  const {
    systemContent,
    history,
    userMessage,
    maxTokens = 4096,
    diagnosticId,
  } = options

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
    ...history.slice(-20),
    { role: 'user', content: userMessage },
  ]

  return new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      let fullResponse = ''

      try {
        const groq   = getGroq()
        const stream = await groq.chat.completions.create({
          model:       GROQ_MODEL,
          temperature: CHAT_TEMPERATURE,
          max_tokens:  maxTokens,
          stream:      true,
          messages,
        })

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
        // Salva resposta do assistente no histórico
        if (fullResponse && diagnosticId) {
          saveChatMessage(diagnosticId, 'assistant', fullResponse).catch(e =>
            console.error('[chat_history_save]', e)
          )
        }
      }
    },
  })
}
