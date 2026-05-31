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
  /** Barra superior compacta (mobile) */
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
          className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-xs font-semibold text-white"
          aria-hidden
        >
          {ini}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
          <p className="truncate text-[10px] text-zinc-500">{label}</p>
        </div>
        <div className="shrink-0">{logoutForm}</div>
      </div>
    )
  }

  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50/80 p-3">
      <div className="flex items-start gap-3">
        <span
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-zinc-900 text-sm font-semibold text-white"
          aria-hidden
        >
          {ini}
        </span>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-zinc-900">{displayName}</p>
          {email && (
            <p className="mt-0.5 truncate text-xs text-zinc-600" title={email}>
              {email}
            </p>
          )}
          <span className="mt-1.5 inline-flex rounded-md bg-white px-2 py-0.5 text-[10px] font-medium text-zinc-600 ring-1 ring-zinc-200">
            {label}
          </span>
        </div>
      </div>
      <div className="mt-3 border-t border-zinc-200/80 pt-3">{logoutForm}</div>
    </div>
  )
}
