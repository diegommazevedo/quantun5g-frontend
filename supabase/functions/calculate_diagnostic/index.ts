/**
 * QUANTUM5G — Edge Function: calculate_diagnostic
 * Motor de cálculo do Pentagrama de Ginger
 *
 * Implementa os 15 passos obrigatórios na ordem exata definida em
 * pentagrama_claude_code_prompt.md e pentagrama_contexto_desktop.md
 *
 * REGRAS INVIOLÁVEIS:
 *   1. Laudos selecionados pelo nível IC — NUNCA pelo IL ou combinado
 *   2. Blocos reais do instrumento — NUNCA divisão uniforme de 5 questões
 *   3. Bolha Sistêmica é alerta separado do classificador de gap por dimensão
 *   4. respondente_anonimo_id nunca é exposto ou logado
 */

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ============================================================
// TIPOS
// ============================================================

type Dimensao = 'fisica' | 'afetiva' | 'racional' | 'social' | 'cultural'
type Nivel = 'critico' | 'vulneravel' | 'saudavel' | 'excelente' | 'sem_dados'
type DisplayLevel =
  | 'normal'
  | 'baixa_amostragem_amarelo'
  | 'baixa_amostragem_laranja'
  | 'apenas_dimensao'
  | 'sem_dados'
type GapClass =
  | 'alinhado'
  | 'divergencia_moderada'
  | 'divergencia_significativa'
  | 'bolha_percepcao_dimensao'

interface Alert {
  tipo: 'BOLHA_SISTEMICA' | 'QUESTAO_ANCORA' | 'BLOCO_CRITICO_OCULTO' | 'BAIXA_AMOSTRAGEM'
  descricao: string
  dimensoes?: Dimensao[]
  questao?: number
  media?: number
  bloco?: string
  dimensao?: Dimensao
  n?: number
}

interface AnchorQuestion {
  questao: number
  media: number
  dimensao: Dimensao
}

// ============================================================
// DEFINIÇÃO DOS BLOCOS REAIS (DECISÃO 001)
// NÃO alterar — blocos derivados do instrumento autoral
// ============================================================

const BLOCOS: Record<string, { dim: Dimensao; questoes: number[] }> = {
  // Dimensão Física
  'F-A': { dim: 'fisica',   questoes: [1,2,3,4,5,6,7,8] },
  'F-B': { dim: 'fisica',   questoes: [9,10,11,12,13,14,15,16] },
  'F-C': { dim: 'fisica',   questoes: [17,18,19,20,21,22,23,24,25] },
  // Dimensão Afetiva
  'A-1': { dim: 'afetiva',  questoes: [26,27,28,29,30] },
  'A-2': { dim: 'afetiva',  questoes: [31,32,33,34,35] },
  'A-3': { dim: 'afetiva',  questoes: [36,37,38,39,40] },
  'A-4': { dim: 'afetiva',  questoes: [41,42,43,44,45] },
  'A-5': { dim: 'afetiva',  questoes: [46,47,48,49,50] },
  // Dimensão Racional
  'R-1': { dim: 'racional', questoes: [51,52,53,54,55] },
  'R-2': { dim: 'racional', questoes: [56,57,58,59,60] },
  'R-3': { dim: 'racional', questoes: [61,62,63,64,65] },
  'R-4': { dim: 'racional', questoes: [66,67,68,69,70] },
  'R-5': { dim: 'racional', questoes: [71,72,73,74,75] },
  // Dimensão Social
  'S-A': { dim: 'social',   questoes: [76,77,78,79,80,81,82,83] },
  'S-B': { dim: 'social',   questoes: [84,85,86,87,88,89,90,91] },
  'S-C': { dim: 'social',   questoes: [92,93,94,95,96,97,98,99,100] },
  // Dimensão Cultural
  'C-A': { dim: 'cultural', questoes: [101,102,103,104,105,106,107,108] },
  'C-B': { dim: 'cultural', questoes: [109,110,111,112,113,114,115,116] },
  'C-C': { dim: 'cultural', questoes: [117,118,119,120,121,122,123,124,125] },
}

const DIMENSOES: Dimensao[] = ['fisica', 'afetiva', 'racional', 'social', 'cultural']

// Questões por dimensão (derivado dos blocos — source of truth é BLOCOS)
const QUESTOES_POR_DIM: Record<Dimensao, number[]> = {
  fisica:   [...BLOCOS['F-A'].questoes, ...BLOCOS['F-B'].questoes, ...BLOCOS['F-C'].questoes],
  afetiva:  [...BLOCOS['A-1'].questoes, ...BLOCOS['A-2'].questoes, ...BLOCOS['A-3'].questoes, ...BLOCOS['A-4'].questoes, ...BLOCOS['A-5'].questoes],
  racional: [...BLOCOS['R-1'].questoes, ...BLOCOS['R-2'].questoes, ...BLOCOS['R-3'].questoes, ...BLOCOS['R-4'].questoes, ...BLOCOS['R-5'].questoes],
  social:   [...BLOCOS['S-A'].questoes, ...BLOCOS['S-B'].questoes, ...BLOCOS['S-C'].questoes],
  cultural: [...BLOCOS['C-A'].questoes, ...BLOCOS['C-B'].questoes, ...BLOCOS['C-C'].questoes],
}

// Máximo possível por dimensão = nQuestoes × 5
const MAX_DIM: Record<Dimensao, number> = {
  fisica:   25 * 5,  // 125
  afetiva:  25 * 5,  // 125
  racional: 25 * 5,  // 125
  social:   25 * 5,  // 125
  cultural: 25 * 5,  // 125
}

// ============================================================
// FUNÇÕES AUXILIARES
// ============================================================

/** Extrai valor de questão de uma linha de resposta */
function qVal(row: Record<string, unknown>, n: number): number | null {
  const v = row[`q${n}`]
  if (v === null || v === undefined) return null
  const num = Number(v)
  return isNaN(num) ? null : num
}

/**
 * PASSO 3: Calcula média por questão a partir de N respostas IC
 * Retorna null para todas se N = 0
 */
function calcMediaPorQuestao(
  rows: Record<string, unknown>[],
  n: number
): Record<number, number | null> {
  const medias: Record<number, number | null> = {}
  if (n === 0) {
    for (let q = 1; q <= 125; q++) medias[q] = null
    return medias
  }
  for (let q = 1; q <= 125; q++) {
    const valores = rows.map(r => qVal(r, q)).filter((v): v is number => v !== null)
    medias[q] = valores.length > 0 ? valores.reduce((a, b) => a + b, 0) / valores.length : null
  }
  return medias
}

/**
 * PASSO 4: Calcula score de bloco IC
 * Score bruto = soma das médias das questões do bloco
 * % = (soma_brutas / max_possivel) × 100
 * max_possivel = nQuestoes × 5
 */
function calcScoresBlocoIC(
  medias: Record<number, number | null>
): Record<string, number | null> {
  const scores: Record<string, number | null> = {}
  for (const [blocoId, bloco] of Object.entries(BLOCOS)) {
    const vals = bloco.questoes.map(q => medias[q]).filter((v): v is number => v !== null)
    if (vals.length === 0) {
      scores[blocoId] = null
    } else {
      const soma = vals.reduce((a, b) => a + b, 0)
      const maxPossivel = bloco.questoes.length * 5
      scores[blocoId] = (soma / maxPossivel) * 100
    }
  }
  return scores
}

/**
 * PASSO 5+6: Calcula score % por dimensão IC
 * Usa médias por questão (não agrega blocos individualmente)
 * para manter precisão matemática
 */
function calcScoresDimIC(
  medias: Record<number, number | null>
): Record<Dimensao, number | null> {
  const scores = {} as Record<Dimensao, number | null>
  for (const dim of DIMENSOES) {
    const qs = QUESTOES_POR_DIM[dim]
    const vals = qs.map(q => medias[q]).filter((v): v is number => v !== null)
    if (vals.length === 0) {
      scores[dim] = null
    } else {
      const soma = vals.reduce((a, b) => a + b, 0)
      scores[dim] = (soma / MAX_DIM[dim]) * 100
    }
  }
  return scores
}

/**
 * PASSO 7: Score global IC
 * Média simples dos scores percentuais por dimensão
 */
function calcGlobalIC(dimScores: Record<Dimensao, number | null>): number | null {
  const vals = DIMENSOES.map(d => dimScores[d]).filter((v): v is number => v !== null)
  if (vals.length === 0) return null
  return vals.reduce((a, b) => a + b, 0) / vals.length
}

/**
 * PASSO 8: Calcula scores IL a partir de uma única linha (il_responses)
 * IL é sempre 1 resposta — não há média
 */
function calcScoresIL(ilRow: Record<string, unknown> | null): {
  dimScores: Record<Dimensao, number | null>
  blocoScores: Record<string, number | null>
  global: number | null
} {
  if (!ilRow) {
    const dimScores = {} as Record<Dimensao, number | null>
    const blocoScores: Record<string, number | null> = {}
    for (const d of DIMENSOES) dimScores[d] = null
    for (const b of Object.keys(BLOCOS)) blocoScores[b] = null
    return { dimScores, blocoScores, global: null }
  }

  // Score por dimensão
  const dimScores = {} as Record<Dimensao, number | null>
  for (const dim of DIMENSOES) {
    const qs = QUESTOES_POR_DIM[dim]
    const vals = qs.map(q => qVal(ilRow, q)).filter((v): v is number => v !== null)
    if (vals.length === 0) {
      dimScores[dim] = null
    } else {
      const soma = vals.reduce((a, b) => a + b, 0)
      dimScores[dim] = (soma / MAX_DIM[dim]) * 100
    }
  }

  // Score por bloco
  const blocoScores: Record<string, number | null> = {}
  for (const [blocoId, bloco] of Object.entries(BLOCOS)) {
    const vals = bloco.questoes.map(q => qVal(ilRow, q)).filter((v): v is number => v !== null)
    if (vals.length === 0) {
      blocoScores[blocoId] = null
    } else {
      const soma = vals.reduce((a, b) => a + b, 0)
      blocoScores[blocoId] = (soma / (bloco.questoes.length * 5)) * 100
    }
  }

  const globalVals = DIMENSOES.map(d => dimScores[d]).filter((v): v is number => v !== null)
  const global = globalVals.length > 0
    ? globalVals.reduce((a, b) => a + b, 0) / globalVals.length
    : null

  return { dimScores, blocoScores, global }
}

/**
 * PASSO 9: Score combinado por dimensão
 * N ≥ 3: IC×0.60 + IL×0.40
 * N = 1|2: IC×0.40 + IL×0.60
 * N = 0: IL apenas (peso 1.0)
 */
function calcCombinado(
  icPct: number | null,
  ilPct: number | null,
  icWeight: number,
  ilWeight: number,
  n: number
): number | null {
  if (n === 0) return ilPct
  if (icPct === null && ilPct === null) return null
  if (icPct === null) return ilPct
  if (ilPct === null) return icPct
  return icPct * icWeight + ilPct * ilWeight
}

/**
 * PASSO 10: Classifica nível a partir de score %
 * Usa inteiro arredondado — garantia de consistência com o valor exibido na UI.
 * 0–39%: critico | 40–59%: vulneravel | 60–79%: saudavel | 80–100%: excelente
 *
 * Exemplo: raw 39.6% → Math.round → 40 → vulneravel (exibido como "40%" ✅)
 *          raw 39.4% → Math.round → 39 → critico    (exibido como "39%" ✅)
 */
function classificarNivel(pct: number | null): Nivel {
  if (pct === null) return 'sem_dados'
  const p = Math.round(pct)   // classifica sobre o inteiro, igual ao display
  if (p < 40)  return 'critico'
  if (p < 60)  return 'vulneravel'
  if (p < 80)  return 'saudavel'
  return 'excelente'
}

/**
 * PASSO 11: Classifica gap por dimensão (IL% − IC%)
 * Separado do alerta de Bolha Sistêmica (PASSO 12)
 *
 * -5 a +5:   alinhado
 * +6 a +15:  divergencia_moderada
 * +16 a +30: divergencia_significativa
 * >+30:      bolha_percepcao_dimensao
 */
function classificarGap(gap: number | null): GapClass {
  if (gap === null) return 'alinhado'
  const abs = Math.abs(gap)
  if (gap > 30)  return 'bolha_percepcao_dimensao'
  if (gap > 15)  return 'divergencia_significativa'
  if (gap > 5)   return 'divergencia_moderada'
  return 'alinhado'
}

/**
 * PASSO 12a: Bolha Sistêmica
 * SEPARADO do classificador de gap por dimensão (classificarGap)
 * Condição: IL supera IC em ≥20pp em ≥3 dimensões SIMULTANEAMENTE
 */
function detectarBolhaSistemica(
  icDim: Record<Dimensao, number | null>,
  ilDim: Record<Dimensao, number | null>,
  n: number
): Alert | null {
  if (n === 0) return null

  const dimsComBolha: Dimensao[] = []
  for (const dim of DIMENSOES) {
    const ic = icDim[dim]
    const il = ilDim[dim]
    if (ic !== null && il !== null && (il - ic) >= 20) {
      dimsComBolha.push(dim)
    }
  }

  if (dimsComBolha.length >= 3) {
    return {
      tipo: 'BOLHA_SISTEMICA',
      descricao: `A liderança percebe a organização significativamente melhor do que os colaboradores em ${dimsComBolha.length} dimensões (${dimsComBolha.join(', ')}). Diferença ≥20pp em cada uma.`,
      dimensoes: dimsComBolha,
    }
  }
  return null
}

/**
 * PASSO 12b: Questões Âncora
 * media_ic[q] ≤ 1.5 — lista cada questão individualmente
 */
function detectarQuestoesAncora(
  medias: Record<number, number | null>,
  n: number
): { alerts: Alert[]; anchorQuestions: AnchorQuestion[] } {
  if (n === 0) return { alerts: [], anchorQuestions: [] }

  const anchorQuestions: AnchorQuestion[] = []
  const alerts: Alert[] = []

  for (let q = 1; q <= 125; q++) {
    const media = medias[q]
    if (media !== null && media <= 1.5) {
      // Determina dimensão desta questão
      let dimensao: Dimensao = 'fisica'
      for (const dim of DIMENSOES) {
        if (QUESTOES_POR_DIM[dim].includes(q)) {
          dimensao = dim
          break
        }
      }
      anchorQuestions.push({ questao: q, media: parseFloat(media.toFixed(2)), dimensao })
      alerts.push({
        tipo: 'QUESTAO_ANCORA',
        descricao: `Q${q} (${dimensao}): média IC de ${media.toFixed(2)} — abaixo de 1.5. Ponto de dor crítico identificado.`,
        questao: q,
        media: parseFloat(media.toFixed(2)),
        dimensao,
      })
    }
  }
  return { alerts, anchorQuestions }
}

/**
 * PASSO 12c: Bloco Crítico Oculto
 * Condição: score_bloco < 40% DENTRO de dimensão com score_dim ≥ 40%
 * Revela fraquezas mascaradas pela média da dimensão
 */
function detectarBlocosCriticosOcultos(
  icBlocos: Record<string, number | null>,
  icDim: Record<Dimensao, number | null>,
  n: number
): Alert[] {
  if (n === 0) return []

  const alerts: Alert[] = []
  for (const [blocoId, blocoScore] of Object.entries(icBlocos)) {
    if (blocoScore === null) continue
    const dim = BLOCOS[blocoId].dim
    const dimScore = icDim[dim]
    if (dimScore === null) continue

    // Dimensão está "aceitável" (≥40%) mas este bloco está abaixo de 40%
    if (dimScore >= 40 && blocoScore < 40) {
      alerts.push({
        tipo: 'BLOCO_CRITICO_OCULTO',
        descricao: `Bloco ${blocoId} (${dim}): score ${blocoScore.toFixed(1)}% abaixo de 40%, mascarado pela média da dimensão (${dimScore.toFixed(1)}%).`,
        bloco: blocoId,
        dimensao: dim,
      })
    }
  }
  return alerts
}

/**
 * PASSO 12d: Baixa Amostragem
 * N < 3 — pesos foram invertidos, resultado menos confiável
 */
function detectarBaixaAmostragem(n: number): Alert | null {
  if (n >= 3) return null
  if (n === 0) {
    return {
      tipo: 'BAIXA_AMOSTRAGEM',
      descricao: 'Nenhuma resposta IC recebida. O diagnóstico é baseado exclusivamente na perspectiva da liderança.',
      n,
    }
  }
  return {
    tipo: 'BAIXA_AMOSTRAGEM',
    descricao: `Apenas ${n} resposta(s) IC recebida(s). Mínimo recomendado: 3. Os pesos foram ajustados para IC×0.40 / IL×0.60.`,
    n,
  }
}

/**
 * PASSO 13: Seleciona ID do laudo por dimensão
 * REGRA: sempre pelo nível IC — NUNCA pelo IL ou combinado
 * N = 0: usar laudo indisponivel/sem_dados
 */
async function selecionarLaudos(
  supabase: ReturnType<typeof createClient>,
  icNiveis: Record<Dimensao, Nivel>,
  n: number
): Promise<Record<Dimensao, string | null>> {
  const laudoIds = {} as Record<Dimensao, string | null>

  for (const dim of DIMENSOES) {
    if (n === 0) {
      // Busca laudo de indisponibilidade
      const { data } = await supabase
        .from('laudos')
        .select('id')
        .eq('dimensao', 'indisponivel')
        .eq('nivel', 'sem_dados')
        .single()
      laudoIds[dim] = data?.id ?? null
    } else {
      // Seleciona pelo nível IC — NUNCA pelo IL
      const nivel = icNiveis[dim]
      const { data } = await supabase
        .from('laudos')
        .select('id')
        .eq('dimensao', dim)
        .eq('nivel', nivel)
        .single()
      laudoIds[dim] = data?.id ?? null
    }
  }
  return laudoIds
}

/**
 * Determina display_level para controle de anonimato (DECISÃO 002)
 */
function getDisplayLevel(n: number, totalCollaborators: number): DisplayLevel {
  if (n === 0) return 'sem_dados'
  if (n <= 2 && totalCollaborators < 5) return 'apenas_dimensao'
  if (n < 3)  return 'baixa_amostragem_laranja'
  if (n <= 5) return 'baixa_amostragem_amarelo'
  return 'normal'
}

// ============================================================
// HANDLER PRINCIPAL
// ============================================================

Deno.serve(async (req: Request) => {
  // CORS
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    })
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405 })
  }

  let diagnosticId: string
  try {
    const body = await req.json()
    diagnosticId = body.diagnostic_id
    if (!diagnosticId) throw new Error('diagnostic_id ausente')
  } catch {
    return new Response(JSON.stringify({ error: 'Body inválido — esperado { diagnostic_id: uuid }' }), { status: 400 })
  }

  // Cliente Supabase com service role (acesso total, bypassa RLS)
  const supabase = createClient(
    Deno.env.get('SUPABASE_URL') ?? '',
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
  )

  try {
    // ──────────────────────────────────────────────────────────
    // PASSO 1: Buscar diagnóstico + empresa
    // ──────────────────────────────────────────────────────────
    const { data: diag, error: errDiag } = await supabase
      .from('diagnostics')
      .select('id, status, company_id, companies(total_collaborators)')
      .eq('id', diagnosticId)
      .single()

    if (errDiag || !diag) {
      return new Response(JSON.stringify({ error: 'Diagnóstico não encontrado' }), { status: 404 })
    }

    if (!['ENCERRADO', 'COLETANDO_IC'].includes((diag as { status: string }).status)) {
      return new Response(JSON.stringify({ error: 'Diagnóstico não está em estado calculável' }), { status: 422 })
    }

    const totalCollaborators =
      (diag as { companies: { total_collaborators: number } | null }).companies?.total_collaborators ?? 0

    // Buscar respostas IC — NUNCA logar respondente_anonimo_id
    const { data: icRows } = await supabase
      .from('ic_responses')
      .select('q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,q21,q22,q23,q24,q25,q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,q46,q47,q48,q49,q50,q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,q71,q72,q73,q74,q75,q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,q96,q97,q98,q99,q100,q101,q102,q103,q104,q105,q106,q107,q108,q109,q110,q111,q112,q113,q114,q115,q116,q117,q118,q119,q120,q121,q122,q123,q124,q125')
      .eq('diagnostic_id', diagnosticId)

    // Buscar resposta IL
    const { data: ilRow } = await supabase
      .from('il_responses')
      .select('q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,q17,q18,q19,q20,q21,q22,q23,q24,q25,q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,q46,q47,q48,q49,q50,q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,q71,q72,q73,q74,q75,q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,q96,q97,q98,q99,q100,q101,q102,q103,q104,q105,q106,q107,q108,q109,q110,q111,q112,q113,q114,q115,q116,q117,q118,q119,q120,q121,q122,q123,q124,q125')
      .eq('diagnostic_id', diagnosticId)
      .single()

    const icData = (icRows ?? []) as Record<string, unknown>[]

    // ──────────────────────────────────────────────────────────
    // PASSO 2: Determinar pesos
    // ──────────────────────────────────────────────────────────
    const n = icData.length
    const icWeight = n >= 3 ? 0.60 : (n > 0 ? 0.40 : 0)
    const ilWeight = n >= 3 ? 0.40 : (n > 0 ? 0.60 : 1.0)

    // ──────────────────────────────────────────────────────────
    // PASSO 3: Média por questão IC
    // ──────────────────────────────────────────────────────────
    const mediaIC = calcMediaPorQuestao(icData, n)

    // ──────────────────────────────────────────────────────────
    // PASSO 4: Scores de bloco IC (blocos reais — DECISÃO 001)
    // ──────────────────────────────────────────────────────────
    const icBlocoScores = calcScoresBlocoIC(mediaIC)

    // ──────────────────────────────────────────────────────────
    // PASSO 5 + 6: Scores de dimensão IC (%)
    // ──────────────────────────────────────────────────────────
    const icDimScores = calcScoresDimIC(mediaIC)

    // ──────────────────────────────────────────────────────────
    // PASSO 7: Score global IC
    // ──────────────────────────────────────────────────────────
    const icGlobal = calcGlobalIC(icDimScores)

    // ──────────────────────────────────────────────────────────
    // PASSO 8: Scores IL
    // ──────────────────────────────────────────────────────────
    const ilData = ilRow as Record<string, unknown> | null
    const { dimScores: ilDimScores, blocoScores: ilBlocoScores, global: ilGlobal } = calcScoresIL(ilData)

    // ──────────────────────────────────────────────────────────
    // PASSO 9: Scores combinados
    // ──────────────────────────────────────────────────────────
    const combinedDim = {} as Record<Dimensao, number | null>
    for (const dim of DIMENSOES) {
      combinedDim[dim] = calcCombinado(
        icDimScores[dim], ilDimScores[dim], icWeight, ilWeight, n
      )
    }
    const combinedGlobal = calcCombinado(icGlobal, ilGlobal, icWeight, ilWeight, n)

    // ──────────────────────────────────────────────────────────
    // PASSO 10: Classificar níveis (IC por dimensão + combinado global)
    // ──────────────────────────────────────────────────────────
    const icNiveis = {} as Record<Dimensao, Nivel>
    for (const dim of DIMENSOES) {
      icNiveis[dim] = n === 0 ? 'sem_dados' : classificarNivel(icDimScores[dim])
    }
    const nivelCombinado = classificarNivel(combinedGlobal)

    // ──────────────────────────────────────────────────────────
    // PASSO 11: Gaps por dimensão (IL% − IC%)
    // Classificação por dimensão — SEPARADO da Bolha Sistêmica
    // ──────────────────────────────────────────────────────────
    const gaps = {} as Record<Dimensao, number | null>
    const gapClass = {} as Record<Dimensao, GapClass>
    for (const dim of DIMENSOES) {
      const ic = icDimScores[dim]
      const il = ilDimScores[dim]
      gaps[dim] = (ic !== null && il !== null) ? il - ic : null
      gapClass[dim] = classificarGap(gaps[dim])
    }

    // ──────────────────────────────────────────────────────────
    // PASSO 12: Detectar alertas
    // Bolha Sistêmica é alerta SEPARADO — condição independente do gap por dimensão
    // ──────────────────────────────────────────────────────────
    const allAlerts: Alert[] = []

    // 12a — Bolha Sistêmica (≥20pp em ≥3 dims SIMULTANEAMENTE)
    const bolhaSistemica = detectarBolhaSistemica(icDimScores, ilDimScores, n)
    if (bolhaSistemica) allAlerts.push(bolhaSistemica)

    // 12b — Questões Âncora (media_ic[q] ≤ 1.5)
    const { alerts: ancorAlerts, anchorQuestions } = detectarQuestoesAncora(mediaIC, n)
    allAlerts.push(...ancorAlerts)

    // 12c — Bloco Crítico Oculto (bloco < 40% dentro de dim ≥ 40%)
    const blocoAlerts = detectarBlocosCriticosOcultos(icBlocoScores, icDimScores, n)
    allAlerts.push(...blocoAlerts)

    // 12d — Baixa Amostragem (n < 3)
    const baixaAmostAlert = detectarBaixaAmostragem(n)
    if (baixaAmostAlert) allAlerts.push(baixaAmostAlert)

    // ──────────────────────────────────────────────────────────
    // PASSO 13: Selecionar laudos pelo nível IC — NUNCA pelo IL
    // ──────────────────────────────────────────────────────────
    const laudoIds = await selecionarLaudos(supabase, icNiveis, n)

    // ──────────────────────────────────────────────────────────
    // PASSO 14: Construir objeto de resultado completo
    // ──────────────────────────────────────────────────────────
    const displayLevel = getDisplayLevel(n, totalCollaborators)

    // Arredonda para 2 casas decimais
    const r2 = (v: number | null) => v !== null ? parseFloat(v.toFixed(2)) : null

    const resultado = {
      diagnostic_id: diagnosticId,

      // IC por dimensão
      ic_fisica_pct:   r2(icDimScores.fisica),
      ic_afetiva_pct:  r2(icDimScores.afetiva),
      ic_racional_pct: r2(icDimScores.racional),
      ic_social_pct:   r2(icDimScores.social),
      ic_cultural_pct: r2(icDimScores.cultural),
      ic_global_pct:   r2(icGlobal),

      // IL por dimensão
      il_fisica_pct:   r2(ilDimScores.fisica),
      il_afetiva_pct:  r2(ilDimScores.afetiva),
      il_racional_pct: r2(ilDimScores.racional),
      il_social_pct:   r2(ilDimScores.social),
      il_cultural_pct: r2(ilDimScores.cultural),
      il_global_pct:   r2(ilGlobal),

      // Combinados
      combined_fisica_pct:   r2(combinedDim.fisica),
      combined_afetiva_pct:  r2(combinedDim.afetiva),
      combined_racional_pct: r2(combinedDim.racional),
      combined_social_pct:   r2(combinedDim.social),
      combined_cultural_pct: r2(combinedDim.cultural),
      combined_global_pct:   r2(combinedGlobal),

      // Gaps (IL − IC)
      gap_fisica:   r2(gaps.fisica),
      gap_afetiva:  r2(gaps.afetiva),
      gap_racional: r2(gaps.racional),
      gap_social:   r2(gaps.social),
      gap_cultural: r2(gaps.cultural),

      // Níveis IC por dimensão (base para laudo)
      nivel_ic_fisica:   icNiveis.fisica,
      nivel_ic_afetiva:  icNiveis.afetiva,
      nivel_ic_racional: icNiveis.racional,
      nivel_ic_social:   icNiveis.social,
      nivel_ic_cultural: icNiveis.cultural,
      nivel_combined:    nivelCombinado,

      // Scores de bloco IC (blocos reais — DECISÃO 001)
      ic_bloco_fa_pct: r2(icBlocoScores['F-A']),
      ic_bloco_fb_pct: r2(icBlocoScores['F-B']),
      ic_bloco_fc_pct: r2(icBlocoScores['F-C']),
      ic_bloco_a1_pct: r2(icBlocoScores['A-1']),
      ic_bloco_a2_pct: r2(icBlocoScores['A-2']),
      ic_bloco_a3_pct: r2(icBlocoScores['A-3']),
      ic_bloco_a4_pct: r2(icBlocoScores['A-4']),
      ic_bloco_a5_pct: r2(icBlocoScores['A-5']),
      ic_bloco_r1_pct: r2(icBlocoScores['R-1']),
      ic_bloco_r2_pct: r2(icBlocoScores['R-2']),
      ic_bloco_r3_pct: r2(icBlocoScores['R-3']),
      ic_bloco_r4_pct: r2(icBlocoScores['R-4']),
      ic_bloco_r5_pct: r2(icBlocoScores['R-5']),
      ic_bloco_sa_pct: r2(icBlocoScores['S-A']),
      ic_bloco_sb_pct: r2(icBlocoScores['S-B']),
      ic_bloco_sc_pct: r2(icBlocoScores['S-C']),
      ic_bloco_ca_pct: r2(icBlocoScores['C-A']),
      ic_bloco_cb_pct: r2(icBlocoScores['C-B']),
      ic_bloco_cc_pct: r2(icBlocoScores['C-C']),

      // Metadados
      n_ic_respondents: n,
      ic_weight:        icWeight,
      il_weight:        ilWeight,
      alerts:           allAlerts,
      anchor_questions: anchorQuestions,
      display_level:    displayLevel,

      // Laudos (selecionados pelo nível IC — NUNCA pelo IL)
      laudo_fisica_id:   laudoIds.fisica,
      laudo_afetiva_id:  laudoIds.afetiva,
      laudo_racional_id: laudoIds.racional,
      laudo_social_id:   laudoIds.social,
      laudo_cultural_id: laudoIds.cultural,
    }

    // ──────────────────────────────────────────────────────────
    // PASSO 15: Salvar resultado + atualizar status diagnóstico
    // ──────────────────────────────────────────────────────────

    // Remove resultado anterior se houver (reprocessamento)
    await supabase
      .from('diagnostic_results')
      .delete()
      .eq('diagnostic_id', diagnosticId)

    const { error: errInsert } = await supabase
      .from('diagnostic_results')
      .insert(resultado)

    if (errInsert) {
      console.error('Erro ao salvar resultado:', errInsert)
      return new Response(JSON.stringify({ error: 'Erro ao salvar resultado', detail: errInsert.message }), { status: 500 })
    }

    // Atualiza status → RELATORIO_GERADO
    await supabase
      .from('diagnostics')
      .update({ status: 'RELATORIO_GERADO' })
      .eq('id', diagnosticId)

    return new Response(
      JSON.stringify({
        success: true,
        diagnostic_id: diagnosticId,
        n_ic_respondents: n,
        ic_weight: icWeight,
        il_weight: ilWeight,
        nivel_combined: nivelCombinado,
        n_alerts: allAlerts.length,
        display_level: displayLevel,
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
      }
    )

  } catch (err) {
    console.error('Erro inesperado no motor de cálculo:', err)
    return new Response(
      JSON.stringify({ error: 'Erro interno', detail: String(err) }),
      { status: 500 }
    )
  }
})
