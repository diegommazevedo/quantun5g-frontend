/**
 * POST /api/agente/chat
 * Agente IA geral — funciona em qualquer página do sistema.
 * Body: { message, history, context: { type, diagnosticId, systemHint } }
 * Retorna: text/event-stream (SSE)
 */

import { NextRequest, NextResponse }               from 'next/server'
import { createClient as createServerClient }      from '@/lib/supabase/server'
import { createClient }                            from '@supabase/supabase-js'
import { getGroq, GROQ_MODEL, CHAT_TEMPERATURE }   from '@/lib/ai/groq-client'
import { SYSTEM_PROMPT, buildDiagnosticContext }   from '@/lib/ai/system-prompt'
import { embedText }                               from '@/lib/ai/openai-embeddings'
import type { DiagnosticResult, Laudo, AiReport }  from '@/types/database'

function adminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

// ── System prompt para contextos sem diagnóstico ──────────────────
const GENERAL_SYSTEM = `Você é o assistente do Quantum5G — plataforma de diagnóstico organizacional baseada na metodologia Pentagrama de Ginger, desenvolvida por Jovane Borlini da Silva.
Responda sempre em português brasileiro. Seja direto, profundo e orientado a ação.

SOBRE O QUANTUM5G:
- Diagnóstico organizacional em 5 dimensões: Física, Afetiva, Racional, Social, Cultural
- 18 blocos temáticos, 125 questões por diagnóstico
- IL: perspectiva da liderança | IC: perspectiva dos colaboradores
- Resultado combinado ponderado (padrão IC×70% + IL×30%)
- Níveis: Crítico (0–49%), Atenção (50–69%), Bom (70–84%), Excelente (85–100%)
- A Bolha de Percepção é o gap entre IC e IL — quanto maior, mais desconectada está a liderança

FLUXO DE CRIAÇÃO DE DIAGNÓSTICO:
Se o usuário expressar intenção de criar um diagnóstico, conduza este diálogo passo a passo:
Passo 1: Pergunte o nome da empresa.
Passo 2: Pergunte quantos colaboradores participarão da coleta IC.
Passo 3: Pergunte o nome do líder que vai responder o IL.
Passo 4: Pergunte o e-mail do líder.
Passo 5: Apresente o resumo e peça confirmação: "Confirmo a criação: Empresa: [X] | Colaboradores previstos: [N] | Líder: [Nome] ([email]) — confirma?"
Passo 6: Ao receber confirmação, responda confirmando e inclua EXATAMENTE ao final, sem espaço extra:
[CRIAR_DIAGNOSTICO: {"company_name": "NOME", "leader_name": "NOME", "leader_email": "EMAIL", "n_collaborators": N}]

REGRA ABSOLUTA: Nunca mencione números de score — interprete o que revelam sobre o campo organizacional.`

// ─────────────────────────────────────────────────────────────────

interface RequestBody {
  message: string
  history: Array<{ role: 'user' | 'assistant'; content: string }>
  context: {
    type:         'dashboard' | 'diagnostic' | 'report' | 'general'
    diagnosticId: string | null
    systemHint:   string
  }
}

export async function POST(req: NextRequest) {
  const supabase = await createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const body     = await req.json() as RequestBody
  const { message, history = [], context } = body

  if (!message?.trim()) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  const admin = adminClient()

  // ── Contexto diagnóstico (apenas em /relatorio/[id]) ─────────
  let diagnosticContext = ''

  if (context.type === 'report' && context.diagnosticId) {
    try {
      const [diagRes, resultRes] = await Promise.all([
        admin
          .from('diagnostics')
          .select('*, companies(name)')
          .eq('id', context.diagnosticId)
          .single(),
        (admin
          .from('diagnostic_results')
          .select('*')
          .eq('diagnostic_id', context.diagnosticId)
          .single()) as unknown as Promise<{ data: DiagnosticResult | null }>,
      ])

      const diag   = diagRes.data
      const result = resultRes.data

      if (diag && result) {
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

        // AI Report
        const { data: aiReport } = await admin
          .from('ai_reports')
          .select('*')
          .eq('diagnostic_id', context.diagnosticId)
          .single() as { data: AiReport | null }

        // RAG semântico
        let ragChunks: string[] = []
        try {
          const qEmb = await embedText(message)
          const { data: similar } = await admin.rpc('match_diagnostic_embeddings', {
            p_diagnostic_id: context.diagnosticId,
            p_embedding:     JSON.stringify(qEmb),
            p_limit:         4,
          })
          ragChunks = (similar as Array<{ content: string }> ?? []).map(r => r.content)
        } catch { /* RAG falha silenciosamente */ }

        diagnosticContext = buildDiagnosticContext({
          companyName:  (diag.companies as { name: string })?.name ?? 'Empresa',
          leaderName:   diag.leader_name,
          nRespondents: result.n_ic_respondents,
          result,
          laudos,
          aiReport,
          chatHistory:  [],
          ragChunks,
        })
      }
    } catch { /* continua sem contexto diagnóstico */ }
  }

  // ── Monta system prompt por tipo de contexto ─────────────────
  const isReportCtx = context.type === 'report' && diagnosticContext
  const systemContent = isReportCtx
    ? SYSTEM_PROMPT + `\n\nPÁGINA ATUAL: ${context.systemHint}\n` + diagnosticContext
    : GENERAL_SYSTEM + `\n\nPÁGINA ATUAL: ${context.systemHint}`

  const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
    { role: 'system', content: systemContent },
    ...history.slice(-20),
    { role: 'user', content: message.trim() },
  ]

  // ── Stream via Groq ───────────────────────────────────────────
  const groq   = getGroq()
  const stream = await groq.chat.completions.create({
    model:       GROQ_MODEL,
    temperature: CHAT_TEMPERATURE,
    max_tokens:  2048,
    stream:      true,
    messages,
  })

  const readable = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        for await (const chunk of stream) {
          const delta = chunk.choices[0]?.delta?.content ?? ''
          if (delta) {
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ delta })}\n\n`))
          }
        }
        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } finally {
        controller.close()
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
