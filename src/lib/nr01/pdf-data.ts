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
import {
  resolveTechnicalLeadForLaudo,
  type TechnicalLeadDisplay,
} from '@/lib/nr01/technical-lead'

export interface LaudoTexto {
  texto_principal: string
  texto_recomendacao: string
}

export interface LaudoData {
  assessment: Nr01Assessment & {
    companies: {
      id: string
      name: string
      total_collaborators: number
      technical_lead_name?: string | null
      technical_lead_crp?: string | null
      technical_lead_profession?: string | null
      technical_lead_email?: string | null
    } | null
    technical_lead: TechnicalLeadDisplay
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
  // Patch 008: laudos oficiais para renderização no PDF
  laudoTextos: Map<string, LaudoTexto>          // key = `${dim}::${nivel}`
  laudoMacrosByLevel: Map<string, LaudoTexto>   // key = nivel_risco
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
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )
    `)
    .eq('id', assessmentId)
    .single()
  if (!assessmentRow) return null

  const companyRow = assessmentRow.companies as LaudoData['assessment']['companies']

  const instrumentVer = assessmentRow.instrument_version ?? 'v1.1'
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
    { data: laudoMicros },
    { data: laudoMacros },
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
    sb.from('nr01_laudo_textos')
      .select('dimension_code, nivel_risco, texto_principal, texto_recomendacao')
      .eq('instrument_version', instrumentVer)
      .eq('is_active', true),
    sb.from('nr01_laudo_macros')
      .select('nivel_risco, texto_principal, texto_recomendacao')
      .eq('instrument_version', instrumentVer)
      .eq('is_active', true),
  ])

  // Constrói os Maps de laudos para lookup eficiente no template
  const laudoTextos = new Map<string, LaudoTexto>()
  for (const l of (laudoMicros ?? []) as Array<{
    dimension_code: string
    nivel_risco: string
    texto_principal: string
    texto_recomendacao: string
  }>) {
    laudoTextos.set(`${l.dimension_code}::${l.nivel_risco}`, {
      texto_principal: l.texto_principal,
      texto_recomendacao: l.texto_recomendacao,
    })
  }

  const laudoMacrosByLevel = new Map<string, LaudoTexto>()
  for (const l of (laudoMacros ?? []) as Array<{
    nivel_risco: string
    texto_principal: string
    texto_recomendacao: string
  }>) {
    laudoMacrosByLevel.set(l.nivel_risco, {
      texto_principal: l.texto_principal,
      texto_recomendacao: l.texto_recomendacao,
    })
  }

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
    assessment: {
      ...assessmentRow,
      companies: companyRow,
      technical_lead: resolveTechnicalLeadForLaudo({
        assessment: assessmentRow,
        company: companyRow,
        evidencePack: pack as Nr01EvidencePack | null,
      }),
    } as LaudoData['assessment'],
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
    laudoTextos,
    laudoMacrosByLevel,
    pulse: {
      config: pulseConfig as Nr01PulseConfig | null,
      weeksDispatched: (pulseConfig as Nr01PulseConfig | null)?.weeks_dispatched ?? 0,
      lastDispatch: lastDispatch as Nr01PulseDispatch | null,
    },
    generatedAt: new Date().toISOString(),
  }
}
