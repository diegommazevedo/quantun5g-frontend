'use server'

/**
 * QUANTUM5G — NR-01 · Criar avaliação (empresa obrigatória — passo 2)
 */

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Nr01Modality } from '@/types/nr01'
import { isValidCnpj } from '@/lib/companies/cnpj'
import {
  companyHasTechnicalLead,
  snapshotTechnicalLeadPayload,
} from '@/lib/nr01/technical-lead'
import {
  assertSurveyNameMatches,
  parseCompetenciaForm,
} from '@/lib/survey/competencia'
import { fetchNextCompetenciaSeq } from '@/lib/survey/competencia-db'

export async function criarAvaliacaoNr01(formData: FormData) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const companyId = (formData.get('company_id') as string)?.trim()
  const name = (formData.get('name') as string)?.trim()
  const referencePeriod = (formData.get('reference_period') as string)?.trim() || null
  const modality = ((formData.get('modality') as string) || 'WEB') as Nr01Modality
  const expectedResp = parseInt(formData.get('expected_respondents') as string) || 0
  const opensAt = (formData.get('collection_opens_at') as string) || null
  const closesAt = (formData.get('collection_closes_at') as string) || null
  const linkedDiagId = (formData.get('linked_diagnostic_id') as string)?.trim() || null
  const kAnonymityMin = parseInt(formData.get('k_anonymity_min') as string) || 5

  if (!companyId) {
    redirect('/nr01/avaliacao/nova?error=Selecione+uma+empresa+na+etapa+anterior.')
  }

  const errBase = `/nr01/avaliacao/nova/${companyId}`

  const competenciaParsed = parseCompetenciaForm(formData, 'nr01')
  if (typeof competenciaParsed === 'string') {
    redirect(`${errBase}?error=${encodeURIComponent(competenciaParsed)}`)
  }

  const nameMismatch = assertSurveyNameMatches('nr01', name, competenciaParsed)
  if (nameMismatch) {
    redirect(`${errBase}?error=${encodeURIComponent(nameMismatch)}`)
  }

  if (referencePeriod && referencePeriod !== competenciaParsed.label) {
    redirect(`${errBase}?error=${encodeURIComponent('Período de referência inconsistente. Recarregue a página.')}`)
  }

  const expectedSeq = await fetchNextCompetenciaSeq(supabase, companyId, 'nr01')
  if (competenciaParsed.seq !== expectedSeq) {
    redirect(
      `${errBase}?error=${encodeURIComponent(
        `A sequência Q${competenciaParsed.seq} não é mais válida (esperado Q${expectedSeq}). Recarregue a página.`,
      )}`,
    )
  }

  if (opensAt && closesAt && closesAt < opensAt) {
    redirect(`${errBase}?error=${encodeURIComponent('Encerramento deve ser igual ou posterior à abertura.')}`)
  }

  const { data: company } = await supabase
    .from('companies')
    .select('id, cnpj, technical_lead_name, technical_lead_crp, technical_lead_profession')
    .eq('id', companyId)
    .eq('consultant_id', user.id)
    .maybeSingle()

  if (!company) {
    redirect('/nr01/avaliacao/nova?error=Empresa+inv%C3%A1lida+ou+sem+permiss%C3%A3o.')
  }

  const co = company as { cnpj: string | null; technical_lead_name: string | null; technical_lead_crp: string | null; technical_lead_profession: string | null }
  if (!co.cnpj || !isValidCnpj(co.cnpj)) {
    redirect(
      `/empresas/${companyId}?error=${encodeURIComponent('CNPJ obrigatório e válido no cadastro da empresa.')}&retorno=/nr01/avaliacao/nova/${companyId}`,
    )
  }
  if (!companyHasTechnicalLead(co)) {
    redirect(
      `/empresas/${companyId}?error=${encodeURIComponent('Cadastre o responsável técnico assinante (RT) antes de criar a avaliação.')}&retorno=/nr01/avaliacao/nova/${companyId}`,
    )
  }

  const rtSnapshot = snapshotTechnicalLeadPayload(co)

  const { data: assess, error: errAssess } = await supabase
    .from('nr01_assessments')
    .insert({
      company_id: companyId,
      consultant_id: user.id,
      name: competenciaParsed.surveyName,
      reference_period: competenciaParsed.label,
      instrument_version: 'v1.1',
      modality,
      expected_respondents: expectedResp,
      k_anonymity_min: kAnonymityMin,
      collection_opens_at: opensAt ? new Date(opensAt).toISOString() : null,
      collection_closes_at: closesAt ? new Date(closesAt).toISOString() : null,
      linked_diagnostic_id: linkedDiagId,
      technical_lead_id: user.id,
      competencia_seq: competenciaParsed.seq,
      competencia_month: competenciaParsed.month,
      competencia_year: competenciaParsed.year,
      competencia_label: competenciaParsed.label,
      ...rtSnapshot,
      status: 'CRIADO',
    } as never)
    .select('id')
    .single()

  if (errAssess || !assess) {
    redirect(`${errBase}?error=${encodeURIComponent('Erro ao criar avaliação: ' + (errAssess?.message ?? ''))}`)
  }

  const assessmentId = (assess as { id: string }).id

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'ASSESSMENT_CREATED',
    payload: {
      name: competenciaParsed.surveyName,
      competencia_label: competenciaParsed.label,
      modality,
      expectedResp,
      company_id: companyId,
      technical_lead_name: rtSnapshot.technical_lead_name,
    },
  } as never)

  redirect(`/nr01/avaliacao/${assessmentId}`)
}
