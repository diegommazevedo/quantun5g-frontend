import { redirect } from 'next/navigation'
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
  /** @deprecated Módulos liberados para todos — mantido só por compatibilidade de props. */
  requireModuleNr01?: boolean
}

export async function StaffShell({
  children,
  contentMaxWidth,
  showAgent,
  requireAdmin,
}: Props) {
  const { user, role, profile: p } = await getPageActor()

  if (requireAdmin && role !== 'admin') redirect('/dashboard')

  const displayName = p?.name ?? user.email ?? 'Usuário'
  const userEmail = user.email ?? null

  return (
    <div className="flex h-[100dvh] overflow-hidden bg-[var(--q-bg)] print:h-auto print:overflow-visible">
      <AppShell
        displayName={displayName}
        userEmail={userEmail}
        role={role}
        modulePentagrama={true}
        moduleNr01={true}
        contentMaxWidth={contentMaxWidth}
        logoutForm={<LogoutButton variant="sidebar" />}
        logoutFormHeader={<LogoutButton variant="header" />}
      >
        {children}
      </AppShell>

      {showAgent && process.env.NEXT_PUBLIC_AGENT_ENABLED === 'true' && (
        <Suspense fallback={<div className="no-print w-12 shrink-0 border-l border-zinc-200 bg-white" />}>
          <div className="no-print contents">
            <AgentePanelDynamic />
          </div>
        </Suspense>
      )}
    </div>
  )
}
