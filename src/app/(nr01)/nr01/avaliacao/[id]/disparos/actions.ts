'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  buildNr01ColetaUrl,
  dispatchSurveyInvites,
  filterContactsForDispatch,
  type DispatchTarget,
} from '@/lib/survey/dispatch'
import type { CompanyContact } from '@/types/database'
import type { UserRole } from '@/types/database'

export async function dispararConvitesNr01(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, name')
    .eq('id', user.id)
    .returns<{ role: UserRole; name: string | null }[]>()
    .single()
  const role = profile?.role ?? 'consultant'

  let assessQuery = supabase
    .from('nr01_assessments')
    .select(`
      id, name, status, collection_token, collection_closes_at, consultant_id,
      companies:companies!nr01_assessments_company_id_fkey ( id, name )
    `)
    .eq('id', assessmentId)
  if (role !== 'admin') assessQuery = assessQuery.eq('consultant_id', user.id)
  const { data: assess } = await assessQuery.single()

  if (!assess) redirect('/nr01/dashboard')
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

  const { data: contactsRaw } = await supabase
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
    consultantName: profile?.name,
  })

  revalidatePath(`/nr01/avaliacao/${assessmentId}/disparos`)
  redirect(
    `/nr01/avaliacao/${assessmentId}/disparos?sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}`,
  )
}
