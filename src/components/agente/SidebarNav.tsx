'use client'

/**
 * Navegação lateral — módulos Pentagrama, Empresas, NR-01 e Admin.
 */

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { isPlatformStaff } from '@/lib/auth/roles'

interface NavItem {
  href: string
  label: string
  icon: string
  match: string
}

const NAV_STAFF: NavItem[] = [
  { href: '/dashboard', label: 'Pentagrama', icon: '◈', match: '/dashboard' },
  { href: '/empresas', label: 'Empresas', icon: '▣', match: '/empresas' },
  { href: '/nr01/dashboard', label: 'NR-01', icon: '◉', match: '/nr01' },
  { href: '/admin/usuarios', label: 'Usuários', icon: '⚙', match: '/admin' },
  { href: '/pricing', label: 'Planos', icon: '◇', match: '/pricing' },
]

const NAV_LEADER: NavItem[] = [
  { href: '/dashboard', label: 'Início', icon: '◈', match: '/dashboard' },
  { href: '/pricing', label: 'Planos', icon: '◇', match: '/pricing' },
]

interface Props {
  role: string
  modulePentagrama?: boolean
  moduleNr01?: boolean
}

export function SidebarNav({ role, modulePentagrama = true, moduleNr01 = true }: Props) {
  const pathname = usePathname() ?? ''
  const isAdmin = role === 'admin'
  const staff = isPlatformStaff(role)

  let items = staff ? NAV_STAFF : NAV_LEADER

  if (staff && !isAdmin) {
    items = items.filter((item) => {
      if (item.match === '/admin') return false
      if (item.match === '/nr01') return moduleNr01
      if (item.match === '/dashboard' || item.match === '/empresas') return modulePentagrama
      return true
    })
  }

  const subtitle =
    isAdmin || (modulePentagrama && moduleNr01)
      ? 'Pentagrama + NR-01'
      : moduleNr01
        ? 'NR-01'
        : 'Pentagrama de Ginger'

  return (
    <>
      {!staff && (
        <p className="mx-3 mb-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] leading-snug text-amber-900">
          Perfil de liderança (IL). Cadastro de empresas e disparos ficam com o consultor.
        </p>
      )}
      <nav className="flex-1 px-3 py-2 space-y-1" aria-label="Módulos">
        {items.map((item) => {
          const isActive = pathname.startsWith(item.match)
          return (
            <Link
              key={item.href}
              href={item.href}
              suppressHydrationWarning
              className={`
                flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors
                ${isActive ? 'bg-purple-50 text-purple-800' : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}
              `}
            >
              <span className={`text-base leading-none ${isActive ? 'text-purple-600' : 'text-zinc-400'}`}>
                {item.icon}
              </span>
              {item.label}
            </Link>
          )
        })}
      </nav>
      <p className="px-5 pb-2 text-[10px] text-zinc-400 leading-tight">{subtitle}</p>
    </>
  )
}
