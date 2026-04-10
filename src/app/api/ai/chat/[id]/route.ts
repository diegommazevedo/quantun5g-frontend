/**
 * POST /api/ai/chat/[id]
 * Streaming chat with diagnostic-scoped AI context.
 * Body: { message: string, history?: Array<{ role, content }> }
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServerClient } from '@/lib/supabase/server'
import {
  fetchDiagnosticChatContext,
  saveChatMessage,
  createChatStream,
} from '@/lib/ai/chat-service'

type ChatRole = 'user' | 'assistant'

interface RequestBody {
  message?: string
  history?: Array<{ role: ChatRole; content: string }>
}

const MAX_SESSION_HISTORY = 20

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await createServerClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  const isAdmin = profile?.role === 'admin'
  const isConsultant = profile?.role === 'consultant'
  if (!isAdmin && !isConsultant) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const { data: diag } = await supabase
    .from('diagnostics')
    .select('consultant_id')
    .eq('id', id)
    .single() as { data: { consultant_id: string } | null }

  if (!diag) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })
  if (!isAdmin && diag.consultant_id !== user.id) {
    return NextResponse.json({ error: 'Sem permissão para este diagnóstico' }, { status: 403 })
  }

  const body = await req.json() as RequestBody
  const userMessage = body.message?.trim()
  if (!userMessage) return NextResponse.json({ error: 'Mensagem vazia' }, { status: 400 })

  const sessionHistory = (body.history ?? [])
    .filter((m) => (m.role === 'user' || m.role === 'assistant') && !!m.content?.trim())
    .slice(-MAX_SESSION_HISTORY)

  const ctx = await fetchDiagnosticChatContext(id, userMessage, user.id)
  if (!ctx) return NextResponse.json({ error: 'Diagnóstico não encontrado' }, { status: 404 })

  await saveChatMessage(id, 'user', userMessage, user.id)

  const readable = createChatStream({
    systemContent: ctx.systemContent,
    history: sessionHistory.length ? sessionHistory : ctx.history.map((m) => ({ role: m.role, content: m.content })),
    userMessage,
    maxTokens: 2048,
    diagnosticId: id,
    userId: user.id,
  })

  return new NextResponse(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}

