import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { profileHasModule } from '@/lib/auth/modules'
import { AppShell } from '@/components/navigation/AppShell'
import { LogoutButton } from '@/components/navigation/LogoutButton'
import { AgentePanelDynamic } from '@/components/agente/AgentePanelDynamic'
import type { Profile, UserRole } from '@/types/database'
import { Suspense } from 'react'

interface Props {
  children: React.ReactNode
  contentMaxWidth?: string
  showAgent?: boolean
  requireAdmin?: boolean
  requireModuleNr01?: boolean
}

export async function StaffShell({
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
  const userEmail = user.email ?? null
  const role = (p?.role ?? 'consultant') as UserRole

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--q-bg)]">
      <AppShell
        displayName={displayName}
        userEmail={userEmail}
        role={role}
        modulePentagrama={p?.module_pentagrama ?? true}
        moduleNr01={p?.module_nr01 ?? true}
        contentMaxWidth={contentMaxWidth}
        logoutForm={<LogoutButton variant="sidebar" />}
        logoutFormHeader={<LogoutButton variant="header" />}
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
