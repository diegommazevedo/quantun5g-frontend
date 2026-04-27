/**
 * QUANTUM5G — Módulo NR-01 | Motor de Cálculo
 *
 * Opera nativamente em escala Likert 1-5 (conforme NR01_GRO.docx) e calcula o ISO global.
 *
 * Princípios (Patch 005, 2026-04-19):
 * - Escala nativa: Likert 1-5. MAIOR valor = MAIOR risco (doc:27).
 * - reverse_scored: questões em sentido positivo são invertidas (6 - v)
 *   ANTES da agregação para que o eixo do score fique consistente
 *   com a orientação oficial do doc.
 * - score_pct (no DB) passa a armazenar a média Likert (1.0 a 5.0),
 *   NÃO escala 0-100. Compatibilidade preservada: a constraint
 *   `CHECK (score_pct BETWEEN 0 AND 100)` continua válida porque
 *   1-5 ⊂ [0, 100].
 * - risk_level via thresholds em src/types/nr01.ts (NR01_RISK_THRESHOLDS_LIKERT).
 * - k-anonymity ≥ assessment.k_anonymity_min — abaixo disso retorna sem_dados.
 * - ISO global = média das médias Likert das dimensões com dados (P013: peso
 *   uniforme 1,00 por dimensão; criticidade por assédio/violência nos laudos,
 *   não na fórmula).
 */

import {
  classifyRisk,
  Nr01AnchorItem,
  Nr01DimensionCode,
  Nr01Question,
  Nr01ResponseAnswer,
  Nr01RiskLevel,
  NR01_DIMENSION_CODES,
} from '@/types/nr01'

/** P013: peso oficial por dimensão no ISO (uniforme; fonte no DB `nr01_dimensions.weight`). */
export const NR01_ISO_WEIGHT_PER_DIMENSION = 1.0 as const

// ============================================================
// TIPOS DE ENTRADA
// ============================================================

export interface ScoringInput {
  questions: Nr01Question[]
  answers: Nr01ResponseAnswer[]      // todas as respostas item-a-item da avaliação
  responseCount: number              // total de respondentes únicos
  kAnonymityMin: number              // mínimo para liberar score (default 5)
  dimensionWeights?: Partial<Record<Nr01DimensionCode, number>>
}

export interface DimensionScoreResult {
  dimension_code: Nr01DimensionCode
  score_pct: number | null
  risk_level: Nr01RiskLevel
  mean_likert: number | null
  median_likert: number | null
  stddev_likert: number | null
  n_respondents: number
  anchor_items: Nr01AnchorItem[]
}

export interface ScoringResult {
  dimensions: DimensionScoreResult[]
  iso_score: number | null
  iso_risk_level: Nr01RiskLevel
  n_respondents: number
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function median(arr: number[]): number {
  if (arr.length === 0) return 0
  const sorted = [...arr].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid]
}

function stddev(arr: number[]): number {
  if (arr.length < 2) return 0
  const m = arr.reduce((a, b) => a + b, 0) / arr.length
  const v = arr.reduce((s, x) => s + (x - m) ** 2, 0) / (arr.length - 1)
  return Math.sqrt(v)
}

// ============================================================
// CÁLCULO POR DIMENSÃO
// ============================================================

export function scoreDimension(
  dimensionCode: Nr01DimensionCode,
  questions: Nr01Question[],
  answers: Nr01ResponseAnswer[],
  responseCount: number,
  kAnonymityMin: number,
): DimensionScoreResult {
  const dimQuestions = questions.filter((q) => q.dimension_code === dimensionCode)
  const qIndex = new Map(dimQuestions.map((q) => [q.id, q]))
  const dimAnswers = answers.filter((a) => qIndex.has(a.question_id))

  if (responseCount < kAnonymityMin || dimAnswers.length === 0) {
    return {
      dimension_code: dimensionCode,
      score_pct: null,
      risk_level: 'sem_dados',
      mean_likert: null,
      median_likert: null,
      stddev_likert: null,
      n_respondents: responseCount,
      anchor_items: [],
    }
  }

  // Aplica inversão para reverse_scored
  const normalized = dimAnswers.map((a) => {
    const q = qIndex.get(a.question_id)!
    return q.reverse_scored ? 6 - a.value : a.value
  })

  const mean = normalized.reduce((s, v) => s + v, 0) / normalized.length
  const med = median(normalized)
  const sd = stddev(normalized)

  // anchor_items: top 3 questões com PIOR média (em escala Likert; após
  // inversão, "pior" = mais alto = mais risco)
  const perQ: Map<string, number[]> = new Map()
  for (const a of dimAnswers) {
    const q = qIndex.get(a.question_id)!
    const v = q.reverse_scored ? 6 - a.value : a.value
    if (!perQ.has(q.id)) perQ.set(q.id, [])
    perQ.get(q.id)!.push(v)
  }
  const perQMeans = Array.from(perQ.entries()).map(([qid, values]) => {
    const q = qIndex.get(qid)!
    return {
      question_id: qid,
      text: q.text,
      ord: q.ord,
      mean: values.reduce((s, x) => s + x, 0) / values.length,
    } satisfies Nr01AnchorItem
  })
  // ordenação descendente: pior (mais risco) primeiro
  const anchors = perQMeans.sort((a, b) => b.mean - a.mean).slice(0, 3)

  return {
    dimension_code: dimensionCode,
    // score_pct agora armazena a média Likert (1.0 a 5.0), não escala 0-100.
    // Mantido o nome do campo por compatibilidade de schema (CHECK 0-100 OK).
    score_pct: round2(mean),
    risk_level: classifyRisk(mean, responseCount),
    mean_likert: round2(mean),
    median_likert: round2(med),
    stddev_likert: round2(sd),
    n_respondents: responseCount,
    anchor_items: anchors,
  }
}

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

// ============================================================
// ISO GLOBAL
// ============================================================

export function computeIso(
  dimensions: DimensionScoreResult[],
  weights: Partial<Record<Nr01DimensionCode, number>> = {},
): { iso_score: number | null; iso_risk_level: Nr01RiskLevel } {
  const valid = dimensions.filter((d) => d.score_pct != null)
  if (valid.length === 0) return { iso_score: null, iso_risk_level: 'sem_dados' }

  let weightedSum = 0
  let weightTotal = 0
  for (const d of valid) {
    const w = weights[d.dimension_code] ?? NR01_ISO_WEIGHT_PER_DIMENSION
    weightedSum += (d.score_pct ?? 0) * w
    weightTotal += w
  }
  const iso = weightTotal > 0 ? weightedSum / weightTotal : 0
  return {
    iso_score: round2(iso),
    iso_risk_level: classifyRisk(iso, valid[0].n_respondents),
  }
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export function computeScoring(input: ScoringInput): ScoringResult {
  const dimensions = NR01_DIMENSION_CODES.map((code) =>
    scoreDimension(code, input.questions, input.answers, input.responseCount, input.kAnonymityMin),
  )
  const iso = computeIso(dimensions, input.dimensionWeights)
  return {
    dimensions,
    iso_score: iso.iso_score,
    iso_risk_level: iso.iso_risk_level,
    n_respondents: input.responseCount,
  }
}
