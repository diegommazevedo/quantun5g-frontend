'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import {
  buildNr01ColetaUrl,
  dispatchSurveyInvites,
  filterContactsForDispatch,
  type DispatchTarget,
} from '@/lib/survey/dispatch'
import type { CompanyContact } from '@/types/database'

export async function dispararConvitesNr01(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { db, user, assessment: assess } = await ensureNr01AssessmentAccess(
    assessmentId,
    `
      id, name, status, collection_token, collection_closes_at, consultant_id,
      companies:companies!nr01_assessments_company_id_fkey ( id, name )
    `,
  )

  const a = assess as {
    id: string
    name: string
    status: string
    collection_token: string
    collection_closes_at: string | null
    consultant_id: string
    companies: { id: string; name: string } | null
  }

  if (a.status !== 'COLETANDO') {
    redirect(`/nr01/avaliacao/${assessmentId}/disparos?error=Coleta+precisa+estar+aberta+(COLETANDO)`)
  }

  const companyId = a.companies?.id
  if (!companyId || !a.collection_token) {
    redirect(`/nr01/avaliacao/${assessmentId}/disparos?error=Dados+incompletos`)
  }

  const { data: contactsRaw } = await db
    .from('company_contacts')
    .select('*')
    .eq('company_id', companyId)

  const contacts = filterContactsForDispatch(
    (contactsRaw ?? []) as CompanyContact[],
    'nr01',
    'nr01_coleta',
  )

  if (contacts.length === 0) {
    redirect(
      `/empresas/${companyId}/equipe?error=${encodeURIComponent(
        'Cadastre a equipe (líderes e colaboradores) antes do disparo NR-01.',
      )}&retorno=/nr01/avaliacao/${assessmentId}/disparos`,
    )
  }

  const { data: profile } = await db
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .maybeSingle()

  const targets: DispatchTarget[] = contacts.map((c) => ({
    contact: c,
    surveyUrl: buildNr01ColetaUrl(a.collection_token),
  }))

  const result = await dispatchSurveyInvites({
    companyId,
    consultantId: a.consultant_id,
    module: 'nr01',
    surveyKind: 'nr01_coleta',
    referenceId: assessmentId,
    companyName: a.companies!.name,
    surveyLabel: `Coleta NR-01 — ${a.name}`,
    moduleLabel: 'NR-01',
    targets,
    deadline: a.collection_closes_at
      ? new Date(a.collection_closes_at).toLocaleDateString('pt-BR')
      : null,
    consultantName: (profile as { name: string | null } | null)?.name,
  })

  revalidatePath(`/nr01/avaliacao/${assessmentId}/disparos`)
  redirect(
    `/nr01/avaliacao/${assessmentId}/disparos?sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`,
  )
}
