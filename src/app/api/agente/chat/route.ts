/**
 * POST /api/agente/chat
 * Agente IA geral — funciona em qualquer página do sistema.
 * Body: { message, history, context: { type, diagnosticId, systemHint } }
 * Retorna: text/event-stream (SSE)
 */

import { NextRequest, NextResponse }          from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  fetchDiagnosticChatContext,
  saveChatMessage,
  createChatStream,
} from '@/lib/ai/chat-service'

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

  // ── Se é contexto de relatório com diagnóstico, usa o serviço completo ──
  if (context.type === 'report' && context.diagnosticId) {
    const ctx = await fetchDiagnosticChatContext(context.diagnosticId, message)

    if (ctx) {
      // Salva mensagem do usuário no histórico
      await saveChatMessage(context.diagnosticId, 'user', message.trim())

      const readable = createChatStream({
        systemContent:  ctx.systemContent + `\n\nPÁGINA ATUAL: ${context.systemHint}`,
        history:        ctx.history.map(m => ({ role: m.role, content: m.content })),
        userMessage:    message.trim(),
        maxTokens:      4096,
        diagnosticId:   context.diagnosticId,
      })

      return new NextResponse(readable, {
        headers: {
          'Content-Type':  'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection':    'keep-alive',
        },
      })
    }
  }

  // ── Contexto geral (dashboard, diagnostic, general) ─────────────
  const systemContent = GENERAL_SYSTEM + `\n\nPÁGINA ATUAL: ${context.systemHint}`

  const readable = createChatStream({
    systemContent,
    history,
    userMessage: message.trim(),
    maxTokens:   2048,
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
