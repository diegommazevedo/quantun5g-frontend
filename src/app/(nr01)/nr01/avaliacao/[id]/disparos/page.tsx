import Link from 'next/link'
import { redirect } from 'next/navigation'
import { loadNr01AssessmentForPage } from '@/lib/nr01/require-assessment-page'
import { dispararConvitesNr01 } from './actions'
import { filterContactsForDispatch } from '@/lib/survey/dispatch'
import { loadLastDispatchBatch } from '@/lib/survey/dispatch-history'
import { loadInviteDeliveryStats } from '@/lib/survey/invite-delivery-stats'
import { loadInviteDeliveryDetails } from '@/lib/survey/invite-delivery-details'
import { DispatchDeliveryDetail } from '@/components/survey/DispatchDeliveryDetail'
import { getActiveDriver } from '@/lib/email/platform'
import { DispatchSubmitButton } from '@/components/survey/DispatchSubmitButton'
import type { CompanyContact } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; sent?: string; failed?: string; skipped?: string }>
}

export default async function Nr01DisparosPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams

  const { db, assessment: assess } = await loadNr01AssessmentForPage(
    id,
    `
      id, name, status,
      companies:companies!nr01_assessments_company_id_fkey ( id, name )
    `,
  )
  const a = assess as { id: string; name: string; status: string; companies: { id: string; name: string } | null }
  const companyId = a.companies?.id

  const { data: contactsRaw } = companyId
    ? await db.from('company_contacts').select('*').eq('company_id', companyId)
    : { data: [] }

  const lista = filterContactsForDispatch((contactsRaw ?? []) as CompanyContact[], 'nr01', 'nr01_coleta')
  const lastBatch = await loadLastDispatchBatch(db, 'nr01', id)
  const deliveryStats = await loadInviteDeliveryStats(db, 'nr01', id)
  const deliveryDetails = await loadInviteDeliveryDetails(db, 'nr01', id, 'nr01_coleta')
  const emailDriver = getActiveDriver()
  const failedItems = lastBatch?.items.filter((i) => i.status === 'failed') ?? []

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={`/nr01/avaliacao/${id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Avaliação
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Disparo de coleta</h1>
        <p className="mt-1 text-sm text-zinc-600">{a.name}</p>
      </div>

      <div className="rounded-lg border border-blue-100 bg-blue-50/60 px-4 py-3 text-sm text-blue-900">
        No NR-01 a lista inclui <strong>todos os contatos ativos</strong> (líderes e colaboradores).
        A resposta permanece anônima no questionário; o token no link serve apenas para rastrear envio.
      </div>

      {sp.error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(sp.error)}
        </div>
      )}
      {sp.sent && (
        <div
          className={`rounded-lg border px-4 py-3 text-sm ${
            Number(sp.failed) > 0
              ? 'border-amber-200 bg-amber-50 text-amber-900'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {sp.sent} e-mails enviados
          {sp.failed && Number(sp.failed) > 0 ? `, ${sp.failed} falhas` : ''}
          {sp.skipped && Number(sp.skipped) > 0 ? `, ${sp.skipped} ignorados` : ''}.
          {emailDriver === 'console' && (
            <span className="mt-1 block text-xs">
              Modo desenvolvimento: e-mails registrados no console do servidor (não saem pelo Resend).
            </span>
          )}
        </div>
      )}

      {failedItems.length > 0 && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          <p className="font-semibold">Último lote — falhas ({failedItems.length})</p>
          <ul className="mt-2 space-y-1 text-xs">
            {failedItems.map((item) => (
              <li key={item.email}>
                <span className="font-mono">{item.email}</span>
                {item.error_message ? `: ${item.error_message}` : ''}
              </li>
            ))}
          </ul>
        </div>
      )}

      <section className="rounded-xl border border-zinc-200 bg-white p-4">
        <p className="text-sm">
          <strong>{lista.length}</strong> destinatários na lista de transmissão.
        </p>
        {deliveryStats.total > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600 sm:grid-cols-4">
            <div>
              <dt className="text-zinc-400">Entregues</dt>
              <dd className="font-semibold text-zinc-900">{deliveryStats.delivered}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Enviados (API)</dt>
              <dd className="font-semibold text-zinc-900">{deliveryStats.sent}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Aberturas</dt>
              <dd className="font-semibold text-zinc-900">{deliveryStats.opened}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Bounce / spam</dt>
              <dd className="font-semibold text-zinc-900">
                {deliveryStats.bounced + deliveryStats.complained}
              </dd>
            </div>
          </dl>
        )}
        {companyId && (
          <Link href={`/empresas/${companyId}/equipe`} className="mt-2 inline-block text-sm text-blue-800 hover:underline">
            Gerenciar equipe →
          </Link>
        )}
      </section>

      <DispatchDeliveryDetail rows={deliveryDetails} lastBatchItems={lastBatch?.items} />

      {a.status === 'COLETANDO' && (
        <form action={dispararConvitesNr01} className="rounded-xl border border-zinc-200 bg-white p-4">
          <input type="hidden" name="assessment_id" value={id} />
          <p className="text-sm text-zinc-600 mb-4">
            Driver de e-mail: <code>{emailDriver}</code>
            {emailDriver === 'console'
              ? ' — em dev os links aparecem no terminal do Next.js.'
              : ' — Resend + webhooks (entrega, bounce, abertura).'}
          </p>
          <DispatchSubmitButton
            disabled={lista.length === 0}
            className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar convites de coleta ({lista.length})
          </DispatchSubmitButton>
        </form>
      )}
    </div>
  )
}
