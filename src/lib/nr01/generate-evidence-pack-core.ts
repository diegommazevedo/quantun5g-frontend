/**
 * Gera pacote de evidências NR-01 — reutilizável em actions e automação pós-k.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import {
  hashInstrument,
  hashLaudosOficiais,
  hashPack,
  hashResponse,
  METHODOLOGY_TEXT_V1_1,
} from '@/lib/nr01/evidence'
import { snapshotTechnicalLeadPayload } from '@/lib/nr01/technical-lead'
import type { Nr01Question, Nr01Response, Nr01ResponseAnswer } from '@/types/nr01'

export interface GenerateEvidencePackInput {
  assessmentId: string
  actorId: string | null
  actorRole: string
  autoProvisioned?: boolean
}

export interface GenerateEvidencePackOutput {
  ok: boolean
  error?: string
  pack_sha256?: string
  skipped?: boolean
}

export async function generateEvidencePackCore(
  db: SupabaseClient,
  input: GenerateEvidencePackInput,
): Promise<GenerateEvidencePackOutput> {
  const { data: existing } = await db
    .from('nr01_evidence_pack')
    .select('id, pack_sha256')
    .eq('assessment_id', input.assessmentId)
    .maybeSingle()

  if (existing?.id) {
    return {
      ok: true,
      skipped: true,
      pack_sha256: (existing as { pack_sha256: string }).pack_sha256,
    }
  }

  const { data: a } = await db
    .from('nr01_assessments')
    .select(
      `
      id, instrument_version, technical_lead_crp, technical_lead_name, technical_lead_profession,
      company_id, collection_opens_at, collection_closes_at, expected_respondents,
      companies:companies!nr01_assessments_company_id_fkey (
        technical_lead_name, technical_lead_crp, technical_lead_profession
      )
    `,
    )
    .eq('id', input.assessmentId)
    .maybeSingle()

  if (!a) return { ok: false, error: 'avaliacao_nao_encontrada' }

  const ass = a as unknown as {
    id: string
    instrument_version: string
    technical_lead_crp: string | null
    technical_lead_name: string | null
    technical_lead_profession: string | null
    company_id: string
    collection_opens_at: string | null
    collection_closes_at: string | null
    expected_respondents: number
    companies:
      | {
          technical_lead_name: string | null
          technical_lead_crp: string | null
          technical_lead_profession: string | null
        }
      | {
          technical_lead_name: string | null
          technical_lead_crp: string | null
          technical_lead_profession: string | null
        }[]
      | null
  }

  const companyRow = Array.isArray(ass.companies) ? ass.companies[0] ?? null : ass.companies

  const rtSnapshot = snapshotTechnicalLeadPayload({
    technical_lead_name: ass.technical_lead_name ?? companyRow?.technical_lead_name,
    technical_lead_crp: ass.technical_lead_crp ?? companyRow?.technical_lead_crp,
    technical_lead_profession: ass.technical_lead_profession ?? companyRow?.technical_lead_profession,
  })

  const leadName = rtSnapshot.technical_lead_name ?? 'Responsável técnico'
  const leadCrp = rtSnapshot.technical_lead_crp ?? null

  const [{ data: qData }, { data: respData }] = await Promise.all([
    db
      .from('nr01_questions')
      .select('*')
      .eq('instrument_version', ass.instrument_version)
      .eq('is_active', true),
    db.from('nr01_responses').select('*').eq('assessment_id', input.assessmentId),
  ])

  const questions = (qData ?? []) as Nr01Question[]
  const responses = (respData ?? []) as Nr01Response[]

  let answers: Nr01ResponseAnswer[] = []
  if (responses.length > 0) {
    const { data: ansData } = await db
      .from('nr01_response_answers')
      .select('*')
      .in(
        'response_id',
        responses.map((r) => r.id),
      )
    answers = (ansData ?? []) as Nr01ResponseAnswer[]
  }

  const instrumentSha = hashInstrument(questions, ass.instrument_version)
  const laudosSha = await hashLaudosOficiais(db, ass.instrument_version)
  const responseHashes = responses.map((r) => hashResponse(r, answers))
  const adherencePct =
    ass.expected_respondents > 0 ? (responses.length / ass.expected_respondents) * 100 : 0

  const startedAt =
    ass.collection_opens_at ?? responses[0]?.submitted_at ?? new Date().toISOString()
  const endedAt =
    ass.collection_closes_at ?? responses[responses.length - 1]?.submitted_at ?? new Date().toISOString()

  const packSha = hashPack({
    assessmentId: input.assessmentId,
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

  const { error } = await db.from('nr01_evidence_pack').insert({
    assessment_id: input.assessmentId,
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
    laudos_pack_sha256: laudosSha,
  } as never)

  if (error) return { ok: false, error: error.message }

  await db.from('nr01_audit_log').insert({
    assessment_id: input.assessmentId,
    actor_id: input.actorId,
    actor_role: input.actorRole,
    event_type: 'EVIDENCE_PACK_GENERATED',
    payload: {
      pack_sha256: packSha,
      instrument_sha256: instrumentSha,
      laudos_pack_sha256: laudosSha,
      n_responses: responses.length,
      auto_provisioned: input.autoProvisioned ?? false,
    },
  } as never)

  return { ok: true, pack_sha256: packSha }
}
