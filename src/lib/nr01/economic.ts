/**
 * QUANTUM5G — Módulo NR-01 | Motor Econômico
 *
 * Calcula os 7 vetores econômicos:
 *   V1 multas MTE  | V2 afastamentos CID-F | V3 turnover  | V4 produtividade
 *   V5 FAP         | V6 contencioso        | V7 reputação (proxy)
 *
 * Saída em 3 cenários: NÃO AGIR / AGIR PARCIAL / AGIR INTEGRAL
 * + projeção 36 meses + ROI/payback.
 *
 * Referências: NR-01/GRO + portaria MTE 1419/2024 + 765/2025.
 * Os valores-base e premissas são editáveis em DEFAULT_ASSUMPTIONS abaixo.
 */

import {
  Nr01EconomicAssumptions,
  Nr01EconomicInputs,
  Nr01RiskLevel,
} from '@/types/nr01'

// ============================================================
// PREMISSAS PADRÃO
// ============================================================

/**
 * Premissas econômicas canônicas (DIESEE / ISMA-BR / INSS, médias 2024-2025).
 * Arredondadas — não fingem precisão que não existe.
 */
export const DEFAULT_ASSUMPTIONS: Nr01EconomicAssumptions = {
  fines_per_worker_brl: 3354.0,        // mediana entre R$ 1.610,12 e R$ 6.708,08
  fines_severity_multiplier: 1.0,      // 1.0 = cenário provável (sobreposto pelo ISO)
  absence_cost_per_day_brl: 302.0,     // 4500 × 1,68 (encargos) × 1,20 (retrabalho) / 30
  turnover_cost_multiplier: 1.5,       // 1,5× salário anual por colaborador perdido
  productivity_gain_pct: 25.0,         // alinhado com Decisão 1: redução 25% nos vetores
  fap_reduction_pp: 0.30,
  expected_absence_reduction_pct: 25.0,
  expected_turnover_reduction_pct: 25.0,
}

/**
 * Defaults canônicos para INPUTS do cliente quando não há histórico declarado.
 * Usados pelo dashboard /economico para pré-preencher o form.
 */
export const DEFAULT_CLIENT_INPUTS = {
  avg_monthly_salary_brl: 4500,        // mediana CLT formal (DIEESE 2024)
  encargos_multiplier: 1.68,           // CLT padrão (INSS+FGTS+13º+férias provisionados)
  cid_f_absence_rate_pct: 4.0,         // 4% pessoas-ano (ISMA-BR)
  voluntary_turnover_pct: 18.0,        // turnover voluntário (Robert Half BR 2024)
  rat_aliquot_pct: 2.0,                // RAT médio
  fap_multiplier: 1.0,                 // neutro
  avg_absence_days: 90.0,              // média licença CID F (INSS)
  /** % anual da folha alocada ao programa NR-01 (default conservador). */
  program_cost_pct_of_payroll: 1.0,
} as const

/**
 * Confiança por vetor — usada no dashboard para sinalizar quais entram com
 * fórmula auditável e quais ainda são proxy/roadmap.
 */
export const VECTOR_CONFIDENCE: Record<keyof NoActionVectors, 'production' | 'roadmap'> = {
  v1_fines_brl:             'production',
  v2_absence_brl:           'production',
  v3_turnover_brl:          'production',
  v4_productivity_loss_brl: 'production',
  v5_fap_extra_brl:         'roadmap',
  v6_litigation_brl:        'roadmap',
  v7_reputation_proxy_brl:  'roadmap',
  total_brl:                'production',
}

// ============================================================
// MULTIPLICADOR DE EXPOSIÇÃO POR ISO
// ISO baixo (risco alto) → mais provável de pegar multa agravada.
// ============================================================

/**
 * Multiplicador de severidade aplicado às multas potenciais a partir do
 * ISO. Patch 005: ISO agora é média Likert (1-5), não score 0-100.
 * Maior ISO = mais risco (alinhado com NR01_GRO).
 */
function severityFromIso(isoScore: number | null): number {
  if (isoScore == null) return 1.0
  if (isoScore >= 4.3) return 4.00     // crítico → cenário agravado
  if (isoScore >= 3.5) return 2.00     // elevado → cenário provável-agravado
  if (isoScore >= 2.7) return 1.00     // atenção → cenário provável
  if (isoScore >= 1.9) return 0.50     // baixo → exposição reduzida
  return 0.20                          // muito baixo → mínima
}

// ============================================================
// VETORES ECONÔMICOS — 1 ano (cenário NÃO AGIR)
// ============================================================

export interface NoActionVectors {
  v1_fines_brl: number
  v2_absence_brl: number
  v3_turnover_brl: number
  v4_productivity_loss_brl: number
  v5_fap_extra_brl: number
  v6_litigation_brl: number
  v7_reputation_proxy_brl: number
  total_brl: number
}

export function computeNoActionVectors(
  inputs: Nr01EconomicInputs,
  isoScore: number | null,
  isoRiskLevel: Nr01RiskLevel,
  assumptions: Nr01EconomicAssumptions = DEFAULT_ASSUMPTIONS,
): NoActionVectors {
  const severity = severityFromIso(isoScore)

  // V1 — multas MTE
  const v1 =
    inputs.total_workers *
    assumptions.fines_per_worker_brl *
    severity

  // V2 — custo de afastamentos CID-F (anualizado)
  const v2 =
    inputs.cid_f_absences_last_year *
    inputs.avg_absence_days *
    assumptions.absence_cost_per_day_brl

  // V3 — turnover voluntário atribuível ao psicossocial
  // Patch 005: ISO em escala Likert 1-5; cutoff = 2.7 (zona de atenção+).
  const baselineAttribution = isoScore != null && isoScore >= 2.7 ? 0.55 : 0.35
  const annualSalary = inputs.avg_monthly_salary_brl * 13.33
  const turnoverWorkers = (inputs.total_workers * inputs.voluntary_turnover_pct) / 100
  const v3 = turnoverWorkers * baselineAttribution * annualSalary * assumptions.turnover_cost_multiplier

  // V4 — produtividade perdida (presenteísmo)
  const presenteismFactor = isoRiskLevel === 'critico' ? 0.12
                          : isoRiskLevel === 'elevado' ? 0.08
                          : isoRiskLevel === 'atencao' ? 0.05
                          : 0.02
  const v4 = inputs.total_payroll_brl_year * presenteismFactor

  // V5 — FAP extra (penalização previdenciária)
  // Cada 1 p.p. extra de RAT custa: payroll * 1% / ano
  const fapExtraPp =
    isoRiskLevel === 'critico' ? 0.5
    : isoRiskLevel === 'elevado' ? 0.3
    : isoRiskLevel === 'atencao' ? 0.1
    : 0.0
  const v5 = inputs.total_payroll_brl_year * (fapExtraPp / 100)

  // V6 — contencioso esperado
  const lawsuitProbability =
    isoRiskLevel === 'critico' ? 0.35
    : isoRiskLevel === 'elevado' ? 0.20
    : isoRiskLevel === 'atencao' ? 0.10
    : 0.03
  const expectedLawsuits = (inputs.cid_f_absences_last_year * lawsuitProbability)
  const v6 = expectedLawsuits * Math.max(inputs.avg_lawsuit_provision_brl, 120000)

  // V7 — reputação (proxy: % adicional sobre turnover por dificuldade de recrutar)
  const v7 = v3 * 0.15

  const total = v1 + v2 + v3 + v4 + v5 + v6 + v7
  return {
    v1_fines_brl: round2(v1),
    v2_absence_brl: round2(v2),
    v3_turnover_brl: round2(v3),
    v4_productivity_loss_brl: round2(v4),
    v5_fap_extra_brl: round2(v5),
    v6_litigation_brl: round2(v6),
    v7_reputation_proxy_brl: round2(v7),
    total_brl: round2(total),
  }
}

// ============================================================
// CENÁRIOS DE AÇÃO
// ============================================================

export interface ActionScenario {
  total_savings_brl: number
  program_cost_brl: number
  net_brl: number
}

export function computeActionScenario(
  noAction: NoActionVectors,
  inputs: Nr01EconomicInputs,
  intensity: 'parcial' | 'integral',
  assumptions: Nr01EconomicAssumptions = DEFAULT_ASSUMPTIONS,
): ActionScenario {
  // Cenário parcial captura ~50% dos benefícios; integral, ~85%
  const captureRate = intensity === 'parcial' ? 0.50 : 0.85

  // Multas: integral evita 100% (conformidade); parcial, 60%
  const finesAvoided = noAction.v1_fines_brl * (intensity === 'integral' ? 1.0 : 0.60)

  // Afastamentos CID-F
  const absenceReduction = (assumptions.expected_absence_reduction_pct / 100) * captureRate
  const absenceSavings = noAction.v2_absence_brl * absenceReduction

  // Turnover
  const turnoverReduction = (assumptions.expected_turnover_reduction_pct / 100) * captureRate
  const turnoverSavings = noAction.v3_turnover_brl * turnoverReduction

  // Produtividade — ganho aplicado à folha
  const prodGain = inputs.total_payroll_brl_year * (assumptions.productivity_gain_pct / 100) * captureRate

  // FAP — reduz parcialmente (defasado)
  const fapSavings = noAction.v5_fap_extra_brl * captureRate

  // Litigância
  const litigSavings = noAction.v6_litigation_brl * captureRate

  // Reputação — proporcional ao turnover evitado
  const reputationSavings = noAction.v7_reputation_proxy_brl * captureRate

  const totalSavings =
    finesAvoided + absenceSavings + turnoverSavings + prodGain + fapSavings + litigSavings + reputationSavings

  // Custo do programa: parcial = 50% do anual orçado; integral = 100%
  const programCost = inputs.program_annual_cost_brl * (intensity === 'parcial' ? 0.50 : 1.00)

  return {
    total_savings_brl: round2(totalSavings),
    program_cost_brl: round2(programCost),
    net_brl: round2(totalSavings - programCost),
  }
}

// ============================================================
// PROJEÇÃO 3 ANOS
// ============================================================

export interface ThreeYearProjection {
  total_savings_brl: number
  total_cost_brl: number
  roi_pct: number | null
}

export function computeThreeYearProjection(
  yearOne: ActionScenario,
  inputs: Nr01EconomicInputs,
): ThreeYearProjection {
  // Y1 = ano de implantação (~85% do potencial); Y2 = 100%; Y3 = 105% (efeito composto)
  const y1Savings = yearOne.total_savings_brl
  const y2Savings = y1Savings * 1.10        // ganhos de FAP estabilizados
  const y3Savings = y1Savings * 1.20        // efeito cultural

  const y1Cost = yearOne.program_cost_brl
  const y2Cost = inputs.program_annual_cost_brl * 0.85   // custo decrescente
  const y3Cost = inputs.program_annual_cost_brl * 0.75

  const totalSavings = y1Savings + y2Savings + y3Savings
  const totalCost = y1Cost + y2Cost + y3Cost
  const roi = totalCost > 0 ? ((totalSavings - totalCost) / totalCost) * 100 : null

  return {
    total_savings_brl: round2(totalSavings),
    total_cost_brl: round2(totalCost),
    roi_pct: roi != null ? round2(roi) : null,
  }
}

// ============================================================
// ROI + PAYBACK 12 MESES
// ============================================================

export function computeRoiAndPayback(scenario: ActionScenario): {
  roi_pct: number | null
  payback_months: number | null
} {
  if (scenario.program_cost_brl <= 0) {
    return { roi_pct: null, payback_months: null }
  }
  const roi = ((scenario.total_savings_brl - scenario.program_cost_brl) / scenario.program_cost_brl) * 100
  const monthlyNet = scenario.net_brl / 12
  const payback = monthlyNet > 0 ? scenario.program_cost_brl / monthlyNet : null
  return {
    roi_pct: round2(roi),
    payback_months: payback != null ? round2(payback) : null,
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL — orquestra os 3 cenários
// ============================================================

export interface FullEconomicProjection {
  noAction: NoActionVectors
  partial: ActionScenario
  integral: ActionScenario & { roi_pct: number | null; payback_months: number | null }
  threeYear: ThreeYearProjection
  assumptions: Nr01EconomicAssumptions
}

export function computeFullProjection(
  inputs: Nr01EconomicInputs,
  isoScore: number | null,
  isoRiskLevel: Nr01RiskLevel,
  assumptions: Nr01EconomicAssumptions = DEFAULT_ASSUMPTIONS,
): FullEconomicProjection {
  const noAction = computeNoActionVectors(inputs, isoScore, isoRiskLevel, assumptions)
  const partial = computeActionScenario(noAction, inputs, 'parcial', assumptions)
  const integralBase = computeActionScenario(noAction, inputs, 'integral', assumptions)
  const { roi_pct, payback_months } = computeRoiAndPayback(integralBase)
  const threeYear = computeThreeYearProjection(integralBase, inputs)

  return {
    noAction,
    partial,
    integral: { ...integralBase, roi_pct, payback_months },
    threeYear,
    assumptions,
  }
}

// ============================================================
// HELPERS
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

export function formatBrl(value: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    maximumFractionDigits: 0,
  }).format(value)
}
