import Link from 'next/link'
import { dispararConvitesPentagrama } from './actions'
import { loadDiagnosticForPage } from '@/lib/pentagrama/require-diagnostic-page'
import { filterContactsForDispatch } from '@/lib/survey/dispatch'
import { loadLastDispatchBatch } from '@/lib/survey/dispatch-history'
import { loadInviteDeliveryStats } from '@/lib/survey/invite-delivery-stats'
import { loadInviteDeliveryDetails } from '@/lib/survey/invite-delivery-details'
import { DispatchDeliveryDetail } from '@/components/survey/DispatchDeliveryDetail'
import { getActiveDriver } from '@/lib/email/platform'
import { DispatchSubmitButton } from '@/components/survey/DispatchSubmitButton'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import type { CompanyContact } from '@/types/database'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string; sent?: string; failed?: string; skipped?: string; kind?: string }>
}

export default async function DiagnosticoDisparosPage({ params, searchParams }: Props) {
  const { id } = await params
  const sp = await searchParams

  const { db, diagnostic: diagRaw } = await loadDiagnosticForPage(
    id,
    `
      id, name, status, il_deadline, ic_deadline,
      companies:companies!diagnostics_company_id_fkey ( id, name )
    `,
  )
  const d = diagRaw as {
    id: string
    name: string
    status: string
    companies: { id: string; name: string } | null
  }
  const companyId = d.companies?.id

  const { data: contactsRaw } = companyId
    ? await db.from('company_contacts').select('*').eq('company_id', companyId)
    : { data: [] }

  const all = (contactsRaw ?? []) as CompanyContact[]
  const leaders = filterContactsForDispatch(all, 'pentagrama', 'il')
  const collaborators = filterContactsForDispatch(all, 'pentagrama', 'ic')
  const lastBatch = await loadLastDispatchBatch(db, 'pentagrama', id)
  const deliveryStats = await loadInviteDeliveryStats(db, 'pentagrama', id)
  const deliveryDetailsIl = await loadInviteDeliveryDetails(db, 'pentagrama', id, 'il')
  const deliveryDetailsIc = await loadInviteDeliveryDetails(db, 'pentagrama', id, 'ic')
  const emailDriver = getActiveDriver()
  const failedItems = lastBatch?.items.filter((i) => i.status === 'failed') ?? []

  const { data: batches } = await db
    .from('email_dispatch_batches')
    .select('id, survey_kind, sent_count, failed_count, total_targets, created_at')
    .eq('module', 'pentagrama')
    .eq('reference_id', id)
    .order('created_at', { ascending: false })
    .limit(10)

  const coletaAberta = isPentagramaColetaAberta(d.status)

  return (
    <div className="mx-auto max-w-2xl space-y-8">
      <div>
        <Link href={`/diagnostico/${id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Diagnóstico
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Disparo de convites</h1>
        <p className="mt-1 text-sm text-zinc-600">{d.name} · {d.companies?.name}</p>
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
          Disparo {sp.kind === 'ic' ? 'IC' : 'IL'}: {sp.sent} enviados
          {sp.failed && Number(sp.failed) > 0 ? `, ${sp.failed} falhas` : ''}
          {sp.skipped && Number(sp.skipped) > 0 ? `, ${sp.skipped} ignorados` : ''}.
          {emailDriver === 'console' && (
            <span className="mt-1 block text-xs">
              Modo desenvolvimento: e-mails no console do servidor.
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

      <section className="rounded-xl border border-zinc-200 bg-white p-4 space-y-3">
        <h2 className="text-sm font-semibold text-zinc-900">Lista de transmissão (equipe)</h2>
        <p className="text-xs text-zinc-500">
          <strong>{leaders.length}</strong> líder(es) para IL · <strong>{collaborators.length}</strong>{' '}
          colaborador(es) para IC
        </p>
        {deliveryStats.total > 0 && (
          <dl className="mt-3 grid grid-cols-2 gap-2 text-xs text-zinc-600 sm:grid-cols-4">
            <div>
              <dt className="text-zinc-400">Entregues</dt>
              <dd className="font-semibold text-zinc-900">{deliveryStats.delivered}</dd>
            </div>
            <div>
              <dt className="text-zinc-400">Enviados</dt>
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
          <Link href={`/empresas/${companyId}/equipe`} className="text-sm text-zinc-900 hover:underline">
            Gerenciar equipe →
          </Link>
        )}
      </section>

      {deliveryDetailsIl.length > 0 && (
        <DispatchDeliveryDetail rows={deliveryDetailsIl} lastBatchItems={lastBatch?.items} />
      )}
      {deliveryDetailsIc.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Campanha IC</p>
          <DispatchDeliveryDetail rows={deliveryDetailsIc} />
        </div>
      )}

      {coletaAberta && (
        <form id="il" action={dispararConvitesPentagrama} className="rounded-xl border border-purple-200 bg-purple-50/40 p-4">
          <input type="hidden" name="diagnostic_id" value={id} />
          <input type="hidden" name="survey_kind" value="il" />
          <h3 className="font-semibold text-purple-900">Disparar IL (liderança)</h3>
          <p className="mt-1 text-sm text-purple-800/90">
            Envia e-mail do SaaS para {leaders.length} líder(es) com link tokenizado.
          </p>
          <DispatchSubmitButton
            disabled={leaders.length === 0}
            className="mt-4 rounded-lg bg-purple-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar convites IL
          </DispatchSubmitButton>
        </form>
      )}

      {coletaAberta && (
        <form id="ic" action={dispararConvitesPentagrama} className="rounded-xl border border-blue-200 bg-blue-50/40 p-4">
          <input type="hidden" name="diagnostic_id" value={id} />
          <input type="hidden" name="survey_kind" value="ic" />
          <h3 className="font-semibold text-blue-900">Disparar IC (colaboradores)</h3>
          <p className="mt-1 text-sm text-blue-800/90">
            Envia e-mail para {collaborators.length} colaborador(es). Link anônimo compartilhado por token IC.
          </p>
          <DispatchSubmitButton
            disabled={collaborators.length === 0}
            className="mt-4 rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            Enviar convites IC
          </DispatchSubmitButton>
        </form>
      )}

      {(batches ?? []).length > 0 && (
        <section className="rounded-xl border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">Histórico de disparos</h2>
          <ul className="mt-3 space-y-2 text-sm text-zinc-600">
            {(batches as Array<{ survey_kind: string; sent_count: number; failed_count: number; created_at: string }>).map((b) => (
              <li key={b.created_at}>
                {b.survey_kind.toUpperCase()} — {b.sent_count}/{b.sent_count + b.failed_count} em{' '}
                {new Date(b.created_at).toLocaleString('pt-BR')}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}
