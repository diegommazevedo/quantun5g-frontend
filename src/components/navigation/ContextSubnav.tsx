'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isContextTabActive, resolveContextSubnav } from '@/lib/navigation/app-nav'

export function ContextSubnav() {
  const pathname = usePathname() ?? ''
  const ctx = resolveContextSubnav(pathname)
  if (!ctx) return null

  return (
    <div className="border-b border-zinc-200/80 bg-white/95 backdrop-blur-sm">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="flex items-center gap-3 py-2.5">
          <Link
            href={ctx.backHref}
            className="shrink-0 text-xs font-medium text-zinc-500 transition-colors hover:text-zinc-900"
          >
            ← {ctx.backLabel}
          </Link>
          <span className="hidden h-4 w-px bg-zinc-200 sm:block" aria-hidden />
          <nav
            className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            aria-label="Seções do contexto atual"
          >
            {ctx.tabs.map((tab) => {
              const active = isContextTabActive(pathname, tab)
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  className={`shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors sm:text-sm ${
                    active
                      ? 'bg-zinc-900 text-white shadow-sm'
                      : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'
                  }`}
                >
                  {tab.label}
                </Link>
              )
            })}
          </nav>
        </div>
      </div>
    </div>
  )
}
