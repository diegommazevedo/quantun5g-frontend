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
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import { NavIcon } from '@/components/navigation/NavIcon'
import { ThemeToggle } from '@/components/theme/ThemeToggle'

interface Props {
  role: string
  modulePentagrama: boolean
  moduleNr01: boolean
  onNavigate?: () => void
}

function accentForSection(sectionId: string, active: boolean): string {
  if (!active) return 'text-[var(--q-text-faint)] group-hover:text-[var(--q-text)]'
  if (sectionId === 'nr01') return 'text-blue-300'
  if (sectionId === 'admin') return 'text-amber-300'
  if (sectionId === 'pentagrama') return 'text-violet-300'
  return 'text-[var(--q-text)]'
}

function activeClasses(sectionId: string, active: boolean): string {
  if (!active) {
    return 'text-[var(--q-text-muted)] hover:bg-[var(--q-surface-elevated)] hover:text-[var(--q-text)]'
  }
  if (sectionId === 'nr01') return 'bg-blue-500/15 text-blue-100 ring-1 ring-blue-400/25'
  if (sectionId === 'admin') return 'bg-amber-500/15 text-amber-100 ring-1 ring-amber-400/25'
  if (sectionId === 'pentagrama') return 'bg-violet-500/15 text-violet-100 ring-1 ring-violet-400/25'
  return 'bg-[var(--q-nav-active-bg)] text-[var(--q-text)] ring-1 ring-[var(--q-border)]'
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
      <p className="mb-1.5 px-3 text-[10px] font-semibold uppercase tracking-wider text-[var(--q-text-faint)]">
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
  const isContratante = isContratanteRole(role)
  const isGerente = isGerenteRole(role)
  const sections = buildNavSections({ role, modulePentagrama, moduleNr01 })

  return (
    <div className="flex h-full flex-col">
      {isContratante && (
        <p className="mx-3 mb-3 rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2.5 text-[11px] leading-snug text-blue-100/90">
          Contratante do grupo. Gerencie equipe e filiais; novos CNPJs são cadastrados pelo consultor
          operador.
        </p>
      )}
      {isGerente && (
        <p className="mx-3 mb-3 rounded-lg border border-blue-400/25 bg-blue-500/10 px-3 py-2.5 text-[11px] leading-snug text-blue-100/90">
          Gerente de filial. Você vê apenas as empresas atribuídas pelo contratante.
        </p>
      )}
      {!staff && !isContratante && !isGerente && (
        <p className="mx-3 mb-3 rounded-lg border border-amber-400/25 bg-amber-500/10 px-3 py-2.5 text-[11px] leading-snug text-amber-100/90">
          Perfil de liderança (IL). Empresas e disparos são gerenciados pelo consultor.
        </p>
      )}

      <nav className="flex-1 space-y-4 overflow-y-auto px-2 py-3" aria-label="Menu principal">
        {sections.map((section) => (
          <SectionBlock key={section.id} section={section} pathname={pathname} onNavigate={onNavigate} />
        ))}
      </nav>

      <div className="shrink-0 space-y-2 px-3 pb-2">
        <ThemeToggle />
        <p className="text-[10px] leading-tight text-[var(--q-text-faint)]">
          {moduleSubtitle(modulePentagrama, moduleNr01, role)}
        </p>
      </div>
    </div>
  )
}
