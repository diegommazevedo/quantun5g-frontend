/**
 * Encerra coleta, processa resultados e gera pacote de evidências quando k-anonymity
 * é atingido — apenas avaliações self-service (auto_provisioned).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { generateEvidencePackCore } from '@/lib/nr01/generate-evidence-pack-core'
import { processAssessmentResultsCore } from '@/lib/nr01/process-assessment-results-core'

export interface AutoCompleteOnKResult {
  triggered: boolean
  completed: boolean
  responseCount: number
  kMin: number
  skippedReason?: string
  iso_score?: number | null
  evidencePack?: boolean
}

async function isSelfServiceAssessment(assessmentId: string): Promise<boolean> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('nr01_audit_log')
    .select('payload')
    .eq('assessment_id', assessmentId)
    .eq('event_type', 'ASSESSMENT_CREATED')
    .order('created_at', { ascending: true })
    .limit(1)
    .maybeSingle()

  const payload = data?.payload as Record<string, unknown> | null
  return payload?.auto_provisioned === true
}

async function resolveActorForAssessment(companyId: string): Promise<string | null> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('companies')
    .select('account_user_id')
    .eq('id', companyId)
    .maybeSingle()
  return (data as { account_user_id: string | null } | null)?.account_user_id ?? null
}

export async function maybeAutoCompleteOnKThreshold(
  assessmentId: string,
): Promise<AutoCompleteOnKResult> {
  const base = { triggered: false, completed: false, responseCount: 0, kMin: 5 }

  if (!(await isSelfServiceAssessment(assessmentId))) {
    return { ...base, skippedReason: 'nao_self_service' }
  }

  const admin = createServiceRoleAdmin()

  const { data: assess } = await admin
    .from('nr01_assessments')
    .select('id, status, k_anonymity_min, company_id')
    .eq('id', assessmentId)
    .maybeSingle()

  if (!assess) return { ...base, skippedReason: 'avaliacao_nao_encontrada' }

  const a = assess as {
    id: string
    status: string
    k_anonymity_min: number
    company_id: string
  }

  if (a.status === 'CONCLUIDO') {
    return { ...base, kMin: a.k_anonymity_min, skippedReason: 'ja_concluida' }
  }

  if (a.status !== 'COLETANDO') {
    return { ...base, kMin: a.k_anonymity_min, skippedReason: `status_${a.status}` }
  }

  const { count } = await admin
    .from('nr01_responses')
    .select('id', { count: 'exact', head: true })
    .eq('assessment_id', assessmentId)

  const responseCount = count ?? 0
  if (responseCount < a.k_anonymity_min) {
    return { ...base, responseCount, kMin: a.k_anonymity_min, skippedReason: 'abaixo_k' }
  }

  const { data: closed } = await admin
    .from('nr01_assessments')
    .update({ status: 'COLETA_ENCERRADA' } as never)
    .eq('id', assessmentId)
    .eq('status', 'COLETANDO')
    .select('id')
    .maybeSingle()

  if (!closed?.id) {
    return {
      ...base,
      triggered: true,
      responseCount,
      kMin: a.k_anonymity_min,
      skippedReason: 'race_ou_ja_encerrada',
    }
  }

  const actorId = await resolveActorForAssessment(a.company_id)

  await admin.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: actorId,
    actor_role: 'contratante',
    event_type: 'COLLECTION_CLOSED',
    payload: { auto_provisioned: true, response_count: responseCount },
  } as never)

  const processed = await processAssessmentResultsCore(admin, {
    assessmentId,
    actorId,
    actorRole: 'contratante',
    autoProvisioned: true,
  })

  if (!processed.ok) {
    console.error('[auto-complete-k] processamento falhou:', processed.error, assessmentId)
    return {
      triggered: true,
      completed: false,
      responseCount,
      kMin: a.k_anonymity_min,
      skippedReason: processed.error,
    }
  }

  const evidence = await generateEvidencePackCore(admin, {
    assessmentId,
    actorId,
    actorRole: 'contratante',
    autoProvisioned: true,
  })

  await admin.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: actorId,
    actor_role: 'contratante',
    event_type: 'AUTO_COMPLETED_ON_K',
    payload: {
      response_count: responseCount,
      k_anonymity_min: a.k_anonymity_min,
      iso_score: processed.iso_score,
      iso_risk_level: processed.iso_risk_level,
      evidence_pack: evidence.ok,
      pack_sha256: evidence.pack_sha256 ?? null,
    },
  } as never)

  console.info('[auto-complete-k] laudo automático concluído', {
    assessmentId,
    responseCount,
    iso_score: processed.iso_score,
  })

  return {
    triggered: true,
    completed: true,
    responseCount,
    kMin: a.k_anonymity_min,
    iso_score: processed.iso_score,
    evidencePack: evidence.ok,
  }
}
