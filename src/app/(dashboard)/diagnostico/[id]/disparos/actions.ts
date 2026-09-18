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
import {
  filterContactsByDepartments,
  sanitizeSelectedDepartments,
} from '@/lib/companies/contacts'
import type { CompanyContact } from '@/types/database'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { ensureDiagnosticAccess } from '@/lib/pentagrama/diagnostic-access'
import { getDiagnosticPageActor } from '@/lib/pentagrama/require-diagnostic-page'

function isNextRedirect(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'digest' in err &&
    String((err as { digest?: string }).digest).startsWith('NEXT_REDIRECT')
  )
}

export async function dispararConvitesPentagrama(formData: FormData) {
  const diagnosticId = formData.get('diagnostic_id') as string
  const kindRaw = formData.get('survey_kind') as string
  const kind = kindRaw === 'il' || kindRaw === 'ic' ? kindRaw : null

  if (!kind) {
    redirect(
      `/diagnostico/${diagnosticId}/disparos?error=${encodeURIComponent('Tipo de disparo inválido.')}`,
    )
  }

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

  let contacts = filterContactsForDispatch(
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

  const { data: catalogIds } = await db
    .from('company_departments')
    .select('id')
    .eq('company_id', companyId)
    .eq('is_active', true)

  const selectedDepartments = sanitizeSelectedDepartments(
    contacts,
    formData.getAll('department').map((v) => String(v)),
    ((catalogIds ?? []) as { id: string }[]).map((d) => d.id),
  )

  if (selectedDepartments.length === 0) {
    redirect(
      `/diagnostico/${diagnosticId}/disparos?error=${encodeURIComponent(
        'Selecione ao menos um departamento para disparar os convites.',
      )}#${kind}`,
    )
  }

  contacts = filterContactsByDepartments(contacts, selectedDepartments)

  if (contacts.length === 0) {
    redirect(
      `/diagnostico/${diagnosticId}/disparos?error=${encodeURIComponent(
        'Nenhum contato nos departamentos escolhidos.',
      )}#${kind}`,
    )
  }

  const targets: DispatchTarget[] = contacts.map((c) => ({
    contact: c,
    surveyUrl:
      kind === 'il' ? buildPentagramaIlUrl(d.il_token) : buildPentagramaIcUrl(d.ic_token),
  }))

  try {
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
  } catch (err) {
    if (isNextRedirect(err)) throw err
    const msg = err instanceof Error ? err.message : 'Falha ao disparar convites.'
    redirect(
      `/diagnostico/${diagnosticId}/disparos?error=${encodeURIComponent(msg)}#${kind}`,
    )
  }
}
