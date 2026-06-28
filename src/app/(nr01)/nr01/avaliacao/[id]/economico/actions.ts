'use server'

/**
 * QUANTUM5G — NR-01 · Server Action do dashboard econômico
 *
 * Salva inputs do cliente, roda o motor (computeFullProjection),
 * persiste a projeção e revalida a página.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { ensureNr01AssessmentAccess } from '@/lib/nr01/assessment-access'
import { computeFullProjection, DEFAULT_ASSUMPTIONS } from '@/lib/nr01/economic'
import {
  Nr01AssessmentResult,
  Nr01EconomicInputs,
} from '@/types/nr01'

async function ensureOwnership(assessmentId: string) {
  const { db, user, role, assessment } = await ensureNr01AssessmentAccess(
    assessmentId,
    'id, consultant_id, status',
  )
  return { supabase: db, user, role, assessment: assessment as { id: string; consultant_id: string; status: string } }
}

export async function recalcularEconomico(formData: FormData) {
  const assessmentId = formData.get('assessment_id') as string
  const { supabase, user, role, assessment } = await ensureOwnership(assessmentId)

  if (assessment.status !== 'CONCLUIDO') {
    redirect(`/nr01/avaliacao/${assessmentId}/economico?error=Processe+os+resultados+antes.`)
  }

  const totalWorkers   = Math.max(1, parseInt(formData.get('total_workers') as string) || 0)
  const monthlySalary  = Math.max(0, parseFloat(formData.get('avg_monthly_salary_brl') as string) || 0)
  const cidFAbsences   = Math.max(0, parseInt(formData.get('cid_f_absences_last_year') as string) || 0)
  const avgAbsenceDays = Math.max(0, parseFloat(formData.get('avg_absence_days') as string) || 0)
  const turnoverPct    = Math.max(0, parseFloat(formData.get('voluntary_turnover_pct') as string) || 0)
  const ratAliquotRaw  = parseFloat(formData.get('rat_aliquot_pct') as string) || 1.0
  const ratAliquot     = ([1.0, 2.0, 3.0].includes(ratAliquotRaw) ? ratAliquotRaw : 2.0)
  const fapMultiplier  = Math.max(0.5, Math.min(2.0, parseFloat(formData.get('fap_multiplier') as string) || 1.0))
  const programCost    = Math.max(0, parseFloat(formData.get('program_annual_cost_brl') as string) || 0)

  // UPSERT inputs
  const { error: errInputs } = await supabase
    .from('nr01_economic_inputs')
    .upsert(
      {
        assessment_id: assessmentId,
        total_workers: totalWorkers,
        avg_monthly_salary_brl: monthlySalary,
        cid_f_absences_last_year: cidFAbsences,
        avg_absence_days: avgAbsenceDays,
        voluntary_turnover_pct: turnoverPct,
        rat_aliquot_pct: ratAliquot,
        fap_multiplier: fapMultiplier,
        active_lawsuits: 0,
        avg_lawsuit_provision_brl: 0,
        program_annual_cost_brl: programCost,
      } as never,
      { onConflict: 'assessment_id' },
    )
  if (errInputs) {
    redirect(`/nr01/avaliacao/${assessmentId}/economico?error=${encodeURIComponent('Erro ao salvar inputs: ' + errInputs.message)}`)
  }

  // Carrega inputs já com o total_payroll_brl_year calculado pela coluna generated
  const { data: inputsData } = await supabase
    .from('nr01_economic_inputs')
    .select('*')
    .eq('assessment_id', assessmentId)
    .single()
  if (!inputsData) {
    redirect(`/nr01/avaliacao/${assessmentId}/economico?error=Falha+ao+carregar+inputs+rec%C3%A9m-salvos.`)
  }
  const inputs = inputsData as unknown as Nr01EconomicInputs

  // Carrega ISO do result
  const { data: resData } = await supabase
    .from('nr01_assessment_results')
    .select('iso_score, iso_risk_level')
    .eq('assessment_id', assessmentId)
    .single()
  const r = resData as Pick<Nr01AssessmentResult, 'iso_score' | 'iso_risk_level'> | null

  // Roda o motor
  const proj = computeFullProjection(
    inputs,
    r?.iso_score ?? null,
    r?.iso_risk_level ?? 'sem_dados',
    DEFAULT_ASSUMPTIONS,
  )

  // Persiste projeção
  await supabase
    .from('nr01_economic_projections')
    .upsert(
      {
        assessment_id: assessmentId,
        na_fines_exposure_brl:     proj.noAction.v1_fines_brl,
        na_absence_cost_brl:       proj.noAction.v2_absence_brl,
        na_turnover_cost_brl:      proj.noAction.v3_turnover_brl,
        na_productivity_loss_brl:  proj.noAction.v4_productivity_loss_brl,
        na_fap_extra_cost_brl:     proj.noAction.v5_fap_extra_brl,
        na_litigation_risk_brl:    proj.noAction.v6_litigation_brl,
        na_total_brl:              proj.noAction.total_brl,
        ap_total_savings_brl:      proj.partial.total_savings_brl,
        ap_program_cost_brl:       proj.partial.program_cost_brl,
        ap_net_brl:                proj.partial.net_brl,
        ai_total_savings_brl:      proj.integral.total_savings_brl,
        ai_program_cost_brl:       proj.integral.program_cost_brl,
        ai_net_brl:                proj.integral.net_brl,
        ai_roi_pct:                proj.integral.roi_pct,
        ai_payback_months:         proj.integral.payback_months,
        ai_3y_total_savings_brl:   proj.threeYear.total_savings_brl,
        ai_3y_total_cost_brl:      proj.threeYear.total_cost_brl,
        ai_3y_roi_pct:             proj.threeYear.roi_pct,
        assumptions:               proj.assumptions,
      } as never,
      { onConflict: 'assessment_id' },
    )

  await supabase.from('nr01_audit_log').insert({
    assessment_id: assessmentId,
    actor_id: user.id,
    actor_role: role,
    event_type: 'ECONOMIC_RECALCULATED',
    payload: {
      iso: r?.iso_score,
      total_workers: totalWorkers,
      na_total: proj.noAction.total_brl,
      ai_net: proj.integral.net_brl,
    },
  } as never)

  revalidatePath(`/nr01/avaliacao/${assessmentId}/economico`)
  redirect(`/nr01/avaliacao/${assessmentId}/economico`)
}
