/**
 * POST /api/ai/chat/[id]
 * Chat streaming com o agente IA — contexto diagnóstico completo.
 * Body: { message: string }
 * Retorna: text/event-stream (SSE)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  fetchDiagnosticChatContext,
  saveChatMessage,
  createChatStream,
} from '@/lib/ai/chat-service'

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

  // Busca contexto diagnóstico completo (dados, laudos, RAG, histórico)
  const ctx = await fetchDiagnosticChatContext(id, userMessage)
  if (!ctx) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })

  // Salva mensagem do usuário
  await saveChatMessage(id, 'user', userMessage)

  // Stream
  const readable = createChatStream({
    systemContent:  ctx.systemContent,
    history:        ctx.history.map(m => ({ role: m.role, content: m.content })),
    userMessage,
    maxTokens:      4096,
    diagnosticId:   id,
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type':  'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection':    'keep-alive',
    },
  })
}
