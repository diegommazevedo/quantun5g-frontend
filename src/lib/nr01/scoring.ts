/**
 * QUANTUM5G — Módulo NR-01 | Motor de Cálculo
 *
 * Converte respostas Likert 1-5 em scores 0-100 por dimensão,
 * detecta alertas sistêmicos e calcula o ISO global.
 *
 * Princípios:
 * - Resposta Likert 1-5; reverse_scored invertido (6 - v) ANTES da agregação.
 * - score_pct = ((mean - 1) / 4) * 100  → 0..100, onde 100 = mais saudável.
 * - risk_level via thresholds em src/types/nr01.ts.
 * - k-anonymity ≥ assessment.k_anonymity_min — abaixo disso retorna sem_dados.
 * - ISO global = média ponderada dos scores das dimensões com dados.
 */

import {
  classifyRisk,
  Nr01AnchorItem,
  Nr01DimensionCode,
  Nr01Question,
  Nr01ResponseAnswer,
  Nr01RiskLevel,
  Nr01SystemicAlert,
  NR01_DIMENSION_CODES,
} from '@/types/nr01'

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
  systemic_alerts: Nr01SystemicAlert[]
  n_respondents: number
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

function normalize(meanLikert: number): number {
  // 1..5 → 0..100
  return ((meanLikert - 1) / 4) * 100
}

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
  const score = normalize(mean)

  // anchor_items: top 3 questões com PIOR média (já invertidas)
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
  const anchors = perQMeans.sort((a, b) => a.mean - b.mean).slice(0, 3)

  return {
    dimension_code: dimensionCode,
    score_pct: round2(score),
    risk_level: classifyRisk(score, responseCount),
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
    const w = weights[d.dimension_code] ?? 1.0
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
// ALERTAS SISTÊMICOS
// ============================================================

export function detectSystemicAlerts(dimensions: DimensionScoreResult[]): Nr01SystemicAlert[] {
  const alerts: Nr01SystemicAlert[] = []
  const byCode = new Map(dimensions.map((d) => [d.dimension_code, d]))

  // Pré-burnout: carga + saúde + emocional simultaneamente em risco
  const carga = byCode.get('carga_trabalho')
  const saude = byCode.get('saude_bem_estar')
  const emo = byCode.get('exigencias_emocionais')
  if (
    carga?.risk_level && ['elevado', 'critico'].includes(carga.risk_level) &&
    saude?.risk_level && ['elevado', 'critico'].includes(saude.risk_level) &&
    emo?.risk_level && ['atencao', 'elevado', 'critico'].includes(emo.risk_level)
  ) {
    alerts.push({
      tipo: 'PRE_BURNOUT',
      descricao:
        'Combinação Carga + Saúde + Exigências Emocionais sinaliza risco coletivo de burnout.',
      severidade: 'critico',
      dimensoes: ['carga_trabalho', 'saude_bem_estar', 'exigencias_emocionais'],
    })
  }

  // Intenção de saída: reconhecimento + clima caindo juntos
  const recon = byCode.get('reconhecimento')
  const clima = byCode.get('relacoes_interpessoais')
  if (
    recon?.risk_level && ['elevado', 'critico'].includes(recon.risk_level) &&
    clima?.risk_level && ['elevado', 'critico'].includes(clima.risk_level)
  ) {
    alerts.push({
      tipo: 'INTENCAO_SAIDA',
      descricao:
        'Queda simultânea em Reconhecimento e Clima — risco aumentado de turnover voluntário.',
      severidade: 'atencao',
      dimensoes: ['reconhecimento', 'relacoes_interpessoais'],
    })
  }

  // Risco de assédio: dimensão crítica isolada → flag jurídico imediato
  const assedio = byCode.get('assedio_violencia')
  if (assedio?.risk_level === 'critico' || assedio?.risk_level === 'elevado') {
    alerts.push({
      tipo: 'RISCO_ASSEDIO',
      descricao:
        'Dimensão Assédio/Violência em risco — acionar protocolo da Lei 14.457/2022 imediatamente.',
      severidade: 'critico',
      dimensoes: ['assedio_violencia'],
    })
  }

  // Gap de liderança: liderança + organização caindo juntos
  const lider = byCode.get('lideranca_gestao')
  const org = byCode.get('organizacao_trabalho')
  if (
    lider?.risk_level && ['elevado', 'critico'].includes(lider.risk_level) &&
    org?.risk_level && ['elevado', 'critico'].includes(org.risk_level)
  ) {
    alerts.push({
      tipo: 'GAP_LIDERANCA',
      descricao:
        'Liderança + Organização do trabalho em risco — sintoma estrutural de gestão.',
      severidade: 'atencao',
      dimensoes: ['lideranca_gestao', 'organizacao_trabalho'],
    })
  }

  // Bolha sistêmica: 3+ dimensões em elevado/critico
  const inRisk = dimensions.filter(
    (d) => d.risk_level === 'elevado' || d.risk_level === 'critico',
  )
  if (inRisk.length >= 3) {
    alerts.push({
      tipo: 'BOLHA_SISTEMICA',
      descricao: `${inRisk.length} dimensões NR-01 em risco elevado/crítico — risco psicossocial sistêmico.`,
      severidade: 'critico',
      dimensoes: inRisk.map((d) => d.dimension_code),
    })
  }

  return alerts
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export function computeScoring(input: ScoringInput): ScoringResult {
  const dimensions = NR01_DIMENSION_CODES.map((code) =>
    scoreDimension(code, input.questions, input.answers, input.responseCount, input.kAnonymityMin),
  )
  const iso = computeIso(dimensions, input.dimensionWeights)
  const alerts = detectSystemicAlerts(dimensions)
  return {
    dimensions,
    iso_score: iso.iso_score,
    iso_risk_level: iso.iso_risk_level,
    systemic_alerts: alerts,
    n_respondents: input.responseCount,
  }
}
