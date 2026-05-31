import { Suspense } from 'react'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { logout } from '@/app/(auth)/login/actions'
import { profileHasModule } from '@/lib/auth/modules'
import { AppShell } from '@/components/navigation/AppShell'
import { AgentePanelDynamic } from '@/components/agente/AgentePanelDynamic'
import type { Profile, UserRole } from '@/types/database'

interface Props {
  children: React.ReactNode
  contentMaxWidth?: string
  showAgent?: boolean
  requireAdmin?: boolean
  requireModuleNr01?: boolean
}

function LogoutButton() {
  return (
    <form action={logout}>
      <button
        type="submit"
        className="w-full rounded-md px-2 py-1.5 text-left text-xs text-zinc-500 transition-colors hover:bg-zinc-100 hover:text-zinc-900"
      >
        Sair
      </button>
    </form>
  )
}

async function ShellWithProfile({
  children,
  contentMaxWidth,
  showAgent,
  requireAdmin,
  requireModuleNr01,
}: Props) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, module_pentagrama, module_nr01, is_active')
    .eq('id', user.id)
    .single()

  const p = profile as Pick<
    Profile,
    'name' | 'role' | 'module_pentagrama' | 'module_nr01' | 'is_active'
  > | null

  if (p && p.is_active === false) redirect('/login')
  if (requireAdmin && p?.role !== 'admin') redirect('/dashboard')
  if (requireModuleNr01 && !profileHasModule(p, 'nr01')) {
    redirect('/dashboard?error=sem_acesso_nr01')
  }

  const displayName = p?.name ?? user.email ?? 'Usuário'
  const role = (p?.role ?? 'consultant') as UserRole

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-zinc-50">
      <AppShell
        displayName={displayName}
        role={role}
        modulePentagrama={p?.module_pentagrama ?? true}
        moduleNr01={p?.module_nr01 ?? true}
        contentMaxWidth={contentMaxWidth}
        logoutForm={<LogoutButton />}
      >
        {children}
      </AppShell>

      {showAgent && process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true' && (
        <Suspense fallback={<div className="w-12 shrink-0 border-l border-zinc-200 bg-white" />}>
          <AgentePanelDynamic />
        </Suspense>
      )}
    </div>
  )
}

export function StaffShell(props: Props) {
  return (
    <Suspense
      fallback={
        <div className="flex h-[100dvh] items-center justify-center bg-zinc-50 text-sm text-zinc-500">
          Carregando…
        </div>
      }
    >
      <ShellWithProfile {...props} />
    </Suspense>
  )
}
