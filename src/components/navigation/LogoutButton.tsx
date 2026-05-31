'use client'

import { logout } from '@/app/(auth)/login/actions'

interface Props {
  variant?: 'sidebar' | 'header'
}

export function LogoutButton({ variant = 'sidebar' }: Props) {
  const isHeader = variant === 'header'
  return (
    <form action={logout} className={isHeader ? 'inline' : 'w-full'}>
      <button
        type="submit"
        className={
          isHeader
            ? 'rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-xs font-semibold text-zinc-700 transition hover:bg-zinc-100'
            : 'w-full rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-semibold text-zinc-800 transition hover:bg-zinc-100'
        }
      >
        Sair
      </button>
    </form>
  )
}
