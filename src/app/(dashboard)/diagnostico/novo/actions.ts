'use server'

/**
 * QUANTUM5G — Pentagrama · Criar diagnóstico (empresa obrigatória — passo 2)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { DiagnosticInsert, DiagnosticUpdate, UserRole } from '@/types/database'
import { isValidCnpj } from '@/lib/companies/cnpj'
import { fetchCompanyForActor } from '@/lib/companies/list-for-actor'
import { companyHasTechnicalLead } from '@/lib/nr01/technical-lead'
import {
  snapshotIlLeaderToDiagnostic,
} from '@/lib/pentagrama/il-leader'
import {
  assertSurveyNameMatches,
  parseCompetenciaForm,
} from '@/lib/survey/competencia'
import { fetchNextCompetenciaSeq } from '@/lib/survey/competencia-db'

export async function criarDiagnostico(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const companyId = (formData.get('company_id') as string)?.trim()
  const ilLeaderId = (formData.get('il_leader_id') as string)?.trim()
  const nomeDiag = (formData.get('nome_diagnostico') as string)?.trim()
  const ilDeadline = (formData.get('il_deadline') as string) || null
  const icDeadline = (formData.get('ic_deadline') as string) || null

  if (!companyId) {
    redirect('/diagnostico/novo?error=Selecione+uma+empresa+na+etapa+anterior.')
  }

  const errBase = `/diagnostico/novo/${companyId}`

  const competenciaParsed = parseCompetenciaForm(formData, 'pentagrama')
  if (typeof competenciaParsed === 'string') {
    redirect(`${errBase}?error=${encodeURIComponent(competenciaParsed)}`)
  }

  const nameMismatch = assertSurveyNameMatches('pentagrama', nomeDiag, competenciaParsed)
  if (nameMismatch) {
    redirect(`${errBase}?error=${encodeURIComponent(nameMismatch)}`)
  }

  const expectedSeq = await fetchNextCompetenciaSeq(supabase, companyId, 'pentagrama')
  if (competenciaParsed.seq !== expectedSeq) {
    redirect(
      `${errBase}?error=${encodeURIComponent(
        `A sequência Q${competenciaParsed.seq} não é mais válida (esperado Q${expectedSeq}). Recarregue a página.`,
      )}`,
    )
  }

  if (ilDeadline && icDeadline && icDeadline < ilDeadline) {
    redirect(`${errBase}?error=${encodeURIComponent('Encerramento deve ser igual ou posterior ao início da pesquisa.')}`)
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'

  const { data: companyRaw } = await fetchCompanyForActor(
    supabase,
    user.id,
    role,
    companyId,
    'id, cnpj, consultant_id, technical_lead_name, technical_lead_crp, il_leader_name, il_leader_email',
  )

  if (!companyRaw) {
    redirect('/diagnostico/novo?error=Empresa+inv%C3%A1lida+ou+sem+permiss%C3%A3o.')
  }

  const company = companyRaw as {
    id: string
    consultant_id: string
    cnpj: string | null
    technical_lead_name: string | null
    technical_lead_crp: string | null
    il_leader_name: string | null
    il_leader_email: string | null
  }

  if (!company.cnpj || !isValidCnpj(company.cnpj)) {
    redirect(
      `/empresas/${companyId}?error=${encodeURIComponent('CNPJ obrigatório e válido no cadastro da empresa.')}&retorno=/diagnostico/novo/${companyId}`,
    )
  }
  if (!companyHasTechnicalLead(company)) {
    redirect(
      `/empresas/${companyId}?error=${encodeURIComponent('Cadastre o responsável técnico assinante (RT) na empresa.')}&retorno=/diagnostico/novo/${companyId}`,
    )
  }

  const { data: leadersData } = await supabase
    .from('company_contacts')
    .select('id, full_name, email')
    .eq('company_id', companyId)
    .eq('contact_role', 'leader')
    .eq('is_active', true)
    .order('created_at')

  const leaders = (leadersData ?? []) as Array<{ id: string; full_name: string; email: string }>

  if (leaders.length === 0) {
    redirect(
      `/empresas/${companyId}?error=${encodeURIComponent('Cadastre ao menos um líder IL na empresa.')}&retorno=/diagnostico/novo/${companyId}`,
    )
  }

  const selected =
    leaders.find((l) => l.id === ilLeaderId) ??
    leaders[0]

  const leaderSnapshot = snapshotIlLeaderToDiagnostic({
    name: selected.full_name,
    email: selected.email,
  })

  const diagInsert: DiagnosticInsert = {
    company_id: companyId,
    consultant_id: company.consultant_id,
    name: competenciaParsed.surveyName,
    leader_name: leaderSnapshot.leader_name,
    leader_email: leaderSnapshot.leader_email,
    il_deadline: ilDeadline,
    ic_deadline: icDeadline,
    competencia_seq: competenciaParsed.seq,
    competencia_month: competenciaParsed.month,
    competencia_year: competenciaParsed.year,
    competencia_label: competenciaParsed.label,
  }

  const { data: diag, error: errDiag } = await supabase
    .from('diagnostics')
    .insert(diagInsert as never)
    .select('id')
    .single()

  if (errDiag || !diag) {
    redirect(
      `${errBase}?error=${encodeURIComponent('Erro ao criar diagnóstico: ' + (errDiag?.message ?? ''))}`,
    )
  }

  const diagId = (diag as { id: string }).id
  const statusUpdate: DiagnosticUpdate = { status: 'AGUARDANDO_IL' }
  await supabase.from('diagnostics').update(statusUpdate as never).eq('id', diagId)

  redirect(`/diagnostico/${diagId}`)
}
