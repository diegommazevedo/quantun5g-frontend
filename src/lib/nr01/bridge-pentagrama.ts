/**
 * QUANTUM5G — Bridge NR-01 ↔ Pentagrama de Ginger
 *
 * Cruzamento entre o ISO/dimensões NR-01 e o IC global/dimensões Pentagrama.
 *
 * Mapeamento (regulatório → fenomenológico):
 *
 *   NR-01                       ↔  Pentagrama (Ginger)
 *   ----------------------------     -------------------
 *   carga_trabalho              ↔  fisica         (corpo no trabalho)
 *   controle_autonomia          ↔  racional       (sentido / agência)
 *   exigencias_emocionais       ↔  afetiva        (vinculo emocional)
 *   reconhecimento              ↔  social         (pertencimento)
 *   relacoes_interpessoais      ↔  social         (vinculo coletivo)
 *   estabilidade_seguranca      ↔  cultural       (continuidade simbolica)
 *   assedio_violencia           ↔  social + cultural (ruptura)
 *   organizacao_trabalho        ↔  racional       (sentido / processos)
 *   lideranca_gestao            ↔  cultural       (autoridade / referencia)
 *   saude_bem_estar             ↔  fisica         (somatica)
 *
 * O cruzamento NÃO substitui nenhum dos dois modelos: é uma camada de leitura
 * cruzada que permite ao consultor identificar convergências (ambos sinalizam o
 * mesmo padrão) e divergências (NR-01 mostra um problema que o Pentagrama não
 * captura, ou vice-versa) — material clínico relevante para a devolutiva.
 */

import {
  Nr01DimensionCode,
  Nr01DimensionScore,
  Nr01PentagramaBridge,
  Nr01RiskLevel,
  NR01_BRIDGE_STATISTICAL_THRESHOLD,
} from '@/types/nr01'
import type { Dimensao, DiagnosticResult } from '@/types/database'

// ============================================================
// MATRIZ DE MAPEAMENTO
// ============================================================

export const NR01_TO_PENTAGRAMA: Record<Nr01DimensionCode, Dimensao[]> = {
  carga_trabalho:          ['fisica'],
  controle_autonomia:      ['racional'],
  exigencias_emocionais:   ['afetiva'],
  reconhecimento:          ['social'],
  relacoes_interpessoais:  ['social'],
  estabilidade_seguranca:  ['cultural'],
  assedio_violencia:       ['social', 'cultural'],
  organizacao_trabalho:    ['racional'],
  lideranca_gestao:        ['cultural'],
  saude_bem_estar:         ['fisica'],
}

// ============================================================
// EXTRAÇÃO DE SCORES PENTAGRAMA
// ============================================================

function pentagramaScore(result: DiagnosticResult, dim: Dimensao): number | null {
  switch (dim) {
    case 'fisica':   return result.ic_fisica_pct
    case 'afetiva':  return result.ic_afetiva_pct
    case 'racional': return result.ic_racional_pct
    case 'social':   return result.ic_social_pct
    case 'cultural': return result.ic_cultural_pct
    default:         return null
  }
}

// ============================================================
// CORRELAÇÃO POR PAR DE DIMENSÕES
// Aproximação prática: |delta| baixo → convergência; delta alto → divergência.
// (Não é correlação estatística clássica — exigiria N respondentes maior;
//  aqui usamos coerência nominal para o relatório qualitativo.)
// ============================================================

interface Pair {
  nr01_dim: Nr01DimensionCode
  pentagrama_dim: Dimensao
  nr01_score: number
  pent_score: number
  delta: number
}

/**
 * Patch 005: NR-01 agora opera em escala Likert 1-5 onde MAIOR = pior.
 * Pentagrama opera em 0-100 onde MAIOR = melhor (saúde).
 * Para comparar, convertemos NR-01 mean Likert para "equivalente Pentagrama"
 * (0-100, saúde-positivo): equivalent = ((5 - mean) / 4) * 100.
 *
 * Bridge inteiro será removido no Patch 010. Aqui mantemos apenas funcional.
 */
function nr01LikertToPentagramaEquivalent(meanLikert: number): number {
  return ((5 - meanLikert) / 4) * 100
}

function buildPairs(
  nr01Scores: Nr01DimensionScore[],
  pent: DiagnosticResult,
): Pair[] {
  const pairs: Pair[] = []
  for (const ds of nr01Scores) {
    if (ds.score_pct == null) continue
    const nr01EquivPent = nr01LikertToPentagramaEquivalent(ds.score_pct)
    const targets = NR01_TO_PENTAGRAMA[ds.dimension_code] ?? []
    for (const t of targets) {
      const ps = pentagramaScore(pent, t)
      if (ps == null) continue
      pairs.push({
        nr01_dim: ds.dimension_code,
        pentagrama_dim: t,
        nr01_score: nr01EquivPent,
        pent_score: ps,
        delta: nr01EquivPent - ps,
      })
    }
  }
  return pairs
}

// ============================================================
// MATRIZ DE CORRELAÇÃO (pseudo-coeficiente)
// r aproximado: 1 - (|delta| / 100), clampado em [-1, 1]
// ============================================================

export function buildCorrelationMatrix(pairs: Pair[]): Record<string, Record<string, number>> {
  const matrix: Record<string, Record<string, number>> = {}
  for (const p of pairs) {
    if (!matrix[p.nr01_dim]) matrix[p.nr01_dim] = {}
    const r = Math.max(-1, Math.min(1, 1 - Math.abs(p.delta) / 100))
    matrix[p.nr01_dim][p.pentagrama_dim] = round3(r)
  }
  return matrix
}

// ============================================================
// CONVERGÊNCIAS / DIVERGÊNCIAS
// ============================================================

const CONVERGENCE_THRESHOLD = 12  // |delta| ≤ 12 pp → convergente
const DIVERGENCE_THRESHOLD = 25   // |delta| ≥ 25 pp → divergente significativo

export function classifyPairs(pairs: Pair[]): {
  convergences: Nr01PentagramaBridge['convergences']
  divergences: Nr01PentagramaBridge['divergences']
} {
  const convergences: Nr01PentagramaBridge['convergences'] = []
  const divergences: Nr01PentagramaBridge['divergences'] = []
  for (const p of pairs) {
    const abs = Math.abs(p.delta)
    if (abs <= CONVERGENCE_THRESHOLD) {
      convergences.push({
        descricao: `NR-01 (${p.nr01_dim}: ${p.nr01_score.toFixed(0)}) e Pentagrama (${p.pentagrama_dim}: ${p.pent_score.toFixed(0)}) convergem — leitura coerente.`,
        nr01_dim: p.nr01_dim,
        pentagrama_dim: p.pentagrama_dim,
      })
    } else if (abs >= DIVERGENCE_THRESHOLD) {
      divergences.push({
        descricao:
          p.delta > 0
            ? `NR-01 (${p.nr01_dim}: ${p.nr01_score.toFixed(0)}) está MELHOR que Pentagrama (${p.pentagrama_dim}: ${p.pent_score.toFixed(0)}) — fenômeno cultural/vivido pior que o reportado funcionalmente.`
            : `NR-01 (${p.nr01_dim}: ${p.nr01_score.toFixed(0)}) está PIOR que Pentagrama (${p.pentagrama_dim}: ${p.pent_score.toFixed(0)}) — risco regulatório acima do percebido fenomenologicamente.`,
        nr01_dim: p.nr01_dim,
        pentagrama_dim: p.pentagrama_dim,
        gap: round2(p.delta),
      })
    }
  }
  return { convergences, divergences }
}

// ============================================================
// SCORE COMBINADO
// ISO NR-01 + IC global Pentagrama, ponderados (50/50 padrão)
// ============================================================

export function computeCombinedScore(
  isoScoreLikert: number | null,
  pentagramaIcGlobal: number | null,
  weightNr01 = 0.5,
): { combined_score: number | null; combined_level: 'critico' | 'vulneravel' | 'saudavel' | 'excelente' | 'sem_dados' } {
  // Patch 005: ISO em Likert 1-5 (maior = pior). Converte para escala
  // Pentagrama (0-100, maior = melhor) antes de combinar.
  const isoScore = isoScoreLikert == null
    ? null
    : nr01LikertToPentagramaEquivalent(isoScoreLikert)

  if (isoScore == null && pentagramaIcGlobal == null) {
    return { combined_score: null, combined_level: 'sem_dados' }
  }
  if (isoScore == null) {
    return {
      combined_score: pentagramaIcGlobal,
      combined_level: pentagramaLevel(pentagramaIcGlobal!),
    }
  }
  if (pentagramaIcGlobal == null) {
    return { combined_score: isoScore, combined_level: pentagramaLevel(isoScore) }
  }
  const wPent = 1 - weightNr01
  const combined = isoScore * weightNr01 + pentagramaIcGlobal * wPent
  return {
    combined_score: round2(combined),
    combined_level: pentagramaLevel(combined),
  }
}

// Reusa nomenclatura Pentagrama (decisão 001 — laudo é selecionado pelo IC vivido)
function pentagramaLevel(score: number): 'critico' | 'vulneravel' | 'saudavel' | 'excelente' | 'sem_dados' {
  if (score >= 80) return 'excelente'
  if (score >= 60) return 'saudavel'
  if (score >= 40) return 'vulneravel'
  return 'critico'
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export interface BuildBridgeArgs {
  assessmentId: string
  diagnosticId: string
  nr01Scores: Nr01DimensionScore[]
  isoScore: number | null
  pentagramaResult: DiagnosticResult
}

export function buildBridge(args: BuildBridgeArgs): Omit<Nr01PentagramaBridge, 'id' | 'computed_at'> {
  const pairs = buildPairs(args.nr01Scores, args.pentagramaResult)
  const matrix = buildCorrelationMatrix(pairs)
  const { convergences, divergences } = classifyPairs(pairs)
  const combined = computeCombinedScore(args.isoScore, args.pentagramaResult.ic_global_pct)

  // Confidence: usa o menor N entre as dimensões pareadas. Abaixo de 200 = nominal.
  // (Quando migrarmos para Pearson/Spearman real, o cálculo retorna 'statistical'.)
  const validNs = args.nr01Scores
    .filter((d) => d.score_pct != null)
    .map((d) => d.n_respondents)
  const minN = validNs.length > 0 ? Math.min(...validNs) : null
  const confidence: 'nominal' | 'statistical' =
    minN != null && minN >= NR01_BRIDGE_STATISTICAL_THRESHOLD ? 'statistical' : 'nominal'

  return {
    assessment_id: args.assessmentId,
    diagnostic_id: args.diagnosticId,
    correlation_matrix: matrix,
    convergences,
    divergences,
    combined_score: combined.combined_score,
    combined_level: combined.combined_level,
    confidence_level: confidence,
    min_n_respondents: minN,
  }
}

// ============================================================
// HELPERS
// ============================================================

function round2(n: number): number {
  return Math.round(n * 100) / 100
}

function round3(n: number): number {
  return Math.round(n * 1000) / 1000
}

// ============================================================
// SUGESTÃO DE SEVERIDADE COMBINADA
// Resposta curta para o dashboard executivo
// ============================================================

export function suggestExecutiveStance(
  isoLevel: Nr01RiskLevel,
  pentagramaLevelStr: string | null | undefined,
): string {
  if (isoLevel === 'critico') {
    return 'Risco regulatório crítico — bloqueio jurídico imediato exigido pela NR-01.'
  }
  if (isoLevel === 'elevado' && (pentagramaLevelStr === 'critico' || pentagramaLevelStr === 'vulneravel')) {
    return 'Risco regulatório alto + sintoma vivido confirma — escalar para diretoria nesta semana.'
  }
  if (isoLevel === 'atencao') {
    return 'Risco em zona de atenção — implementar plano em até 60 dias evita escalada.'
  }
  return 'Conformidade adequada — manter monitoramento contínuo (micro-pulsos semanais).'
}
