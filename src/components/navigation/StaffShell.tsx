import { redirect } from 'next/navigation'
import { profileHasModule } from '@/lib/auth/modules'
import { getPageActor } from '@/lib/org/page-actor'
import { AppShell } from '@/components/navigation/AppShell'
import { LogoutButton } from '@/components/navigation/LogoutButton'
import { AgentePanelDynamic } from '@/components/agente/AgentePanelDynamic'
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
  const { user, role, profile: p } = await getPageActor()

  if (requireAdmin && role !== 'admin') redirect('/dashboard')
  if (requireModuleNr01 && !profileHasModule(p, 'nr01')) {
    redirect('/dashboard?error=sem_acesso_nr01')
  }

  const displayName = p?.name ?? user.email ?? 'Usuário'
  const userEmail = user.email ?? null

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
