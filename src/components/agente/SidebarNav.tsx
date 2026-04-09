'use client'

/**
 * QUANTUM5G — SidebarNav
 * Links de navegação do sidebar com active state por pathname.
 */

import Link      from 'next/link'
import { usePathname } from 'next/navigation'

interface NavItem {
  href:  string
  label: string
  icon:  string
  match: string   // prefixo para detectar active
}

const NAV_CONSULTANT: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',     icon: '◈', match: '/dashboard'  },
  { href: '/admin',      label: 'Admin',          icon: '⚙', match: '/admin'      },
  { href: '/pricing',    label: 'Planos',         icon: '◇', match: '/pricing'    },
]

const NAV_LEADER: NavItem[] = [
  { href: '/dashboard',  label: 'Dashboard',     icon: '◈', match: '/dashboard'  },
  { href: '/pricing',    label: 'Planos',         icon: '◇', match: '/pricing'    },
]

interface Props {
  role: string
}

export function SidebarNav({ role }: Props) {
  const pathname = usePathname() ?? ''
  const isAdmin  = role === 'admin' || role === 'consultant'
  const items    = isAdmin ? NAV_CONSULTANT : NAV_LEADER

  return (
    <nav className="flex-1 px-3 py-4 space-y-1">
      {items.map(item => {
        const isActive = pathname.startsWith(item.match)
        return (
          <Link
            key={item.href}
            href={item.href}
            suppressHydrationWarning
            className={`
              flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium
              transition-colors
              ${isActive
                ? 'bg-purple-50 text-purple-800'
                : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900'}
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
  )
}
