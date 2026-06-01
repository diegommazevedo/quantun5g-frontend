/**
 * Motor determinístico — devolutiva híbrida Pentagrama × NR-01 (sem LLM).
 */

import { createHash } from 'crypto'
import type { Dimensao, DimensaoNivel } from '@/types/database'
import { suggestActionsFromScores } from '@/lib/nr01/plan-suggestions'
import type { SuggestedAction } from '@/lib/nr01/plan-suggestions'
import {
  NR01_DIMENSION_LABEL,
  type Nr01AssessmentResult,
  type Nr01DimensionScore,
  type Nr01Intervention,
  type Nr01RiskLevel,
} from '@/types/nr01'
import { getCrosswalk, HYBRID_CROSSWALK_VERSION, linksForNr01Dim } from './crosswalk'
import type {
  HybridDimensionSignal,
  HybridFecundatedAction,
  HybridHorizon,
  HybridReportPayload,
  HybridSignalType,
  PentagramaDimSnapshot,
  PentagramaInputForHybrid,
} from '@/types/hybrid'

const DIMS: Dimensao[] = ['fisica', 'afetiva', 'racional', 'social', 'cultural']
const MAX_PLANO_ITEMS = 12

const DIM_LABEL_PT: Record<Dimensao, string> = {
  fisica: 'Física',
  afetiva: 'Afetiva',
  racional: 'Racional',
  social: 'Social',
  cultural: 'Cultural',
  indisponivel: '—',
}

function pentagramaSnapshots(
  input: PentagramaInputForHybrid,
): PentagramaDimSnapshot[] {
  const r = input.result
  return DIMS.map((d) => {
    const key = d as 'fisica' | 'afetiva' | 'racional' | 'social' | 'cultural'
    return {
      dimensao: d,
      ic_pct: r[`ic_${key}_pct` as keyof typeof r] as number | null,
      il_pct: r[`il_${key}_pct` as keyof typeof r] as number | null,
      combined_pct: r[`combined_${key}_pct` as keyof typeof r] as number | null,
      gap_pct: r[`gap_${key}` as keyof typeof r] as number | null,
      nivel_ic: r[`nivel_ic_${key}` as keyof typeof r] as DimensaoNivel | null,
      laudo_excerpt: excerpt(input.laudos[d], 280),
    }
  })
}

function excerpt(text: string | undefined, max: number): string | null {
  if (!text?.trim()) return null
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length <= max ? t : `${t.slice(0, max - 1)}…`
}

function isPentStress(nivel: DimensaoNivel | null): boolean {
  const cfg = getCrosswalk()
  return nivel != null && cfg.signal_thresholds.pentagrama_stress_niveis.includes(nivel)
}

function isNrStress(risk: Nr01RiskLevel): boolean {
  const cfg = getCrosswalk()
  return cfg.signal_thresholds.nr01_stress_levels.includes(risk)
}

function worstPentForNr01(
  code: Nr01DimensionScore['dimension_code'],
  snaps: PentagramaDimSnapshot[],
): { stress: boolean; gapNeg: boolean; dims: Dimensao[] } {
  const links = linksForNr01Dim(code)
  const dims = links.map((l) => l.pentagrama)
  let stress = false
  let gapNeg = false
  const thr = getCrosswalk().signal_thresholds.gap_negativo_pct

  for (const link of links) {
    const snap = snaps.find((s) => s.dimensao === link.pentagrama)
    if (!snap) continue
    if (isPentStress(snap.nivel_ic)) stress = true
    if (snap.gap_pct != null && snap.gap_pct <= thr) gapNeg = true
  }
  return { stress, gapNeg, dims }
}

function classifySignal(
  nrRisk: Nr01RiskLevel,
  pent: { stress: boolean; gapNeg: boolean },
): HybridSignalType {
  if (nrRisk === 'sem_dados') return 'SEM_DADOS_PENTAGRAMA'
  const nrBad = isNrStress(nrRisk) || nrRisk === 'critico' || nrRisk === 'elevado'
  const nrOk = nrRisk === 'muito_baixo' || nrRisk === 'baixo'

  if (nrBad && pent.stress) return 'REFORCO'
  if (nrBad && !pent.stress) return 'TENSAO'
  if (nrOk && pent.stress) return 'FACHADA'
  if (pent.gapNeg && !nrBad) return 'FACHADA'
  if (nrBad) return 'TENSAO'
  if (pent.stress) return 'FACHADA'
  return 'ALINHADO_RISCO'
}

function horizonFor(signal: HybridSignalType, priority: string): HybridHorizon {
  if (signal === 'REFORCO' || priority === 'P1') return 'curto'
  if (signal === 'FACHADA' || signal === 'TENSAO') return 'medio'
  return 'longo'
}

function narrativeFor(
  code: Nr01DimensionScore['dimension_code'],
  signal: HybridSignalType,
  nrRisk: Nr01RiskLevel,
  dims: Dimensao[],
): string {
  const label = NR01_DIMENSION_LABEL[code]
  const pentNames = dims.map((d) => DIM_LABEL_PT[d]).join(', ')
  switch (signal) {
    case 'REFORCO':
      return `${label}: risco NR-01 (${nrRisk}) alinhado ao campo vivido (${pentNames}) — intervenção integrada urgente.`
    case 'TENSAO':
      return `${label}: risco regulatório (${nrRisk}) sem reflexo proporcional no vivido (${pentNames}) — aprofundar devolutiva e monitorar adesão.`
    case 'FACHADA':
      return `${label}: leitura normativa mais favorável que o vivido (${pentNames}) — risco de conformidade sem transformação; priorizar escuta e ações vivenciais.`
    case 'SEM_DADOS_PENTAGRAMA':
      return `${label}: dados NR-01 insuficientes (k-anon); aguardar amostra ou reforçar coleta.`
    default:
      return `${label}: sinais alinhados entre norma e campo (${pentNames}).`
  }
}

export function buildDimensionSignals(
  scores: Nr01DimensionScore[],
  pent: PentagramaInputForHybrid,
): HybridDimensionSignal[] {
  const snaps = pentagramaSnapshots(pent)
  return scores.map((s) => {
    const pentMeta = worstPentForNr01(s.dimension_code, snaps)
    const signal = classifySignal(s.risk_level, pentMeta)
    const h =
      s.risk_level === 'critico' || signal === 'REFORCO'
        ? 'curto'
        : signal === 'FACHADA'
          ? 'medio'
          : 'longo'
    return {
      nr01_code: s.dimension_code,
      nr01_risk: s.risk_level,
      nr01_score_pct: s.score_pct,
      signal,
      pentagrama_dims: pentMeta.dims,
      narrative: narrativeFor(s.dimension_code, signal, s.risk_level, pentMeta.dims),
      horizon: h as HybridHorizon,
    }
  })
}

function rankBoost(
  action: SuggestedAction,
  signals: HybridDimensionSignal[],
  snaps: PentagramaDimSnapshot[],
): number {
  const sig = signals.find((s) => s.nr01_code === action.dimension_code)
  if (!sig) return 0
  let boost = 0
  if (sig.signal === 'REFORCO') boost += 100
  else if (sig.signal === 'FACHADA') boost += 80
  else if (sig.signal === 'TENSAO') boost += 60
  if (action.priority === 'P1') boost += 30
  for (const d of sig.pentagrama_dims) {
    const snap = snaps.find((x) => x.dimensao === d)
    if (snap?.nivel_ic === 'critico') boost += 25
    if (snap?.gap_pct != null && snap.gap_pct <= -15) boost += 15
  }
  return boost
}

function contextoVivido(
  action: SuggestedAction,
  snaps: PentagramaDimSnapshot[],
  signals: HybridDimensionSignal[],
): string | null {
  const sig = signals.find((s) => s.nr01_code === action.dimension_code)
  if (!sig?.pentagrama_dims.length) return null
  const parts: string[] = []
  for (const d of sig.pentagrama_dims) {
    const snap = snaps.find((x) => x.dimensao === d)
    if (snap?.laudo_excerpt) parts.push(`[${DIM_LABEL_PT[d]}] ${snap.laudo_excerpt}`)
  }
  return parts.length ? parts.join('\n') : null
}

export function fecundarPlano(
  suggestions: SuggestedAction[],
  signals: HybridDimensionSignal[],
  pent: PentagramaInputForHybrid,
): HybridFecundatedAction[] {
  const snaps = pentagramaSnapshots(pent)
  const ranked = suggestions
    .map((s) => ({
      s,
      boost: rankBoost(s, signals, snaps),
      sig: signals.find((x) => x.nr01_code === s.dimension_code),
    }))
    .sort((a, b) => b.boost - a.boost)
    .slice(0, MAX_PLANO_ITEMS)

  return ranked.map(({ s, boost, sig }, i) => {
    const ctx = contextoVivido(s, snaps, signals)
    const signal = sig?.signal ?? 'ALINHADO_RISCO'
    const horizon = horizonFor(signal, s.priority)
    const prefix = `[Híbrido v${HYBRID_CROSSWALK_VERSION}|${signal}|${horizon}] `
    return {
      ...s,
      hybrid_rank: i + 1,
      hybrid_signal: signal,
      horizon,
      pentagrama_dims: sig?.pentagrama_dims ?? [],
      contexto_vivido: ctx,
      description: ctx
        ? `${prefix}${s.description}\n\n— Campo vivido (Pentagrama) —\n${ctx}`
        : `${prefix}${s.description}`,
    }
  })
}

function buildExecutiveBrief(
  companyName: string,
  result: Nr01AssessmentResult | null,
  pent: PentagramaInputForHybrid,
  signals: HybridDimensionSignal[],
  plano: HybridFecundatedAction[],
): HybridReportPayload['executive_brief'] {
  const refoco = signals.filter((s) => s.signal === 'REFORCO').length
  const fachada = signals.filter((s) => s.signal === 'FACHADA').length
  const iso = result?.iso_score != null ? result.iso_score.toFixed(1) : '—'
  const globalPent = pent.result.combined_global_pct != null
    ? `${pent.result.combined_global_pct.toFixed(0)}%`
    : '—'

  const avaliativo =
    `Para ${companyName}, o ISO global NR-01 está em ${iso} (${result?.iso_risk_level ?? 'sem_dados'}). ` +
    `O Pentagrama registra campo combinado em ${globalPent} (N=${pent.result.n_ic_respondents ?? 0} colaboradores). ` +
    `${refoco} dimensão(ões) com reforço norma+vivido; ${fachada} com possível fachada de conformidade.`

  const corretivo =
    plano.length > 0
      ? `Plano fecundado com ${plano.length} ações priorizadas pela tensão entre FRPRT e vivência organizacional. ` +
        `Primeira frente: ${plano[0].title} (${NR01_DIMENSION_LABEL[plano[0].dimension_code as Nr01DimensionScore['dimension_code']]}).`
      : 'Sem ações automáticas — revise dimensões em atenção ou complete o vínculo Pentagrama.'

  const executivo =
    `Priorize devolutiva conjunta em até 30 dias nas frentes P1; ` +
    `formalize PDCA no módulo NR-01; reavalie com pulso trimestral (horizonte longo).`

  return {
    avaliativo,
    corretivo,
    executivo,
    horizontes: {
      curto: `${plano.filter((p) => p.horizon === 'curto').length} ação(ões) — janela 30–60 dias (P1 / reforço).`,
      medio: `${plano.filter((p) => p.horizon === 'medio').length} ação(ões) — 90 dias (transformação de campo).`,
      longo: 'Monitoramento contínuo NR-01 + novo ciclo Pentagrama em 6–12 meses.',
    },
  }
}

export function computeHybridReport(input: {
  companyName: string
  assessmentName: string
  assessmentResult: Nr01AssessmentResult | null
  scores: Nr01DimensionScore[]
  library: Nr01Intervention[]
  pentagrama: PentagramaInputForHybrid
}): HybridReportPayload {
  const suggestions = suggestActionsFromScores(input.scores, input.library)
  const signals = buildDimensionSignals(input.scores, input.pentagrama)
  const plano = fecundarPlano(suggestions, signals, input.pentagrama)
  const top = plano.slice(0, 3).map((p) => p.title)

  return {
    version: '1.0.0',
    crosswalk_version: HYBRID_CROSSWALK_VERSION,
    generated_at: new Date().toISOString(),
    company_name: input.companyName,
    assessment_name: input.assessmentName,
    diagnostic_name: input.pentagrama.diagnostic_name,
    iso_score: input.assessmentResult?.iso_score ?? null,
    iso_risk_level: input.assessmentResult?.iso_risk_level ?? 'sem_dados',
    pentagrama_global_combined: input.pentagrama.result.combined_global_pct,
    pentagrama_n_ic: input.pentagrama.result.n_ic_respondents,
    executive_brief: buildExecutiveBrief(
      input.companyName,
      input.assessmentResult,
      input.pentagrama,
      signals,
      plano,
    ),
    signals: signals.filter((s) => s.signal !== 'ALINHADO_RISCO' || isNrStress(s.nr01_risk)),
    plano_fecundado: plano,
    top_priorities: top,
  }
}

export function sha256Payload(payload: HybridReportPayload): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex')
}
