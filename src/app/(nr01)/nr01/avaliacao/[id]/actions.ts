'use server'

/**
 * QUANTUM5G — NR-01 · Actions da página de avaliação
 * Abrir/encerrar coleta, processar resultados, gerar pacote de evidências.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import {
  Nr01Question,
  Nr01Response,
  Nr01ResponseAnswer,
} from '@/types/nr01'
import { computeScoring } from '@/lib/nr01/scoring'
import {
  hashInstrument,
  hashLaudosOficiais,
  hashPack,
  hashResponse,
  METHODOLOGY_TEXT_V1_1,
} from '@/lib/nr01/evidence'
import {
  snapshotTechnicalLeadPayload,
  type CompanyTechnicalLeadSource,
} from '@/lib/nr01/technical-lead'

async function ensureOwnership(assessmentId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data, error } = await supabase
    .from('nr01_assessments')
    .select('id, consultant_id')
    .eq('id', assessmentId)
    .single()
  if (error || !data) redirect('/nr01/dashboard')
  return { supabase, user, assessment: data as { id: string; consultant_id: string } }
}

// ============================================================
// ABRIR COLETA
// ============================================================
export async function abrirColeta(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user } = await ensureOwnership(id)

  await supabase
    .from('nr01_assessments')
    .update({ status: 'COLETANDO' } as never)
    .eq('id', id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'COLLECTION_OPENED',
    payload: {},
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// ENCERRAR COLETA
// ============================================================
export async function encerrarColeta(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user } = await ensureOwnership(id)

  await supabase
    .from('nr01_assessments')
    .update({ status: 'COLETA_ENCERRADA' } as never)
    .eq('id', id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'COLLECTION_CLOSED',
    payload: {},
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// PROCESSAR RESULTADOS
// ============================================================
export async function processarResultados(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user } = await ensureOwnership(id)

  // Carrega avaliação completa
  const { data: assessment } = await supabase
    .from('nr01_assessments')
    .select('id, company_id, instrument_version, k_anonymity_min')
    .eq('id', id)
    .single()
  if (!assessment) redirect('/nr01/dashboard')
  const a = assessment as { id: string; company_id: string; instrument_version: string; k_anonymity_min: number }

  const { data: companyRowRaw } = await supabase
    .from('companies')
    .select('technical_lead_name, technical_lead_crp, technical_lead_profession')
    .eq('id', a.company_id)
    .single()
  const companyRow = companyRowRaw as CompanyTechnicalLeadSource | null
  if (!companyRow?.technical_lead_name?.trim() || !companyRow?.technical_lead_crp?.trim()) {
    redirect(
      `/empresas/${a.company_id}?error=${encodeURIComponent('Cadastre o responsável técnico assinante (RT) na empresa antes de processar.')}&retorno=/nr01/avaliacao/${id}`,
    )
  }
  const rtSnapshot = snapshotTechnicalLeadPayload(companyRow)

  // Carrega questões + respostas + pesos por dimensão (P013: uniformes 1.00 no DB)
  const [{ data: questionsData }, { data: responsesData }, { data: dimsData }] = await Promise.all([
    supabase
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', a.instrument_version)
      .eq('is_active', true),
    supabase.from('nr01_responses').select('id').eq('assessment_id', id),
    supabase.from('nr01_dimensions').select('code, weight'),
  ])
  const questions = (questionsData ?? []) as Nr01Question[]
  const responseIds = (responsesData ?? []).map((r) => (r as { id: string }).id)

  // P013: pesos por dimensão vêm do catálogo; metodologia oficial = 1.00 para todas
  const dims = (dimsData ?? []) as Array<{ code: string; weight: number }>
  if (dims.length === 0) {
    redirect(`/nr01/avaliacao/${id}?error=${encodeURIComponent('Falha ao carregar pesos das dimensões NR-01')}`)
  }
  const dimensionWeights = Object.fromEntries(
    dims.map((d) => [d.code, Number(d.weight ?? 1.0)]),
  ) as Record<string, number>

  let answers: Nr01ResponseAnswer[] = []
  if (responseIds.length > 0) {
    const { data: ansData } = await supabase
      .from('nr01_response_answers')
      .select('*')
      .in('response_id', responseIds)
    answers = (ansData ?? []) as Nr01ResponseAnswer[]
  }

  // Atualiza status para PROCESSANDO
  await supabase.from('nr01_assessments').update({ status: 'PROCESSANDO' } as never).eq('id', id)

  // Roda o motor (ISO = média com pesos do DB; pós-P013 todos 1.00)
  const result = computeScoring({
    questions,
    answers,
    responseCount: responseIds.length,
    kAnonymityMin: a.k_anonymity_min,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    dimensionWeights: dimensionWeights as any,
  })

  // Persiste dimension_scores (upsert)
  for (const ds of result.dimensions) {
    await supabase
      .from('nr01_dimension_scores')
      .upsert(
        {
          assessment_id: id,
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

  // Persiste assessment_results
  const adherencePct = responseIds.length > 0 && result.n_respondents >= 0
    ? (responseIds.length / Math.max(responseIds.length, 1)) * 100
    : 0

  await supabase
    .from('nr01_assessment_results')
    .upsert(
      {
        assessment_id: id,
        iso_score: result.iso_score ?? 0,
        iso_risk_level: result.iso_risk_level,
        total_invites: 0,
        total_responses: responseIds.length,
        adherence_pct: adherencePct,
        ic_weight: 1.00,
      } as never,
      { onConflict: 'assessment_id' },
    )

  // Conclui e congela RT assinante no snapshot da avaliação (laudo/PDF)
  await supabase
    .from('nr01_assessments')
    .update({
      status: 'CONCLUIDO',
      ...rtSnapshot,
    } as never)
    .eq('id', id)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'RESULTS_PROCESSED',
    payload: {
      iso_score: result.iso_score,
      iso_risk_level: result.iso_risk_level,
      n_respondents: result.n_respondents,
      // P006/P007/P013: trilha auditável dos pesos + metodologia oficial v1.1
      weights_applied: dimensionWeights,
      methodology_version: 'v1.1',
      instrument_version: a.instrument_version,
    },
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}

// ============================================================
// GERAR PACOTE DE EVIDÊNCIAS
// ============================================================
export async function gerarPacoteEvidencias(formData: FormData) {
  const id = formData.get('assessment_id') as string
  const { supabase, user } = await ensureOwnership(id)

  const { data: a } = await supabase
    .from('nr01_assessments')
    .select(`
      id, instrument_version, technical_lead_crp, technical_lead_name, technical_lead_profession,
      company_id, collection_opens_at, collection_closes_at, expected_respondents,
      companies:companies!nr01_assessments_company_id_fkey (
        technical_lead_name, technical_lead_crp, technical_lead_profession
      )
    `)
    .eq('id', id)
    .single()
  if (!a) redirect('/nr01/dashboard')
  const ass = a as {
    id: string
    instrument_version: string
    technical_lead_crp: string | null
    technical_lead_name: string | null
    technical_lead_profession: string | null
    company_id: string
    collection_opens_at: string | null
    collection_closes_at: string | null
    expected_respondents: number
    companies: {
      technical_lead_name: string | null
      technical_lead_crp: string | null
      technical_lead_profession: string | null
    } | null
  }

  const rtSnapshot = snapshotTechnicalLeadPayload({
    technical_lead_name: ass.technical_lead_name ?? ass.companies?.technical_lead_name,
    technical_lead_crp: ass.technical_lead_crp ?? ass.companies?.technical_lead_crp,
    technical_lead_profession:
      ass.technical_lead_profession ?? ass.companies?.technical_lead_profession,
  })
  const leadName = rtSnapshot.technical_lead_name ?? 'Responsável técnico'
  const leadCrp = rtSnapshot.technical_lead_crp ?? null

  // Carrega questões + respostas para hash
  const [{ data: qData }, { data: respData }] = await Promise.all([
    supabase.from('nr01_questions').select('*').eq('instrument_version', ass.instrument_version).eq('is_active', true),
    supabase.from('nr01_responses').select('*').eq('assessment_id', id),
  ])
  const questions = (qData ?? []) as Nr01Question[]
  const responses = (respData ?? []) as Nr01Response[]

  let answers: Nr01ResponseAnswer[] = []
  if (responses.length > 0) {
    const { data: ansData } = await supabase
      .from('nr01_response_answers')
      .select('*')
      .in('response_id', responses.map((r) => r.id))
    answers = (ansData ?? []) as Nr01ResponseAnswer[]
  }

  const instrumentSha = hashInstrument(questions, ass.instrument_version)
  // Patch 008: hash dos laudos oficiais vigentes na avaliação
  const laudosSha = await hashLaudosOficiais(supabase, ass.instrument_version)
  const responseHashes = responses.map((r) => hashResponse(r, answers))
  const adherencePct = ass.expected_respondents > 0
    ? (responses.length / ass.expected_respondents) * 100
    : 0

  const startedAt = ass.collection_opens_at ?? responses[0]?.submitted_at ?? new Date().toISOString()
  const endedAt = ass.collection_closes_at ?? responses[responses.length - 1]?.submitted_at ?? new Date().toISOString()

  const packSha = hashPack({
    assessmentId: id,
    instrumentSha256: instrumentSha,
    collectionStartedAt: startedAt,
    collectionEndedAt: endedAt,
    totalInvitesSent: ass.expected_respondents,
    totalResponsesComplete: responses.length,
    adherencePct,
    methodologyText: METHODOLOGY_TEXT_V1_1,
    methodologyVersion: 'v1.1',
    technicalLeadName: leadName,
    technicalLeadCrp: leadCrp,
    responseHashes,
  })

  await supabase.from('nr01_evidence_pack').insert({
    assessment_id: id,
    instrument_sha256: instrumentSha,
    collection_started_at: startedAt,
    collection_ended_at: endedAt,
    total_invites_sent: ass.expected_respondents,
    total_responses_complete: responses.length,
    adherence_pct: adherencePct,
    methodology_text: METHODOLOGY_TEXT_V1_1,
    methodology_version: 'v1.1',
    technical_lead_name: leadName,
    technical_lead_crp: leadCrp,
    pack_sha256: packSha,
    // Patch 008: hash dos laudos oficiais vigentes
    laudos_pack_sha256: laudosSha,
  } as never)

  await supabase.from('nr01_audit_log').insert({
    assessment_id: id,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'EVIDENCE_PACK_GENERATED',
    payload: {
      pack_sha256: packSha,
      instrument_sha256: instrumentSha,
      laudos_pack_sha256: laudosSha,
      n_responses: responses.length,
    },
  } as never)

  revalidatePath(`/nr01/avaliacao/${id}`)
  redirect(`/nr01/avaliacao/${id}`)
}
