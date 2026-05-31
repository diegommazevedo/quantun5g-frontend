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
            ? 'rounded-lg border border-[var(--q-border-strong)] bg-[var(--q-surface-elevated)] px-3 py-1.5 text-xs font-semibold text-[var(--q-text)] transition hover:bg-[var(--q-nav-active-bg)]'
            : 'w-full rounded-lg border border-[var(--q-border-strong)] bg-[var(--q-surface-elevated)] px-3 py-2 text-sm font-semibold text-[var(--q-text)] transition hover:bg-[var(--q-nav-active-bg)]'
        }
      >
        Sair
      </button>
    </form>
  )
}
