import type { InviteDeliveryRow } from '@/lib/survey/invite-delivery-details'
import { groupDeliveryRows } from '@/lib/survey/invite-delivery-details'

function fmtWhen(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function statusClass(status: string): string {
  if (status === 'delivered') return 'bg-emerald-100 text-emerald-900'
  if (status === 'sent') return 'bg-blue-100 text-blue-900'
  if (status === 'failed' || status === 'bounced') return 'bg-red-100 text-red-900'
  if (status === 'complained') return 'bg-amber-100 text-amber-900'
  return 'bg-zinc-100 text-zinc-700'
}

function RowTable({
  title,
  rows,
  empty,
}: {
  title: string
  rows: InviteDeliveryRow[]
  empty: string
}) {
  if (rows.length === 0) {
    return (
      <div>
        <h3 className="text-sm font-semibold text-zinc-900">{title}</h3>
        <p className="mt-1 text-xs text-zinc-500">{empty}</p>
      </div>
    )
  }

  return (
    <div>
      <h3 className="text-sm font-semibold text-zinc-900">
        {title} ({rows.length})
      </h3>
      <div className="mt-2 overflow-hidden rounded-lg border border-zinc-200">
        <table className="min-w-full text-xs">
          <thead className="bg-zinc-50 text-left text-zinc-500">
            <tr>
              <th className="px-3 py-2">Destinatário</th>
              <th className="px-3 py-2">Status</th>
              <th className="hidden px-3 py-2 sm:table-cell">Enviado</th>
              <th className="hidden px-3 py-2 md:table-cell">Entregue</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100 bg-white">
            {rows.map((r) => (
              <tr key={r.contactId + r.email}>
                <td className="px-3 py-2">
                  <div className="font-medium text-zinc-900">{r.fullName}</div>
                  <div className="font-mono text-zinc-600">{r.email}</div>
                  <p className="mt-1 text-zinc-500">{r.detail}</p>
                </td>
                <td className="px-3 py-2 align-top">
                  <span
                    className={`inline-block rounded-full px-2 py-0.5 font-semibold ${statusClass(r.emailStatus)}`}
                  >
                    {r.label}
                  </span>
                </td>
                <td className="hidden px-3 py-2 align-top text-zinc-600 sm:table-cell">
                  {fmtWhen(r.sentAt)}
                </td>
                <td className="hidden px-3 py-2 align-top text-zinc-600 md:table-cell">
                  {fmtWhen(r.deliveredAt)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

interface Props {
  rows: InviteDeliveryRow[]
  lastBatchItems?: Array<{ email: string; status: string; error_message: string | null }>
}

export function DispatchDeliveryDetail({ rows, lastBatchItems }: Props) {
  const { delivered, sentPending, notDelivered } = groupDeliveryRows(rows)

  const skipped =
    lastBatchItems?.filter((i) => i.status === 'skipped').map((i) => ({
      contactId: i.email,
      fullName: '—',
      email: i.email,
      emailStatus: 'skipped',
      label: 'Ignorado',
      detail:
        i.error_message ??
        'Não reenviado (já enviado nesta campanha ou e-mail inválido/suprimido).',
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      error: i.error_message,
    })) ?? []

  const failedBatch =
    lastBatchItems?.filter((i) => i.status === 'failed').map((i) => ({
      contactId: i.email,
      fullName: '—',
      email: i.email,
      emailStatus: 'failed',
      label: 'Falha no lote',
      detail: i.error_message ?? 'Falha no último disparo.',
      sentAt: null,
      deliveredAt: null,
      openedAt: null,
      error: i.error_message,
    })) ?? []

  if (rows.length === 0 && skipped.length === 0 && failedBatch.length === 0) return null

  return (
    <section className="space-y-6 rounded-xl border border-zinc-200 bg-white p-4">
      <div>
        <h2 className="text-sm font-semibold text-zinc-900">Detalhamento por e-mail</h2>
        <p className="mt-1 text-xs text-zinc-500">
          <strong>Entregue</strong> = confirmação do provedor (Resend).{' '}
          <strong>Enviado</strong> = saiu da plataforma, mas a caixa de entrada ainda não confirmou.
        </p>
      </div>

      <RowTable
        title="Entregues na caixa de entrada"
        rows={delivered}
        empty="Nenhum e-mail com confirmação de entrega até o momento."
      />

      <RowTable
        title="Enviados — aguardando confirmação de entrega"
        rows={sentPending}
        empty="Nenhum nesta situação."
      />

      <RowTable
        title="Não entregues / pendências"
        rows={[...notDelivered, ...failedBatch, ...skipped]}
        empty="Nenhum com falha ou pendência."
      />
    </section>
  )
}
