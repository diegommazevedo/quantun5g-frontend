import Link from 'next/link'
import type { ReactNode } from 'react'

export type DashboardModule = 'pentagrama' | 'nr01'

const MODULE_META: Record<
  DashboardModule,
  { badge: string; title: string; subtitle: string; accent: string; ctaClass: string }
> = {
  pentagrama: {
    badge: 'Pentagrama de Ginger',
    title: 'Painel Pentagrama',
    subtitle: 'Diagnósticos IL/IC, relatórios e gaps de liderança × colaboradores.',
    accent: 'border-violet-200 bg-gradient-to-br from-violet-50/80 to-white',
    ctaClass: 'bg-zinc-900 hover:bg-zinc-800 text-white',
  },
  nr01: {
    badge: 'NR-01 · GRO',
    title: 'Painel NR-01',
    subtitle: 'Avaliações de riscos psicossociais, coleta anônima e laudo regulatório.',
    accent: 'border-blue-200 bg-gradient-to-br from-blue-50/80 to-white',
    ctaClass: 'bg-blue-800 hover:bg-blue-900 text-white',
  },
}

export interface DashboardStat {
  label: string
  value: number
  hint?: string
  tone?: 'default' | 'active' | 'success'
}

interface Props {
  module: DashboardModule
  firstName?: string
  stats: DashboardStat[]
  primaryAction: { href: string; label: string }
  /** Quando false, CTA vira link para contratação/faturas */
  primaryActionEnabled?: boolean
  primaryActionLockedHref?: string
  sectionTitle: string
  alert?: ReactNode
  children: ReactNode
}

function statToneClasses(tone: DashboardStat['tone'], module: DashboardModule): string {
  if (tone === 'active') {
    return module === 'nr01'
      ? 'border-blue-100 bg-blue-50/60'
      : 'border-amber-100 bg-amber-50/60'
  }
  if (tone === 'success') {
    return module === 'nr01'
      ? 'border-green-100 bg-green-50/60'
      : 'border-violet-100 bg-violet-50/60'
  }
  return 'border-zinc-200 bg-white'
}

function statValueClasses(tone: DashboardStat['tone'], module: DashboardModule): string {
  if (tone === 'active') return module === 'nr01' ? 'text-blue-900' : 'text-amber-900'
  if (tone === 'success') return module === 'nr01' ? 'text-green-900' : 'text-violet-900'
  return 'text-zinc-900'
}

export function ModuleDashboardShell({
  module,
  firstName,
  stats,
  primaryAction,
  primaryActionEnabled = true,
  primaryActionLockedHref = '/contratacao',
  sectionTitle,
  alert,
  children,
}: Props) {
  const meta = MODULE_META[module]

  return (
    <div className="space-y-6">
      {alert}

      {/* Cabeçalho do módulo */}
      <section
        className={`rounded-2xl border px-5 py-5 sm:px-6 sm:py-6 ${meta.accent}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-2">
            <span
              className={`inline-flex rounded-full border px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                module === 'nr01'
                  ? 'border-blue-200 bg-white/80 text-blue-800'
                  : 'border-violet-200 bg-white/80 text-violet-800'
              }`}
            >
              {meta.badge}
            </span>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-zinc-900 sm:text-[1.65rem]">
                {meta.title}
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-relaxed text-zinc-600">
                {firstName ? (
                  <>
                    Olá, <span className="font-medium text-zinc-800">{firstName}</span>
                    {' — '}
                  </>
                ) : null}
                {meta.subtitle}
              </p>
            </div>
          </div>
          {primaryActionEnabled ? (
            <Link
              href={primaryAction.href}
              className={`inline-flex shrink-0 items-center justify-center rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${meta.ctaClass}`}
            >
              {primaryAction.label}
            </Link>
          ) : (
            <Link
              href={primaryActionLockedHref}
              className="inline-flex shrink-0 items-center justify-center rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900 hover:bg-amber-100"
              title="Licença NR-01 pendente — emitir fatura ou aguardar confirmação de pagamento"
            >
              Licença pendente
            </Link>
          )}
        </div>
      </section>

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-xl border px-5 py-4 ${statToneClasses(stat.tone, module)}`}
          >
            <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
              {stat.label}
            </p>
            <p className={`mt-1 text-3xl font-bold tabular-nums ${statValueClasses(stat.tone, module)}`}>
              {stat.value}
            </p>
            {stat.hint && <p className="mt-1 text-xs text-zinc-500">{stat.hint}</p>}
          </div>
        ))}
      </div>

      {/* Lista principal */}
      <section className="space-y-4">
        <h2 className="text-base font-semibold text-zinc-900">{sectionTitle}</h2>
        {children}
      </section>
    </div>
  )
}

export function DashboardEmptyState({
  message,
  hint,
  action,
}: {
  message: string
  hint?: string
  action: { href: string; label: string }
}) {
  return (
    <div className="rounded-xl border border-dashed border-zinc-300 bg-zinc-50/80 px-6 py-14 text-center">
      <p className="text-sm font-medium text-zinc-700">{message}</p>
      {hint && <p className="mt-2 text-sm text-zinc-500">{hint}</p>}
      <Link
        href={action.href}
        className="mt-5 inline-flex rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-zinc-800"
      >
        {action.label}
      </Link>
    </div>
  )
}
