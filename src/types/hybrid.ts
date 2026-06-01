/**
 * QUANTUM5G — Devolutiva híbrida Pentagrama × NR-01 (sem LLM)
 */

import type { Dimensao, DimensaoNivel, DiagnosticResult } from '@/types/database'
import type { Nr01DimensionCode, Nr01RiskLevel } from '@/types/nr01'
import type { SuggestedAction } from '@/lib/nr01/plan-suggestions'

export type HybridSignalType =
  | 'TENSAO'
  | 'FACHADA'
  | 'REFORCO'
  | 'ALINHADO_RISCO'
  | 'SEM_DADOS_PENTAGRAMA'

export type HybridHorizon = 'curto' | 'medio' | 'longo'

export interface HybridCrosswalkLink {
  pentagrama: Dimensao
  nr01: Nr01DimensionCode
  weight: number
}

export interface HybridCrosswalkConfig {
  version: string
  author: string
  pentagrama_dimensions: Dimensao[]
  links: HybridCrosswalkLink[]
  signal_thresholds: {
    gap_negativo_pct: number
    pentagrama_stress_niveis: DimensaoNivel[]
    nr01_stress_levels: Nr01RiskLevel[]
  }
}

export interface PentagramaDimSnapshot {
  dimensao: Dimensao
  ic_pct: number | null
  il_pct: number | null
  combined_pct: number | null
  gap_pct: number | null
  nivel_ic: DimensaoNivel | null
  laudo_excerpt: string | null
}

export interface HybridDimensionSignal {
  nr01_code: Nr01DimensionCode
  nr01_risk: Nr01RiskLevel
  nr01_score_pct: number | null
  signal: HybridSignalType
  pentagrama_dims: Dimensao[]
  narrative: string
  horizon: HybridHorizon
}

export interface HybridFecundatedAction extends SuggestedAction {
  hybrid_rank: number
  hybrid_signal: HybridSignalType
  horizon: HybridHorizon
  contexto_vivido: string | null
  pentagrama_dims: Dimensao[]
}

export interface HybridReportPayload {
  version: string
  crosswalk_version: string
  generated_at: string
  company_name: string
  assessment_name: string
  diagnostic_name: string
  iso_score: number | null
  iso_risk_level: Nr01RiskLevel
  pentagrama_global_combined: number | null
  pentagrama_n_ic: number | null
  executive_brief: {
    avaliativo: string
    corretivo: string
    executivo: string
    horizontes: { curto: string; medio: string; longo: string }
  }
  signals: HybridDimensionSignal[]
  plano_fecundado: HybridFecundatedAction[]
  top_priorities: string[]
}

export interface HybridReportRow {
  id: string
  assessment_id: string
  diagnostic_id: string
  crosswalk_version: string
  payload: HybridReportPayload
  payload_sha256: string
  generated_at: string
  generated_by: string | null
}

export type PentagramaInputForHybrid = {
  diagnostic_id: string
  diagnostic_name: string
  status: string
  result: DiagnosticResult
  laudos: Partial<Record<Dimensao, string>>
}
