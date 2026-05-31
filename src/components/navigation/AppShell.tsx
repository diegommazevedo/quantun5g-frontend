'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { ContextSubnav } from '@/components/navigation/ContextSubnav'
import { UserAccountBlock } from '@/components/navigation/UserAccountBlock'
import { sidebarRoleLabel } from '@/lib/auth/roles'

interface Props {
  children: React.ReactNode
  displayName: string
  userEmail: string | null
  role: string
  modulePentagrama: boolean
  moduleNr01: boolean
  contentMaxWidth?: string
  logoutForm: React.ReactNode
  logoutFormHeader: React.ReactNode
}

function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-[var(--q-text-muted)] transition-colors hover:bg-[var(--q-surface-elevated)] hover:text-[var(--q-text)] md:hidden"
      aria-expanded={open}
      aria-label={open ? 'Fechar menu' : 'Abrir menu'}
    >
      <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        {open ? (
          <path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" />
        ) : (
          <>
            <path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" />
          </>
        )}
      </svg>
    </button>
  )
}

export function AppShell({
  children,
  displayName,
  userEmail,
  role,
  modulePentagrama,
  moduleNr01,
  contentMaxWidth = 'max-w-5xl',
  logoutForm,
  logoutFormHeader,
}: Props) {
  const pathname = usePathname()
  const [mobileOpen, setMobileOpen] = useState(false)

  const closeMobile = useCallback(() => setMobileOpen(false), [])

  useEffect(() => {
    closeMobile()
  }, [pathname, closeMobile])

  useEffect(() => {
    if (!mobileOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeMobile()
    }
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [mobileOpen, closeMobile])

  const sidebarFooter = (
    <div className="shrink-0 border-t border-[var(--q-border)] px-3 py-3">
      <UserAccountBlock
        displayName={displayName}
        email={userEmail}
        role={role}
        logoutForm={logoutForm}
      />
    </div>
  )

  const sidebarInner = (
    <>
      <AppSidebar
        role={role}
        modulePentagrama={modulePentagrama}
        moduleNr01={moduleNr01}
        onNavigate={closeMobile}
      />
      {sidebarFooter}
    </>
  )

  return (
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-[var(--q-bg)]">
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px] md:hidden"
          aria-label="Fechar menu"
          onClick={closeMobile}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-[var(--q-border)] bg-[var(--q-surface)] shadow-xl shadow-black/40 transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:shrink-0 md:translate-x-0 md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-[var(--q-border)] bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 px-5 py-5">
          <Link href="/dashboard" className="block" onClick={closeMobile}>
            <p className="text-sm font-semibold tracking-tight text-white">Quantum5G</p>
            <p className="mt-1 text-[11px] text-slate-400">Pentagrama + NR-01</p>
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{sidebarInner}</div>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex shrink-0 flex-col border-b border-[var(--q-border)] bg-[var(--q-surface)] md:hidden">
          <div className="flex h-12 items-center gap-2 px-3">
            <MenuButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
            <UserAccountBlock
              displayName={displayName}
              email={userEmail}
              role={role}
              logoutForm={logoutFormHeader}
              compact
            />
          </div>
        </header>

        <header className="hidden shrink-0 items-center justify-between gap-4 border-b border-[var(--q-border)] bg-[var(--q-surface)] px-4 py-2.5 md:flex">
          <p className="text-xs text-[var(--q-text-muted)]">
            Logado como{' '}
            <span className="font-medium text-[var(--q-text)]">{sidebarRoleLabel(role)}</span>
          </p>
          <div className="flex min-w-0 max-w-md flex-1 items-center justify-end gap-3">
            <div className="min-w-0 text-right">
              <p className="truncate text-sm font-semibold text-[var(--q-text)]">{displayName}</p>
              {userEmail && (
                <p className="truncate text-xs text-[var(--q-text-muted)]" title={userEmail}>
                  {userEmail}
                </p>
              )}
            </div>
            {logoutFormHeader}
          </div>
        </header>

        <ContextSubnav />

        <main className="flex-1 overflow-y-auto bg-[var(--q-bg-muted)]">
          <div className={`mx-auto w-full ${contentMaxWidth} px-4 py-6 sm:px-6 sm:py-8`}>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
