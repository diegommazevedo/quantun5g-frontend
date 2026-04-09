/**
 * QUANTUM5G — Layout 3 colunas
 * Sidebar esquerda (nav) + conteúdo central + painel do agente IA.
 * Rotas protegidas: /dashboard, /diagnostico, /relatorio, /admin
 */

import Link             from 'next/link'
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout }       from '@/app/(auth)/login/actions'
import { SidebarNav }          from '@/components/agente/SidebarNav'
import { AgentePanelDynamic } from '@/components/agente/AgentePanelDynamic'
import type { UserRole }       from '@/types/database'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, email')
    .eq('id', user.id)
    .returns<{ name: string | null; role: UserRole; email: string | null }[]>()
    .single()

  const displayName = profile?.name ?? user.email ?? 'Usuário'
  const role        = profile?.role ?? 'leader'

  return (
    <div className="h-screen flex overflow-hidden bg-zinc-50">

      {/* ── SIDEBAR ESQUERDA ──────────────────────────────── */}
      <aside className="w-[220px] flex flex-col bg-white border-r border-zinc-200 shrink-0">

        {/* Logo */}
        <div className="px-5 py-5 border-b border-zinc-100">
          <Link href="/dashboard" className="block">
            <p className="text-zinc-900 font-semibold text-sm tracking-tight leading-none">
              Quantum5G
            </p>
            <p className="text-zinc-400 text-[11px] mt-1 leading-none">
              Pentagrama de Ginger
            </p>
          </Link>
        </div>

        {/* Navegação */}
        <SidebarNav role={role} />

        {/* Rodapé: usuário + logout */}
        <div className="border-t border-zinc-100 px-4 py-4 shrink-0">
          <div className="mb-3">
            <p className="text-sm font-medium text-zinc-800 leading-tight truncate">
              {displayName}
            </p>
            <p className="text-xs text-zinc-400 capitalize mt-0.5">
              {role}
            </p>
          </div>
          <form action={logout}>
            <button
              type="submit"
              className="
                w-full text-left text-xs text-zinc-500
                hover:text-zinc-900 transition-colors
                px-2 py-1.5 rounded-md hover:bg-zinc-100
              "
            >
              Sair
            </button>
          </form>
        </div>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </div>
      </main>

      {/* ── PAINEL DO AGENTE ──────────────────────────────── */}
      <AgentePanelDynamic />

    </div>
  )
}
