/**
 * QUANTUM5G — NR-01 · Sugestão automática de ações para o plano PDCA
 *
 * A partir dos scores por dimensão, busca intervenções aplicáveis
 * na biblioteca curada (nr01_intervention_library).
 *
 * Heurística de prioridade:
 *   - Dimensão crítica   → P1, prazo 30 dias
 *   - Dimensão elevada   → P1, prazo 60 dias
 *   - Dimensão atenção   → P2, prazo 90 dias
 *   - Demais             → não sugere
 *
 * Filtra por compatibilidade de risk_level + porte (default: 'qualquer').
 */

import {
  Nr01ActionPriority,
  Nr01DimensionScore,
  Nr01Intervention,
  Nr01RiskLevel,
} from '@/types/nr01'

export interface SuggestedAction {
  dimension_code: string
  intervention_id: string
  intervention_code: string
  title: string
  description: string
  priority: Nr01ActionPriority
  due_in_days: number
  estimated_cost_brl: number | null
  kpi: string
}

const RISK_TO_PRIORITY: Record<Nr01RiskLevel, { priority: Nr01ActionPriority | null; days: number }> = {
  critico:     { priority: 'P1', days: 30 },
  elevado:     { priority: 'P1', days: 60 },
  atencao:     { priority: 'P2', days: 90 },
  baixo:       { priority: null, days: 0 },
  muito_baixo: { priority: null, days: 0 },
  sem_dados:   { priority: null, days: 0 },
}

const COST_BAND_TO_BRL: Record<NonNullable<Nr01Intervention['cost_band']>, number> = {
  baixo: 5000,
  medio: 25000,
  alto:  80000,
}

export function suggestActionsFromScores(
  scores: Nr01DimensionScore[],
  library: Nr01Intervention[],
): SuggestedAction[] {
  const out: SuggestedAction[] = []

  for (const score of scores) {
    const cfg = RISK_TO_PRIORITY[score.risk_level]
    if (!cfg.priority) continue

    const candidates = library.filter(
      (lib) =>
        lib.dimension_code === score.dimension_code &&
        lib.is_active &&
        lib.applicable_levels.includes(score.risk_level),
    )

    // Top 2 por dimensão (evita avalanche): impacto esperado descendente,
    // critério de desempate: custo menor primeiro.
    const ranked = candidates
      .sort((a, b) => {
        const ai = a.expected_impact_pct ?? 0
        const bi = b.expected_impact_pct ?? 0
        if (ai !== bi) return bi - ai
        const ac = a.cost_band ? COST_BAND_TO_BRL[a.cost_band] : 0
        const bc = b.cost_band ? COST_BAND_TO_BRL[b.cost_band] : 0
        return ac - bc
      })
      .slice(0, 2)

    for (const lib of ranked) {
      out.push({
        dimension_code: score.dimension_code,
        intervention_id: lib.id,
        intervention_code: lib.code,
        title: lib.title,
        description: lib.description,
        priority: cfg.priority,
        due_in_days: cfg.days,
        estimated_cost_brl: lib.cost_band ? COST_BAND_TO_BRL[lib.cost_band] : null,
        kpi: `Reduzir score de risco em ${lib.expected_impact_pct ?? 10} p.p. em ${lib.typical_duration_days ?? 60} dias`,
      })
    }
  }

  return out
}
