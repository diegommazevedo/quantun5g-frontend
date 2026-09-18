/**
 * Radar Empresarial — feed da semana.
 */

import Link from 'next/link'
import { getPageActor } from '@/lib/org/page-actor'
import { bulletsFromSignals } from '@/lib/radar/collect'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isPlatformStaff } from '@/lib/auth/roles'
import { refreshRadarSignals } from './actions'

export const dynamic = 'force-dynamic'

type Row = {
  id: string
  company_id: string | null
  source: string
  kind: string
  severity: number
  title: string
  message: string
  detected_at: string
  companies: { name: string } | null
}

export default async function RadarPage({
  searchParams,
}: {
  searchParams: Promise<{ refreshed?: string }>
}) {
  const { refreshed } = await searchParams
  const { user, role, profile, db } = await getPageActor()
  const admin = createServiceRoleAdmin()

  const since = new Date(Date.now() - 14 * 86400000).toISOString()
  let query = admin
    .from('radar_signals')
    .select(
      'id, company_id, source, kind, severity, title, message, detected_at, companies:companies(name)',
    )
    .gte('detected_at', since)
    .order('severity', { ascending: false })
    .order('detected_at', { ascending: false })
    .limit(50)

  if (role !== 'admin' && isPlatformStaff(role)) {
    const { data: cos } = await db.from('companies').select('id').eq('consultant_id', user.id)
    const ids = (cos ?? []).map((c: { id: string }) => c.id)
    if (ids.length) query = query.in('company_id', ids)
    else query = query.eq('company_id', '00000000-0000-0000-0000-000000000000')
  }

  const { data: signals, error } = await query
  const rows = (signals ?? []).map((raw) => {
    const r = raw as Omit<Row, 'companies'> & {
      companies: { name: string } | { name: string }[] | null
    }
    const company = Array.isArray(r.companies) ? r.companies[0] ?? null : r.companies
    return { ...r, companies: company } satisfies Row
  })
  const bullets = bulletsFromSignals(
    rows.map((r) => ({
      title: r.title,
      message: r.message,
      severity: r.severity,
      company_name: r.companies?.name,
    })),
  )

  const firstName = profile?.name?.split(' ')[0] ?? 'você'

  return (
    <div className="space-y-8 py-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
          Radar Empresarial
        </p>
        <h1 className="text-2xl font-bold text-[var(--q-text)]">
          O que está acontecendo, {firstName}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--q-text-muted)]">
          Sinais da organização antes que o problema chegue até você — ações atrasadas, risco ISO,
          pulsos e diagnósticos parados.
        </p>
      </header>

      <div className="flex flex-wrap items-center gap-3">
        <form action={refreshRadarSignals}>
          <button
            type="submit"
            className="rounded-lg bg-emerald-700 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-600"
          >
            Atualizar sinais agora
          </button>
        </form>
        {refreshed === '1' && (
          <span className="text-sm text-emerald-800">Sinais atualizados.</span>
        )}
        <Link href="/nr01/dashboard" className="text-sm text-[var(--q-text-muted)] underline">
          Ir ao NR-01
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Ainda sem tabela de sinais no banco ou erro de leitura: {error.message}. Aplique a
          migration <code>20260908210000_radar_copiloto.sql</code>.
        </div>
      )}

      {bullets.length > 0 && (
        <section className="rounded-xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-[var(--q-surface)] p-5">
          <h2 className="text-sm font-semibold text-emerald-900">Resumo da semana</h2>
          <ul className="mt-3 space-y-2 text-sm text-[var(--q-text)]">
            {bullets.map((b) => (
              <li key={b} className="flex gap-2">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-600" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-[var(--q-text)]">Feed de sinais</h2>
        {rows.length === 0 && !error ? (
          <div className="rounded-xl border border-dashed border-[var(--q-border)] px-5 py-10 text-center text-sm text-[var(--q-text-muted)]">
            Nenhum sinal nos últimos 14 dias. Clique em <strong>Atualizar sinais agora</strong> ou
            aguarde o cron diário.
          </div>
        ) : (
          <ul className="divide-y divide-[var(--q-border)] rounded-xl border border-[var(--q-border)] bg-[var(--q-surface)]">
            {rows.map((r) => (
              <li key={r.id} className="px-4 py-3">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <p className="font-medium text-[var(--q-text)]">{r.title}</p>
                  <span className="text-xs text-[var(--q-text-muted)]">
                    severidade {r.severity}/5 · {r.source} · {r.detected_at.slice(0, 10)}
                  </span>
                </div>
                <p className="mt-1 text-sm text-[var(--q-text-muted)]">{r.message}</p>
                {r.companies?.name && (
                  <p className="mt-1 text-xs font-medium text-emerald-800">{r.companies.name}</p>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
