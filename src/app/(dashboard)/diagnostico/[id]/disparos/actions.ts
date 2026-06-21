'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import {
  buildPentagramaIcUrl,
  buildPentagramaIlUrl,
  dispatchSurveyInvites,
  filterContactsForDispatch,
  type DispatchTarget,
} from '@/lib/survey/dispatch'
import type { CompanyContact } from '@/types/database'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { ensureDiagnosticAccess } from '@/lib/pentagrama/diagnostic-access'
import { getDiagnosticPageActor } from '@/lib/pentagrama/require-diagnostic-page'

export async function dispararConvitesPentagrama(formData: FormData) {
  const diagnosticId = formData.get('diagnostic_id') as string
  const kind = formData.get('survey_kind') as 'il' | 'ic'

  const { profile } = await getDiagnosticPageActor()
  const { db, diagnostic } = await ensureDiagnosticAccess(
    diagnosticId,
    `
      id, name, status, il_token, ic_token, il_deadline, ic_deadline, consultant_id,
      companies:companies!diagnostics_company_id_fkey ( id, name )
    `,
  )

  const d = diagnostic as {
    id: string
    name: string
    status: string
    il_token: string
    ic_token: string
    il_deadline: string | null
    ic_deadline: string | null
    consultant_id: string
    companies: { id: string; name: string } | null
  }

  const prazoEncerramento = d.ic_deadline
    ? new Date(d.ic_deadline + 'T12:00:00').toLocaleDateString('pt-BR')
    : null

  const companyId = d.companies?.id
  if (!companyId) redirect(`/diagnostico/${diagnosticId}/disparos?error=Empresa+inválida`)

  if (!isPentagramaColetaAberta(d.status)) {
    redirect(
      `/diagnostico/${diagnosticId}/disparos?error=${encodeURIComponent('Disparo indisponível: coleta encerrada ou não iniciada.')}`,
    )
  }

  const { data: contactsRaw } = await db.from('company_contacts').select('*').eq('company_id', companyId)

  const contacts = filterContactsForDispatch(
    (contactsRaw ?? []) as CompanyContact[],
    'pentagrama',
    kind,
  )

  if (contacts.length === 0) {
    redirect(
      `/empresas/${companyId}/equipe?error=${encodeURIComponent(
        kind === 'il'
          ? 'Cadastre líderes na equipe antes de disparar o IL.'
          : 'Cadastre colaboradores na equipe antes de disparar o IC.',
      )}&retorno=/diagnostico/${diagnosticId}/disparos`,
    )
  }

  const targets: DispatchTarget[] = contacts.map((c) => ({
    contact: c,
    surveyUrl:
      kind === 'il' ? buildPentagramaIlUrl(d.il_token) : buildPentagramaIcUrl(d.ic_token),
  }))

  const result = await dispatchSurveyInvites({
    companyId,
    consultantId: d.consultant_id,
    module: 'pentagrama',
    surveyKind: kind,
    referenceId: diagnosticId,
    companyName: d.companies!.name,
    surveyLabel: kind === 'il' ? `IL — ${d.name}` : `IC — ${d.name}`,
    moduleLabel: 'Pentagrama Ginger',
    targets,
    deadline: prazoEncerramento,
    consultantName: profile?.name,
  })

  revalidatePath(`/diagnostico/${diagnosticId}/disparos`)
  redirect(
    `/diagnostico/${diagnosticId}/disparos?sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}&kind=${kind}`,
  )
}
