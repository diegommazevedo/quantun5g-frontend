import { sidebarRoleLabel } from '@/lib/auth/roles'

function initials(name: string, email: string | null): string {
  const fromName = name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
  if (fromName.length >= 2) return fromName.slice(0, 2)
  if (fromName.length === 1) return fromName
  if (email) return email[0].toUpperCase()
  return '?'
}

interface Props {
  displayName: string
  email: string | null
  role: string
  logoutForm: React.ReactNode
  compact?: boolean
}

export function UserAccountBlock({
  displayName,
  email,
  role,
  logoutForm,
  compact = false,
}: Props) {
  const label = sidebarRoleLabel(role)
  const ini = initials(displayName, email)

  if (compact) {
    return (
      <div className="flex min-w-0 flex-1 items-center gap-2">
        <span
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-slate-950 text-xs font-semibold text-white ring-1 ring-white/20"
          aria-hidden
        >
          {ini}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--q-text)]">{displayName}</p>
          <p className="truncate text-[10px] text-[var(--q-text-muted)]">{label}</p>
        </div>
        <div className="shrink-0">{logoutForm}</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-[var(--q-border)] bg-[var(--q-bg-muted)]/80 p-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-950 text-sm font-semibold text-white ring-1 ring-white/20"
          aria-hidden
        >
          {ini}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-[var(--q-text)]">{displayName}</p>
          {email && (
            <p className="mt-0.5 truncate text-xs text-[var(--q-text-muted)]" title={email}>
              {email}
            </p>
          )}
          <span className="mt-1.5 inline-flex rounded-md bg-[var(--q-surface-elevated)] px-2 py-0.5 text-[10px] font-medium text-[var(--q-text-muted)] ring-1 ring-[var(--q-border)]">
            {label}
          </span>
        </div>
      </div>
      <div className="mt-3 space-y-2 border-t border-[var(--q-border)] pt-3">{logoutForm}</div>
    </div>
  )
}
