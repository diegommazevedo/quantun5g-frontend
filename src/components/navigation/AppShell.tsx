'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { AppSidebar } from '@/components/navigation/AppSidebar'
import { ContextSubnav } from '@/components/navigation/ContextSubnav'
import { sidebarRoleLabel } from '@/lib/auth/roles'

interface Props {
  children: React.ReactNode
  displayName: string
  role: string
  modulePentagrama: boolean
  moduleNr01: boolean
  contentMaxWidth?: string
  logoutForm: React.ReactNode
}

function MenuButton({ open, onClick }: { open: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 transition-colors hover:bg-zinc-100 hover:text-zinc-900 md:hidden"
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
  role,
  modulePentagrama,
  moduleNr01,
  contentMaxWidth = 'max-w-5xl',
  logoutForm,
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
    <div className="shrink-0 border-t border-zinc-100 px-4 py-4">
      <div className="mb-3 min-w-0">
        <p className="truncate text-sm font-medium leading-tight text-zinc-800">{displayName}</p>
        <p className="mt-0.5 text-xs text-zinc-400">{sidebarRoleLabel(role)}</p>
      </div>
      {logoutForm}
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
    <div className="flex h-full min-w-0 flex-1 overflow-hidden bg-zinc-50">
      {/* Mobile overlay */}
      {mobileOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-zinc-900/40 backdrop-blur-[1px] md:hidden"
          aria-label="Fechar menu"
          onClick={closeMobile}
        />
      )}

      {/* Sidebar — drawer mobile / fixa desktop */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[min(280px,88vw)] flex-col border-r border-zinc-200 bg-white shadow-xl transition-transform duration-200 ease-out md:static md:z-auto md:w-64 md:shrink-0 md:translate-x-0 md:shadow-none ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <div className="border-b border-zinc-100 bg-gradient-to-br from-zinc-900 via-zinc-900 to-zinc-800 px-5 py-5">
          <Link href="/dashboard" className="block" onClick={closeMobile}>
            <p className="text-sm font-semibold tracking-tight text-white">Quantum5G</p>
            <p className="mt-1 text-[11px] text-zinc-400">Plataforma consultor</p>
          </Link>
        </div>
        <div className="flex min-h-0 flex-1 flex-col">{sidebarInner}</div>
      </aside>

      {/* Main column */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="flex h-14 shrink-0 items-center gap-3 border-b border-zinc-200 bg-white px-4 md:hidden">
          <MenuButton open={mobileOpen} onClick={() => setMobileOpen((v) => !v)} />
          <Link href="/dashboard" className="min-w-0 flex-1 truncate text-sm font-semibold text-zinc-900">
            Quantum5G
          </Link>
        </header>

        <ContextSubnav />

        <main className="flex-1 overflow-y-auto">
          <div className={`mx-auto w-full ${contentMaxWidth} px-4 py-6 sm:px-6 sm:py-8`}>{children}</div>
        </main>
      </div>
    </div>
  )
}
