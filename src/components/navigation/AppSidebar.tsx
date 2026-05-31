'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import {
  buildNavSections,
  isNavItemActive,
  moduleSubtitle,
  type NavSection,
} from '@/lib/navigation/app-nav'
import { isPlatformStaff } from '@/lib/auth/roles'
import { NavIcon } from '@/components/navigation/NavIcon'

interface Props {
  role: string
  modulePentagrama: boolean
  moduleNr01: boolean
  onNavigate?: () => void
}

function accentForSection(sectionId: string, active: boolean): string {
  if (!active) return 'text-zinc-500 group-hover:text-zinc-800'
  if (sectionId === 'nr01') return 'text-blue-700'
  if (sectionId === 'admin') return 'text-amber-800'
  if (sectionId === 'pentagrama') return 'text-violet-700'
  return 'text-zinc-900'
}

function activeClasses(sectionId: string, active: boolean): string {
  if (!active) return 'text-zinc-600 hover:bg-zinc-100/90 hover:text-zinc-900'
  if (sectionId === 'nr01') return 'bg-blue-50 text-blue-900 ring-1 ring-blue-100'
  if (sectionId === 'admin') return 'bg-amber-50 text-amber-950 ring-1 ring-amber-100'
  if (sectionId === 'pentagrama') return 'bg-violet-50 text-violet-900 ring-1 ring-violet-100'
  return 'bg-zinc-100 text-zinc-900 ring-1 ring-zinc-200/80'
}

function SectionBlock({
  section,
  pathname,
  onNavigate,
}: {
  section: NavSection
  pathname: string
  onNavigate?: () => void
}) {
  return (
    <div className="mb-1">
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-400">
        {section.label}
      </p>
      <ul className="space-y-0.5">
        {section.items.map((item) => {
          const active = isNavItemActive(pathname, item.match)
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={`group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${activeClasses(section.id, active)}`}
              >
                <span className={accentForSection(section.id, active)}>
                  <NavIcon name={item.icon} />
                </span>
                {item.label}
              </Link>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

export function AppSidebar({ role, modulePentagrama, moduleNr01, onNavigate }: Props) {
  const pathname = usePathname() ?? ''
  const staff = isPlatformStaff(role)
  const sections = buildNavSections({ role, modulePentagrama, moduleNr01 })

  return (
    <div className="flex h-full flex-col">
      {!staff && (
        <p className="mx-3 mb-3 rounded-lg border border-amber-200/80 bg-amber-50 px-3 py-2.5 text-[11px] leading-snug text-amber-950">
          Perfil de liderança (IL). Empresas e disparos são gerenciados pelo consultor.
        </p>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label="Menu principal">
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <p className="shrink-0 px-4 pb-2 text-[10px] leading-tight text-zinc-400">
        {moduleSubtitle(modulePentagrama, moduleNr01, role)}
      </p>
    </div>
  )
}
