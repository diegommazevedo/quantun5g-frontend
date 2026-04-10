/**
 * QUANTUM5G — Página do Agente IA (chat diagnóstico-específico)
 * /relatorio/[id]/agente
 * Server Component que carrega dados + renderiza AgenteChat.
 */

import { redirect }     from 'next/navigation'
import Link              from 'next/link'
import { createClient }  from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { generateSmartChips } from '@/lib/ai/smart-chips'
import { AgenteChat }    from './AgenteChat'
import type { DiagnosticResult, AiReport, AiChatMessage } from '@/types/database'

function isMissingUserIdColumnError(error: unknown) {
  const msg = typeof error === 'object' && error && 'message' in error
    ? String((error as { message?: unknown }).message ?? '')
    : String(error ?? '')
  return msg.toLowerCase().includes('user_id')
}

export default async function AgenteChatPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Auth
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Permissão
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }

  if (!profile || !['admin', 'consultant'].includes(profile.role)) {
    redirect('/dashboard')
  }

  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  // Dados do diagnóstico
  const { data: diag } = await admin
    .from('diagnostics')
    .select('id, name, consultant_id, companies(name)')
    .eq('id', id)
    .single()

  if (!diag) redirect('/dashboard')
  if (profile.role !== 'admin' && diag.consultant_id !== user.id) {
    redirect('/dashboard')
  }

  // Resultado (necessário para smart chips)
  const { data: result } = await admin
    .from('diagnostic_results')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: DiagnosticResult | null }

  // AI Report inicial
  const { data: aiReport } = await admin
    .from('ai_reports')
    .select('*')
    .eq('diagnostic_id', id)
    .eq('report_type', 'inicial')
    .single() as { data: AiReport | null }

  // Histórico de chat (escopado por usuário quando a coluna user_id existir)
  const scopedHistoryQuery = await admin
    .from('ai_chat_history')
    .select('role, content')
    .eq('diagnostic_id', id)
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(50)

  let chatHistory: Pick<AiChatMessage, 'role' | 'content'>[] = []
  if (!scopedHistoryQuery.error) {
    chatHistory = (scopedHistoryQuery.data ?? []) as Pick<AiChatMessage, 'role' | 'content'>[]
  } else if (!isMissingUserIdColumnError(scopedHistoryQuery.error)) {
    throw new Error(scopedHistoryQuery.error.message)
  }

  // Smart chips baseados nos dados reais
  const smartChips = result
    ? generateSmartChips(result, aiReport)
    : []

  const companyName = (diag.companies as unknown as { name: string } | null)?.name ?? 'Empresa'
  const initialMessages = chatHistory.map(m => ({
    role: m.role as 'user' | 'assistant',
    content: m.content,
  }))

  return (
    <div className="h-screen flex flex-col bg-zinc-50">
      {/* ── Header ──────────────────────────────────────── */}
      <header className="bg-white border-b border-zinc-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-4">
          <Link
            href={`/relatorio/${id}`}
            className="text-zinc-400 hover:text-zinc-700 transition-colors text-sm"
          >
            &larr; Voltar ao relatório
          </Link>
          <div className="h-5 w-px bg-zinc-200" />
          <div>
            <p className="text-sm font-semibold text-zinc-900">{companyName}</p>
            <p className="text-xs text-zinc-400">{diag.name} · Agente IA</p>
          </div>
        </div>
        <span className="text-xs text-zinc-400">
          {(chatHistory?.length ?? 0)} mensagens
        </span>
      </header>

      {/* ── Chat ────────────────────────────────────────── */}
      <div className="flex-1 overflow-hidden">
        <AgenteChat
          diagnosticId={id}
          initialMessages={initialMessages}
          smartChips={smartChips}
          chatCount={chatHistory.length}
        />
      </div>
    </div>
  )
}
