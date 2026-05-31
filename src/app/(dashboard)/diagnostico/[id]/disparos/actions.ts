'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  buildPentagramaIcUrl,
  buildPentagramaIlUrl,
  dispatchSurveyInvites,
  filterContactsForDispatch,
  type DispatchTarget,
} from '@/lib/survey/dispatch'
import type { CompanyContact } from '@/types/database'

async function loadDiagnostic(id: string, userId: string) {
  const supabase = await createClient()
  const { data } = await supabase
    .from('diagnostics')
    .select(`
      id, name, status, il_token, ic_token, il_deadline, ic_deadline,
      companies:companies!diagnostics_company_id_fkey ( id, name )
    `)
    .eq('id', id)
    .eq('consultant_id', userId)
    .single()
  return { supabase, diagnostic: data }
}

export async function dispararConvitesPentagrama(formData: FormData) {
  const diagnosticId = formData.get('diagnostic_id') as string
  const kind = formData.get('survey_kind') as 'il' | 'ic'
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { diagnostic } = await loadDiagnostic(diagnosticId, user.id)
  if (!diagnostic) redirect('/dashboard')

  const d = diagnostic as {
    id: string
    name: string
    status: string
    il_token: string
    ic_token: string
    il_deadline: string | null
    ic_deadline: string | null
    companies: { id: string; name: string } | null
  }

  const prazoEncerramento = d.ic_deadline
    ? new Date(d.ic_deadline + 'T12:00:00').toLocaleDateString('pt-BR')
    : null

  const companyId = d.companies?.id
  if (!companyId) redirect(`/diagnostico/${diagnosticId}/disparos?error=Empresa+inválida`)

  if (kind === 'il' && d.status !== 'AGUARDANDO_IL') {
    redirect(`/diagnostico/${diagnosticId}/disparos?error=IL+só+no+status+AGUARDANDO_IL`)
  }
  if (kind === 'ic' && d.status !== 'COLETANDO_IC') {
    redirect(`/diagnostico/${diagnosticId}/disparos?error=IC+só+no+status+COLETANDO_IC`)
  }

  const { data: contactsRaw } = await supabase
    .from('company_contacts')
    .select('*')
    .eq('company_id', companyId)

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

  const { data: profile } = await supabase
    .from('profiles')
    .select('name')
    .eq('id', user.id)
    .single()

  const targets: DispatchTarget[] = contacts.map((c) => ({
    contact: c,
    surveyUrl:
      kind === 'il' ? buildPentagramaIlUrl(d.il_token) : buildPentagramaIcUrl(d.ic_token),
  }))

  const result = await dispatchSurveyInvites({
    companyId,
    consultantId: user.id,
    module: 'pentagrama',
    surveyKind: kind,
    referenceId: diagnosticId,
    companyName: d.companies!.name,
    surveyLabel: kind === 'il' ? `IL — ${d.name}` : `IC — ${d.name}`,
    moduleLabel: 'Pentagrama Ginger',
    targets,
    deadline: prazoEncerramento,
    consultantName: (profile as { name: string | null } | null)?.name,
  })

  revalidatePath(`/diagnostico/${diagnosticId}/disparos`)
  redirect(
    `/diagnostico/${diagnosticId}/disparos?sent=${result.sent}&failed=${result.failed}&skipped=${result.skipped}&kind=${kind}`,
  )
}
