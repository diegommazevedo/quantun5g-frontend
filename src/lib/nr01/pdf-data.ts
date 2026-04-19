/**
 * QUANTUM5G — Loader único do laudo NR-01 (PDF + tela print)
 *
 * Carrega tudo que o documento técnico precisa em uma única função pura.
 * Recebe um Supabase client (qualquer caminho de auth — SSR ou service role)
 * e devolve um snapshot tipado.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'
import type {
  Nr01ActionItem,
  Nr01ActionPlan,
  Nr01Assessment,
  Nr01AssessmentResult,
  Nr01Dimension,
  Nr01DimensionScore,
  Nr01EconomicInputs,
  Nr01EconomicProjection,
  Nr01EvidencePack,
  Nr01PulseConfig,
  Nr01PulseDispatch,
} from '@/types/nr01'

export interface LaudoData {
  assessment: Nr01Assessment & {
    companies: { id: string; name: string; total_collaborators: number } | null
    technical_lead: { name: string | null; email: string | null } | null
  }
  result: Nr01AssessmentResult | null
  dimensions: Nr01Dimension[]
  dimensionScores: Nr01DimensionScore[]
  evidencePack: Nr01EvidencePack | null
  actionPlan: Nr01ActionPlan | null
  actionItems: Nr01ActionItem[]
  economic: {
    inputs: Nr01EconomicInputs | null
    projection: Nr01EconomicProjection | null
  }
  pulse: {
    config: Nr01PulseConfig | null
    weeksDispatched: number
    lastDispatch: Nr01PulseDispatch | null
  }
  generatedAt: string
}

export async function loadLaudoData(
  supabase: SupabaseClient<Database>,
  assessmentId: string,
): Promise<LaudoData | null> {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const sb = supabase as any

  const { data: assessmentRow } = await sb
    .from('nr01_assessments')
    .select(`
      *,
      companies:companies!nr01_assessments_company_id_fkey ( id, name, total_collaborators )
    `)
    .eq('id', assessmentId)
    .single()
  if (!assessmentRow) return null

  // Lead técnico (se existir)
  let technical_lead: LaudoData['assessment']['technical_lead'] = null
  if (assessmentRow.technical_lead_id) {
    const { data: leadRow } = await sb
      .from('profiles')
      .select('name, email')
      .eq('id', assessmentRow.technical_lead_id)
      .single()
    if (leadRow) technical_lead = leadRow
  }

  const [
    { data: result },
    { data: dimensions },
    { data: scores },
    { data: pack },
    { data: planRow },
    { data: ecoInputs },
    { data: ecoProj },
    { data: pulseConfig },
    { data: lastDispatch },
  ] = await Promise.all([
    sb.from('nr01_assessment_results').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_dimensions').select('*').order('ord'),
    sb.from('nr01_dimension_scores').select('*').eq('assessment_id', assessmentId).order('dimension_code'),
    sb.from('nr01_evidence_pack').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_action_plans').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_economic_inputs').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_economic_projections').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_pulse_config').select('*').eq('assessment_id', assessmentId).maybeSingle(),
    sb.from('nr01_pulse_dispatches')
      .select('*')
      .eq('assessment_id', assessmentId)
      .order('week_number', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  let actionItems: Nr01ActionItem[] = []
  if (planRow) {
    const { data: itemsData } = await sb
      .from('nr01_action_items')
      .select('*')
      .eq('action_plan_id', planRow.id)
      .order('priority')
      .order('due_date')
    actionItems = (itemsData ?? []) as Nr01ActionItem[]
  }

  return {
    assessment: { ...assessmentRow, technical_lead } as LaudoData['assessment'],
    result: result as Nr01AssessmentResult | null,
    dimensions: (dimensions ?? []) as Nr01Dimension[],
    dimensionScores: (scores ?? []) as Nr01DimensionScore[],
    evidencePack: pack as Nr01EvidencePack | null,
    actionPlan: planRow as Nr01ActionPlan | null,
    actionItems,
    economic: {
      inputs: ecoInputs as Nr01EconomicInputs | null,
      projection: ecoProj as Nr01EconomicProjection | null,
    },
    pulse: {
      config: pulseConfig as Nr01PulseConfig | null,
      weeksDispatched: (pulseConfig as Nr01PulseConfig | null)?.weeks_dispatched ?? 0,
      lastDispatch: lastDispatch as Nr01PulseDispatch | null,
    },
    generatedAt: new Date().toISOString(),
  }
}
