'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import { computeHybridReport, sha256Payload } from '@/lib/hybrid/compute'
import { HYBRID_CROSSWALK_VERSION } from '@/lib/hybrid/crosswalk'
import type { Dimensao, DiagnosticResult, Laudo } from '@/types/database'
import type {
  Nr01Assessment,
  Nr01AssessmentResult,
  Nr01DimensionScore,
  Nr01Intervention,
} from '@/types/nr01'
import type { HybridFecundatedAction, HybridReportPayload, PentagramaInputForHybrid } from '@/types/hybrid'
import { pdcaPhaseForItemStatus } from '@/lib/nr01/plan-pdca'
import type { Nr01ActionStatus } from '@/types/nr01'

const PENT_READY = ['ENCERRADO', 'RELATORIO_GERADO'] as const

async function loadAssessment(assessmentId: string) {
  const { db, user, assessment } = await ensureNr01AssessmentAccess(
    assessmentId,
    `
      *,
      companies:companies!nr01_assessments_company_id_fkey (name)
    `,
  )

  const a = assessment as unknown as Nr01Assessment & {
    companies: { name: string } | null
    linked_diagnostic_id: string | null
  }

  return { supabase: db, user, assessment: a }
}

export async function gerarDevolutivaHibrida(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const seedPlano = formData.get('seed_plano') === '1'

  const { supabase, user, assessment: a } = await loadAssessment(assessmentId)

  if (a.status !== 'CONCLUIDO') {
    redirect(`/nr01/avaliacao/${assessmentId}/hibrido?error=${encodeURIComponent('Processe a avaliação NR-01 antes da devolutiva híbrida.')}`)
  }

  const diagId = a.linked_diagnostic_id
  if (!diagId) {
    redirect(`/nr01/avaliacao/${assessmentId}?error=${encodeURIComponent('Vincule um diagnóstico Pentagrama na criação da avaliação.')}`)
  }

  const [{ data: diag }, { data: result }, { data: scores }, { data: lib }, { data: nrResult }] =
    await Promise.all([
      supabase.from('diagnostics').select('id, name, status').eq('id', diagId).single(),
      supabase.from('diagnostic_results').select('*').eq('diagnostic_id', diagId).maybeSingle(),
      supabase.from('nr01_dimension_scores').select('*').eq('assessment_id', assessmentId),
      supabase.from('nr01_intervention_library').select('*').eq('is_active', true),
      supabase.from('nr01_assessment_results').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    ])

  if (!diag || !PENT_READY.includes((diag as { status: string }).status as typeof PENT_READY[number])) {
    redirect(`/nr01/avaliacao/${assessmentId}/hibrido?error=${encodeURIComponent('Diagnóstico Pentagrama deve estar encerrado com relatório calculado.')}`)
  }

  const pentResult = result as DiagnosticResult | null
  if (!pentResult) {
    redirect(`/nr01/avaliacao/${assessmentId}/hibrido?error=${encodeURIComponent('Motor Pentagrama ainda não calculou o diagnóstico vinculado.')}`)
  }

  const laudoIds = [
    pentResult.laudo_fisica_id,
    pentResult.laudo_afetiva_id,
    pentResult.laudo_racional_id,
    pentResult.laudo_social_id,
    pentResult.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } = laudoIds.length
    ? await supabase.from('laudos').select('dimensao, texto').in('id', laudoIds)
    : { data: [] as Laudo[] }

  const laudos: Partial<Record<Dimensao, string>> = {}
  for (const l of (laudosRows ?? []) as Pick<Laudo, 'dimensao' | 'texto'>[]) {
    laudos[l.dimensao] = l.texto
  }

  const pent: PentagramaInputForHybrid = {
    diagnostic_id: diagId,
    diagnostic_name: (diag as { name: string }).name,
    status: (diag as { status: string }).status,
    result: pentResult,
    laudos,
  }

  const payload: HybridReportPayload = computeHybridReport({
    companyName: a.companies?.name ?? 'Empresa',
    assessmentName: a.name,
    assessmentResult: (nrResult as Nr01AssessmentResult | null) ?? null,
    scores: (scores ?? []) as Nr01DimensionScore[],
    library: (lib ?? []) as Nr01Intervention[],
    pentagrama: pent,
  })

  const hash = sha256Payload(payload)

  const { error: upsertErr } = await supabase.from('hybrid_reports').upsert(
    {
      assessment_id: assessmentId,
      diagnostic_id: diagId,
      crosswalk_version: HYBRID_CROSSWALK_VERSION,
      payload,
      payload_sha256: hash,
      generated_at: payload.generated_at,
      generated_by: user.id,
    } as never,
    { onConflict: 'assessment_id' },
  )

  if (upsertErr) {
    redirect(`/nr01/avaliacao/${assessmentId}/hibrido?error=${encodeURIComponent(upsertErr.message)}`)
  }

  if (seedPlano && payload.plano_fecundado.length > 0) {
    await seedPlanoFecundado(supabase, assessmentId, user.id, payload.plano_fecundado)
  }

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: 'consultant',
    event_type: 'HYBRID_REPORT_GENERATED',
    payload: { diagnostic_id: diagId, sha256: hash.slice(0, 16), n_actions: payload.plano_fecundado.length },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}`)
  revalidatePath(`/nr01/avaliacao/${assessmentId}/hibrido`)
  revalidatePath(`/nr01/avaliacao/${assessmentId}/plano`)
  redirect(`/nr01/avaliacao/${assessmentId}/hibrido`)
}

async function seedPlanoFecundado(
  supabase: SupabaseClient,
  assessmentId: string,
  userId: string,
  plano: HybridFecundatedAction[],
) {
  const { data: existing } = await supabase
    .from('nr01_action_plans')
    .select('id')
    .eq('assessment_id', assessmentId)
    .maybeSingle()

  let planId = (existing as { id: string } | null)?.id
  if (!planId) {
    const { data: created, error: planErr } = await supabase
      .from('nr01_action_plans')
      .insert({ assessment_id: assessmentId, status: 'rascunho' } as never)
      .select('id')
      .single()
    if (planErr || !created) return
    planId = (created as { id: string }).id
  }

  const { data: existingItems } = await supabase
    .from('nr01_action_items')
    .select('intervention_id')
    .eq('action_plan_id', planId)
  const existingIds = new Set(
    ((existingItems ?? []) as Array<{ intervention_id: string | null }>)
      .map((i) => i.intervention_id)
      .filter(Boolean),
  )

  const today = new Date()
  const toInsert = plano
    .filter((p) => !existingIds.has(p.intervention_id))
    .map((p) => {
      const due = new Date(today)
      due.setDate(due.getDate() + p.due_in_days)
      return {
        action_plan_id: planId,
        dimension_code: p.dimension_code,
        intervention_id: p.intervention_id,
        owner_name: 'A definir',
        title: p.title,
        description: p.description,
        kpi: p.kpi,
        due_date: due.toISOString().split('T')[0],
        priority: p.priority,
        estimated_cost_brl: p.estimated_cost_brl,
        status: 'pendente' as Nr01ActionStatus,
        pdca_phase: pdcaPhaseForItemStatus('pendente'),
        baseline_score_pct: p.baseline_score_pct,
        rollout_steps: p.rollout_steps,
        check_notes: {},
      }
    })

  if (toInsert.length > 0) {
    await supabase.from('nr01_action_items').insert(toInsert as never)
    await supabase.from('nr01_audit_log').insert({
      assessment_id: assessmentId,
      actor_id: userId,
      actor_role: 'consultant',
      event_type: 'HYBRID_PLAN_SEEDED',
      payload: { n_added: toInsert.length },
    } as never)
  }
}
