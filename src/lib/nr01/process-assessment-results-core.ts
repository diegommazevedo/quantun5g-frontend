/**
 * Motor de processamento NR-01 — reutilizável em actions e automação pós-k.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { computeScoring } from '@/lib/nr01/scoring'
import {
  companyHasTechnicalLead,
  snapshotTechnicalLeadPayload,
  type CompanyTechnicalLeadSource,
} from '@/lib/nr01/technical-lead'
import type { Nr01Question, Nr01ResponseAnswer } from '@/types/nr01'

export interface ProcessAssessmentResultsInput {
  assessmentId: string
  actorId: string | null
  actorRole: string
  autoProvisioned?: boolean
}

export interface ProcessAssessmentResultsOutput {
  ok: boolean
  error?: string
  iso_score?: number | null
  iso_risk_level?: string | null
  n_respondents?: number
}

export async function processAssessmentResultsCore(
  db: SupabaseClient,
  input: ProcessAssessmentResultsInput,
): Promise<ProcessAssessmentResultsOutput> {
  const { data: assessment } = await db
    .from('nr01_assessments')
    .select('id, company_id, instrument_version, k_anonymity_min, status')
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (!assessment) return { ok: false, error: 'avaliacao_nao_encontrada' }

  const a = assessment as {
    id: string
    company_id: string
    instrument_version: string
    k_anonymity_min: number
    status: string
  }

  if (a.status === 'CONCLUIDO') {
    return { ok: true, error: 'ja_concluida' }
  }

  const { data: companyRowRaw } = await db
    .from('companies')
    .select('technical_lead_name, technical_lead_crp, technical_lead_profession')
    .eq('id', a.company_id)
    .maybeSingle()

  const companyRow = companyRowRaw as CompanyTechnicalLeadSource | null
  if (!companyRow || !companyHasTechnicalLead(companyRow)) {
    return { ok: false, error: 'rt_ausente' }
  }

  const rtSnapshot = snapshotTechnicalLeadPayload(companyRow)

  const [{ data: questionsData }, { data: responsesData }, { data: dimsData }] = await Promise.all([
    db
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', a.instrument_version)
      .eq('is_active', true),
    db.from('nr01_responses').select('id').eq('assessment_id', input.assessmentId),
    db.from('nr01_dimensions').select('code, weight'),
  ])

  const questions = (questionsData ?? []) as Nr01Question[]
  const responseIds = (responsesData ?? []).map((r) => (r as { id: string }).id)
  const dims = (dimsData ?? []) as Array<{ code: string; weight: number }>

  if (dims.length === 0) return { ok: false, error: 'dimensoes_ausentes' }
  if (responseIds.length < a.k_anonymity_min) {
    return { ok: false, error: 'abaixo_k_anonymity' }
  }

  const dimensionWeights = Object.fromEntries(
    dims.map((d) => [d.code, Number(d.weight ?? 1.0)]),
  ) as Record<string, number>

  let answers: Nr01ResponseAnswer[] = []
  if (responseIds.length > 0) {
    const { data: ansData } = await db
      .from('nr01_response_answers')
      .select('*')
      .in('response_id', responseIds)
    answers = (ansData ?? []) as Nr01ResponseAnswer[]
  }

  await db.from('nr01_assessments').update({ status: 'PROCESSANDO' } as never).eq('id', input.assessmentId)

  const result = computeScoring({
    questions,
    answers,
    responseCount: responseIds.length,
    kAnonymityMin: a.k_anonymity_min,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dimensionWeights: dimensionWeights as any,
  })

  for (const ds of result.dimensions) {
    await db
      .from('nr01_dimension_scores')
      .upsert(
        {
          assessment_id: input.assessmentId,
          dimension_code: ds.dimension_code,
          score_pct: ds.score_pct ?? 0,
          risk_level: ds.risk_level,
          mean_likert: ds.mean_likert,
          median_likert: ds.median_likert,
          stddev_likert: ds.stddev_likert,
          n_respondents: ds.n_respondents,
          anchor_items: ds.anchor_items,
        } as never,
        { onConflict: 'assessment_id,dimension_code' },
      )
  }

  const adherencePct =
    responseIds.length > 0 ? (responseIds.length / Math.max(responseIds.length, 1)) * 100 : 0

  await db.from('nr01_assessment_results').upsert(
    {
      assessment_id: input.assessmentId,
      iso_score: result.iso_score ?? 0,
      iso_risk_level: result.iso_risk_level,
      total_invites: 0,
      total_responses: responseIds.length,
      adherence_pct: adherencePct,
      ic_weight: 1.0,
    } as never,
    { onConflict: 'assessment_id' },
  )

  await db
    .from('nr01_assessments')
    .update({
      status: 'CONCLUIDO',
      ...rtSnapshot,
    } as never)
    .eq('id', input.assessmentId)

  await db.from('nr01_audit_log').insert({
    assessment_id: input.assessmentId,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    event_type: 'RESULTS_PROCESSED',
    payload: {
      iso_score: result.iso_score,
      iso_risk_level: result.iso_risk_level,
      n_respondents: result.n_respondents,
      weights_applied: dimensionWeights,
      methodology_version: 'v1.1',
      instrument_version: a.instrument_version,
      auto_provisioned: input.autoProvisioned ?? false,
    },
  } as never)

  return {
    ok: true,
    iso_score: result.iso_score,
    iso_risk_level: result.iso_risk_level,
    n_respondents: result.n_respondents,
  }
}
