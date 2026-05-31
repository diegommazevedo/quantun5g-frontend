/**
 * QUANTUM5G — Layout 3 colunas
 * Sidebar esquerda (nav) + conteúdo central + painel do agente IA.
 * Rotas protegidas: /dashboard, /diagnostico, /relatorio, /admin
 */

import { Suspense }     from 'react'
import Link             from 'next/link'
import { redirect }     from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout }       from '@/app/(auth)/login/actions'
import { SidebarNav } from '@/components/agente/SidebarNav'
import { sidebarRoleLabel } from '@/lib/auth/roles'
import { AgentePanelDynamic } from '@/components/agente/AgentePanelDynamic'
import type { UserRole }       from '@/types/database'

/* ── Sidebar async (busca perfil sem bloquear o conteúdo) ── */
async function SidebarUser() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, module_pentagrama, module_nr01')
    .eq('id', user.id)
    .returns<{ name: string | null; role: UserRole; module_pentagrama: boolean; module_nr01: boolean }[]>()
    .single()

  const displayName = profile?.name ?? user.email ?? 'Usuário'
  const role        = profile?.role ?? 'consultant'

  return (
    <>
      <SidebarNav
        role={role}
        modulePentagrama={profile?.module_pentagrama ?? true}
        moduleNr01={profile?.module_nr01 ?? true}
      />
      <div className="border-t border-zinc-100 px-4 py-4 shrink-0">
        <div className="mb-3">
          <p className="text-sm font-medium text-zinc-800 leading-tight truncate">
            {displayName}
          </p>
          <p className="text-xs text-zinc-400 mt-0.5">
            {sidebarRoleLabel(role)}
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
    </>
  )
}

/* ── Fallback da sidebar ── */
function SidebarSkeleton() {
  return (
    <div className="flex-1 px-4 py-4 animate-pulse">
      <div className="h-4 w-24 bg-zinc-200 rounded mb-3" />
      <div className="h-4 w-20 bg-zinc-100 rounded mb-2" />
      <div className="h-4 w-28 bg-zinc-100 rounded" />
    </div>
  )
}

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Auth check rápido — só redireciona se não autenticado
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

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
              Plataforma consultor
            </p>
          </Link>
        </div>

        <Suspense fallback={<SidebarSkeleton />}>
          <SidebarUser />
        </Suspense>
      </aside>

      {/* ── CONTEÚDO PRINCIPAL ────────────────────────────── */}
      <main className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </div>
      </main>

      {/* ── PAINEL DO AGENTE (desativado por padrão — reativar com NEXT_PUBLIC_AGENT_ENABLED=true) ── */}
      {process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true' && (
        <Suspense fallback={<div className="w-12 border-l border-zinc-200 bg-white shrink-0" />}>
          <AgentePanelDynamic />
        </Suspense>
      )}

    </div>
  )
}
