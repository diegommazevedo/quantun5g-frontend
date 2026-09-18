/**
 * Copiloto Comercial — fila do dia.
 */

import Link from 'next/link'
import { getPageActor } from '@/lib/org/page-actor'
import { scoreCrmAccount } from '@/lib/copiloto/score'
import { rescoreMyAccounts } from './actions'

export const dynamic = 'force-dynamic'

export default async function CopilotoPage({
  searchParams,
}: {
  searchParams: Promise<{ scored?: string }>
}) {
  const { scored } = await searchParams
  const { user, profile, db } = await getPageActor()

  const { data: accounts, error } = await db
    .from('crm_accounts')
    .select(
      `
      id, name, avg_ticket, purchase_cycle_days, last_purchase_at, last_contact_at, notes,
      crm_deals ( id, title, stage, next_step, next_step_at ),
      crm_scores ( score, reasons, suggested_action, scored_at )
    `,
    )
    .eq('owner_user_id', user.id)
    .order('name')

  type Deal = {
    id: string
    title: string
    stage: string
    next_step: string | null
    next_step_at: string | null
  }
  type Acc = {
    id: string
    name: string
    avg_ticket: number | null
    purchase_cycle_days: number | null
    last_purchase_at: string | null
    last_contact_at: string | null
    crm_deals: Deal[] | null
    crm_scores:
      | { score: number; reasons: string[]; suggested_action: string | null; scored_at: string }
      | { score: number; reasons: string[]; suggested_action: string | null; scored_at: string }[]
      | null
  }

  const list = (accounts ?? []) as Acc[]

  const ranked = list
    .map((a) => {
      const deals = a.crm_deals ?? []
      const open = deals.find((d) => d.stage === 'open' || d.stage === 'proposal')
      const scoreRow = Array.isArray(a.crm_scores) ? a.crm_scores[0] : a.crm_scores
      const live = scoreCrmAccount({
        id: a.id,
        name: a.name,
        avgTicket: a.avg_ticket,
        purchaseCycleDays: a.purchase_cycle_days,
        lastPurchaseAt: a.last_purchase_at,
        lastContactAt: a.last_contact_at,
        openDealNextStepAt: open?.next_step_at ?? null,
        openDealTitle: open?.title ?? null,
      })
      return {
        ...a,
        live,
        stored: scoreRow,
      }
    })
    .sort((x, y) => (y.stored?.score ?? y.live.score) - (x.stored?.score ?? x.live.score))
    .slice(0, 12)

  const firstName = profile?.name?.split(' ')[0] ?? 'você'

  return (
    <div className="space-y-8 py-6">
      <header className="space-y-2">
        <p className="text-xs font-semibold uppercase tracking-wide text-amber-800">
          Copiloto Comercial
        </p>
        <h1 className="text-2xl font-bold text-[var(--q-text)]">
          Sua fila de hoje, {firstName}
        </h1>
        <p className="max-w-2xl text-sm text-[var(--q-text-muted)]">
          Quem procurar, por quê e o que fazer — sem abrir uma lista de 800 clientes.
        </p>
      </header>

      <div className="flex flex-wrap gap-3">
        <Link
          href="/copiloto/importar"
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          Importar carteira (CSV)
        </Link>
        <form action={rescoreMyAccounts}>
          <button
            type="submit"
            className="rounded-lg border border-[var(--q-border)] bg-[var(--q-surface)] px-4 py-2 text-sm font-medium hover:bg-[var(--q-bg-muted)]"
          >
            Recalcular prioridades
          </button>
        </form>
        {scored === '1' && (
          <span className="self-center text-sm text-amber-900">Scores atualizados.</span>
        )}
      </div>

      {error && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {error.message.includes('schema cache') || error.message.includes('does not exist')
            ? 'Aplique a migration 20260908210000_radar_copiloto.sql no Supabase.'
            : error.message}
        </div>
      )}

      {ranked.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--q-border)] px-5 py-12 text-center">
          <p className="text-sm text-[var(--q-text-muted)]">
            Sua carteira está vazia. Importe um CSV com colunas{' '}
            <code>name,email,phone,last_purchase_at,purchase_cycle_days,avg_ticket</code>.
          </p>
          <Link
            href="/copiloto/importar"
            className="mt-4 inline-block text-sm font-semibold text-amber-800 underline"
          >
            Importar agora
          </Link>
        </div>
      ) : (
        <ol className="space-y-3">
          {ranked.map((a, idx) => {
            const score = a.stored?.score ?? a.live.score
            const reasons = (a.stored?.reasons as string[] | undefined) ?? a.live.reasons
            const action = a.stored?.suggested_action ?? a.live.suggestedAction
            return (
              <li
                key={a.id}
                className="rounded-xl border border-[var(--q-border)] bg-[var(--q-surface)] px-4 py-4"
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-semibold text-amber-800">#{idx + 1}</p>
                    <Link
                      href={`/copiloto/conta/${a.id}`}
                      className="text-lg font-semibold text-[var(--q-text)] hover:underline"
                    >
                      {a.name}
                    </Link>
                  </div>
                  <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-900">
                    score {Math.round(Number(score))}
                  </span>
                </div>
                <ul className="mt-2 space-y-1 text-sm text-[var(--q-text-muted)]">
                  {reasons.map((r) => (
                    <li key={r}>• {r}</li>
                  ))}
                </ul>
                <p className="mt-3 text-sm font-medium text-[var(--q-text)]">
                  Hoje: {action}
                </p>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
