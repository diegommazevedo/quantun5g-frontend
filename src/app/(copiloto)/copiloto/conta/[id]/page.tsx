import Link from 'next/link'
import { notFound } from 'next/navigation'
import { getPageActor } from '@/lib/org/page-actor'
import { logCrmActivity } from '../../actions'

export default async function CopilotoContaPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>
  searchParams: Promise<{ saved?: string; error?: string }>
}) {
  const { id } = await params
  const { saved, error } = await searchParams
  const { user, db } = await getPageActor()

  const { data } = await db
    .from('crm_accounts')
    .select(
      `
      id, name, segment, avg_ticket, purchase_cycle_days, last_purchase_at, last_contact_at, notes,
      crm_contacts ( id, name, email, phone, is_primary ),
      crm_activities ( id, kind, summary, happened_at ),
      crm_deals ( id, title, stage, value, next_step, next_step_at ),
      crm_scores ( score, reasons, suggested_action )
    `,
    )
    .eq('id', id)
    .eq('owner_user_id', user.id)
    .maybeSingle()

  if (!data) notFound()

  const account = data as {
    id: string
    name: string
    segment: string | null
    avg_ticket: number | null
    purchase_cycle_days: number | null
    last_purchase_at: string | null
    last_contact_at: string | null
    notes: string | null
    crm_contacts: Array<{
      id: string
      name: string
      email: string | null
      phone: string | null
      is_primary: boolean
    }> | null
    crm_activities: Array<{
      id: string
      kind: string
      summary: string
      happened_at: string
    }> | null
    crm_deals: Array<{
      id: string
      title: string
      stage: string
      value: number | null
      next_step: string | null
      next_step_at: string | null
    }> | null
    crm_scores:
      | { score: number; reasons: string[]; suggested_action: string | null }
      | { score: number; reasons: string[]; suggested_action: string | null }[]
      | null
  }

  const score = Array.isArray(account.crm_scores) ? account.crm_scores[0] : account.crm_scores
  const activities = [...(account.crm_activities ?? [])].sort((a, b) =>
    b.happened_at.localeCompare(a.happened_at),
  )

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <Link href="/copiloto" className="text-sm text-[var(--q-text-muted)] underline">
          ← Fila do dia
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--q-text)]">{account.name}</h1>
        {score && (
          <p className="mt-1 text-sm text-amber-900">
            Score {Math.round(Number(score.score))} — {score.suggested_action}
          </p>
        )}
      </div>

      {saved && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-green-900">
          Atividade registrada.
        </div>
      )}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          Preencha o resumo da atividade.
        </div>
      )}

      <dl className="grid grid-cols-2 gap-3 text-sm">
        <div>
          <dt className="text-[var(--q-text-muted)]">Última compra</dt>
          <dd>{account.last_purchase_at ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--q-text-muted)]">Ciclo (dias)</dt>
          <dd>{account.purchase_cycle_days ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--q-text-muted)]">Ticket médio</dt>
          <dd>{account.avg_ticket ?? '—'}</dd>
        </div>
        <div>
          <dt className="text-[var(--q-text-muted)]">Último contato</dt>
          <dd>{account.last_contact_at ?? '—'}</dd>
        </div>
      </dl>

      <section>
        <h2 className="text-sm font-semibold">Contatos</h2>
        <ul className="mt-2 space-y-1 text-sm text-[var(--q-text-muted)]">
          {(account.crm_contacts ?? []).map((c) => (
            <li key={c.id}>
              {c.name}
              {c.email ? ` · ${c.email}` : ''}
              {c.phone ? ` · ${c.phone}` : ''}
            </li>
          ))}
          {(account.crm_contacts ?? []).length === 0 && <li>Nenhum contato</li>}
        </ul>
      </section>

      <section className="rounded-xl border border-[var(--q-border)] bg-[var(--q-surface)] p-4">
        <h2 className="text-sm font-semibold">Registrar atividade</h2>
        <form action={logCrmActivity} className="mt-3 space-y-3">
          <input type="hidden" name="account_id" value={account.id} />
          <select
            name="kind"
            className="w-full rounded-lg border border-[var(--q-border)] px-3 py-2 text-sm"
            defaultValue="call"
          >
            <option value="call">Ligação</option>
            <option value="whatsapp">WhatsApp</option>
            <option value="visit">Visita</option>
            <option value="email">E-mail</option>
            <option value="proposal">Proposta</option>
            <option value="note">Nota</option>
          </select>
          <textarea
            name="summary"
            required
            rows={3}
            placeholder="O que aconteceu / próximo passo"
            className="w-full rounded-lg border border-[var(--q-border)] px-3 py-2 text-sm"
          />
          <button
            type="submit"
            className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
          >
            Salvar
          </button>
        </form>
      </section>

      <section>
        <h2 className="text-sm font-semibold">Histórico</h2>
        <ul className="mt-2 space-y-2 text-sm">
          {activities.map((a) => (
            <li key={a.id} className="border-b border-[var(--q-border)] pb-2">
              <span className="text-xs uppercase text-[var(--q-text-muted)]">
                {a.kind} · {a.happened_at.slice(0, 16).replace('T', ' ')}
              </span>
              <p>{a.summary}</p>
            </li>
          ))}
          {activities.length === 0 && (
            <li className="text-[var(--q-text-muted)]">Sem atividades ainda.</li>
          )}
        </ul>
      </section>
    </div>
  )
}
