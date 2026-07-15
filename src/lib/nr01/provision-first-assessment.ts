/**
 * Cria a primeira avaliação NR-01 automaticamente após onboarding RT (self-service).
 * Idempotente: não duplica se já existir avaliação na empresa.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isValidCnpj } from '@/lib/companies/cnpj'
import {
  companyHasTechnicalLead,
  snapshotTechnicalLeadPayload,
  type CompanyTechnicalLeadSource,
} from '@/lib/nr01/technical-lead'
import { resolveCompetencia, nextCompetenciaSeq } from '@/lib/survey/competencia'

export interface ProvisionFirstAssessmentResult {
  assessmentId: string | null
  created: boolean
  skippedReason?: string
}

async function resolveExpectedRespondents(
  userId: string,
  companyTotal: number,
): Promise<number> {
  if (companyTotal > 0) return companyTotal

  const admin = createServiceRoleAdmin()
  const { data: sub } = await admin
    .from('subscriptions')
    .select('metadata')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .eq('status', 'active')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const meta = sub?.metadata as Record<string, unknown> | null
  const declared = meta?.headcount_declared
  if (typeof declared === 'number' && declared > 0) return Math.round(declared)

  const workerMax = meta?.worker_max
  if (typeof workerMax === 'number' && workerMax > 0) return Math.round(workerMax)

  return Math.max(companyTotal, 5)
}

export async function provisionFirstNr01Assessment(params: {
  userId: string
  companyId: string
}): Promise<ProvisionFirstAssessmentResult> {
  const admin = createServiceRoleAdmin()

  const { data: existing } = await admin
    .from('nr01_assessments')
    .select('id')
    .eq('company_id', params.companyId)
    .limit(1)
    .maybeSingle()

  if (existing?.id) {
    return { assessmentId: existing.id as string, created: false, skippedReason: 'avaliacao_ja_existe' }
  }

  const { data: companyRaw } = await admin
    .from('companies')
    .select(
      'id, name, cnpj, consultant_id, account_user_id, total_collaborators, technical_lead_name, technical_lead_crp, technical_lead_profession',
    )
    .eq('id', params.companyId)
    .eq('account_user_id', params.userId)
    .maybeSingle()

  if (!companyRaw) {
    return { assessmentId: null, created: false, skippedReason: 'empresa_nao_encontrada' }
  }

  const company = companyRaw as CompanyTechnicalLeadSource & {
    id: string
    cnpj: string | null
    consultant_id: string | null
    account_user_id: string | null
    total_collaborators: number
  }

  if (!company.cnpj || !isValidCnpj(company.cnpj)) {
    return { assessmentId: null, created: false, skippedReason: 'cnpj_invalido' }
  }

  if (!companyHasTechnicalLead(company)) {
    return { assessmentId: null, created: false, skippedReason: 'rt_ausente' }
  }

  const { data: priorAssessments } = await admin
    .from('nr01_assessments')
    .select('competencia_seq, name')
    .eq('company_id', params.companyId)

  const rows = (priorAssessments ?? []) as Array<{ competencia_seq: number | null; name: string }>
  const seqs = rows.map((r) => r.competencia_seq).filter((n): n is number => n != null && n > 0)
  const names = rows.map((r) => r.name)
  const seq = nextCompetenciaSeq(seqs, names)
  const now = new Date()
  const competencia = resolveCompetencia('nr01', seq, now.getMonth() + 1, now.getFullYear())
  const expectedRespondents = await resolveExpectedRespondents(
    params.userId,
    company.total_collaborators,
  )
  const rtSnapshot = snapshotTechnicalLeadPayload(company)

  const opensAt = new Date()
  const closesAt = new Date()
  closesAt.setDate(closesAt.getDate() + 14)

  const { data: assess, error } = await admin
    .from('nr01_assessments')
    .insert({
      company_id: params.companyId,
      consultant_id: company.consultant_id ?? params.userId,
      name: competencia.surveyName,
      reference_period: competencia.label,
      instrument_version: 'v1.1',
      modality: 'WEB',
      expected_respondents: expectedRespondents,
      k_anonymity_min: 5,
      collection_opens_at: opensAt.toISOString(),
      collection_closes_at: closesAt.toISOString(),
      linked_diagnostic_id: null,
      technical_lead_id: null,
      competencia_seq: competencia.seq,
      competencia_month: competencia.month,
      competencia_year: competencia.year,
      competencia_label: competencia.label,
      ...rtSnapshot,
      status: 'CRIADO',
    } as never)
    .select('id')
    .single()

  if (error || !assess?.id) {
    console.error('[provision-first-assessment] insert failed:', error?.message)
    return { assessmentId: null, created: false, skippedReason: error?.message ?? 'falha_insert' }
  }

  const assessmentId = assess.id as string

  await admin.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: params.userId,
    actor_role: 'contratante',
    event_type: 'ASSESSMENT_CREATED',
    payload: {
      name: competencia.surveyName,
      competencia_label: competencia.label,
      modality: 'WEB',
      expectedResp: expectedRespondents,
      company_id: params.companyId,
      technical_lead_name: rtSnapshot.technical_lead_name,
      auto_provisioned: true,
    },
  } as never)

  console.info('[provision-first-assessment] avaliação criada', {
    assessmentId,
    companyId: params.companyId,
    userId: params.userId,
  })

  return { assessmentId, created: true }
}
