/**
 * QUANTUM5G — Smart Chips
 * Gera chips de prompt dinâmicos baseados nos dados reais do diagnóstico.
 */

import { QUESTOES } from '@/lib/questions'
import type { DiagnosticResult, AiReport } from '@/types/database'

export interface SmartChip {
  label:  string
  prompt: string
}

export interface ChipCategory {
  title: string
  chips: SmartChip[]
}

const DIM_LABEL: Record<string, string> = {
  fisica: 'Física', afetiva: 'Afetiva', racional: 'Racional',
  social: 'Social', cultural: 'Cultural',
}

const DIMS = ['fisica', 'afetiva', 'racional', 'social', 'cultural'] as const

export function generateSmartChips(
  result: DiagnosticResult,
  aiReport: AiReport | null,
): ChipCategory[] {
  const categories: ChipCategory[] = []

  // ── 1. Pontos Críticos ──────────────────────────────────────────
  const criticos: SmartChip[] = []

  // Dimensões críticas ou vulneráveis
  for (const d of DIMS) {
    const nivel = result[`nivel_ic_${d}` as keyof DiagnosticResult] as string | null
    if (nivel === 'critico') {
      criticos.push({
        label: `${DIM_LABEL[d]} crítica`,
        prompt: `Aprofunde a análise da dimensão ${DIM_LABEL[d]} que está em nível crítico. O que isso revela sobre o campo organizacional?`,
      })
    }
  }

  // Questões âncora
  for (const q of (result.anchor_questions ?? []).slice(0, 2)) {
    const questao = QUESTOES.find(x => x.n === q.questao)
    if (questao) {
      criticos.push({
        label: `Âncora Q${q.questao}`,
        prompt: `Analise a Questão Âncora Q${q.questao}: "${questao.ic}" com média ${q.media.toFixed(1)}. O que essa questão revela sobre a dinâmica desta organização?`,
      })
    }
  }

  // Alertas
  for (const a of (result.alerts ?? []).slice(0, 2)) {
    if (a.tipo === 'BOLHA_SISTEMICA') {
      criticos.push({
        label: 'Bolha Sistêmica',
        prompt: `Analise a Bolha Sistêmica detectada: ${a.descricao}. O que esse padrão defensivo revela sobre a liderança?`,
      })
    } else if (a.tipo === 'BLOCO_CRITICO_OCULTO') {
      criticos.push({
        label: 'Bloco crítico oculto',
        prompt: `Existe um bloco crítico oculto: ${a.descricao}. Por que esse ponto fraco está invisível na visão geral?`,
      })
    }
  }

  if (criticos.length > 0) {
    categories.push({ title: 'Pontos Críticos', chips: criticos.slice(0, 4) })
  }

  // ── 2. Gaps e Percepção ─────────────────────────────────────────
  const gaps: SmartChip[] = []

  // Top 2 maiores gaps
  const gapEntries = DIMS
    .map(d => ({
      dim: d,
      gap: result[`gap_${d}` as keyof DiagnosticResult] as number | null,
    }))
    .filter(e => e.gap !== null)
    .sort((a, b) => Math.abs(b.gap!) - Math.abs(a.gap!))
    .slice(0, 2)

  for (const { dim, gap } of gapEntries) {
    if (Math.abs(gap!) > 5) {
      gaps.push({
        label: `Gap ${DIM_LABEL[dim]}`,
        prompt: `O gap de ${gap! > 0 ? '+' : ''}${gap!.toFixed(0)}pp na dimensão ${DIM_LABEL[dim]} entre a percepção da liderança e dos colaboradores — o que isso revela sobre a dinâmica desta organização?`,
      })
    }
  }

  // Padrão sistêmico
  const dimsCriticas = DIMS.filter(d => {
    const n = result[`nivel_ic_${d}` as keyof DiagnosticResult] as string | null
    return n === 'critico' || n === 'vulneravel'
  })
  if (dimsCriticas.length >= 2) {
    gaps.push({
      label: 'Padrão sistêmico',
      prompt: `Que padrão sistêmico emerge da conexão entre ${dimsCriticas.map(d => DIM_LABEL[d]).join(' e ')} — ambas em dificuldade?`,
    })
  }

  if (gaps.length > 0) {
    categories.push({ title: 'Gaps e Percepção', chips: gaps.slice(0, 4) })
  }

  // ── 3. Plano de Ação ────────────────────────────────────────────
  const plano: SmartChip[] = [
    {
      label: 'Plano 30/60/90',
      prompt: 'Monte um plano de 30/60/90 dias priorizando o mais urgente para esta empresa.',
    },
    {
      label: 'Primeira ação',
      prompt: 'Qual a primeira ação que o líder deve tomar amanhã de manhã com base neste diagnóstico?',
    },
  ]

  // Do AI report — ferramentas P1
  if (aiReport?.ferramentas_prescritas) {
    const ferramentas = aiReport.ferramentas_prescritas as Array<{ nome: string; dimensao: string }>
    const primeira = ferramentas[0]
    if (primeira) {
      plano.push({
        label: `Aplicar ${primeira.nome}`,
        prompt: `Como aplicar a ferramenta "${primeira.nome}" (${DIM_LABEL[primeira.dimensao] ?? primeira.dimensao}) no contexto específico desta empresa? Detalhe o passo a passo.`,
      })
    }
  }

  categories.push({ title: 'Plano de Ação', chips: plano.slice(0, 4) })

  // ── 4. Devolutiva ───────────────────────────────────────────────
  const devolutiva: SmartChip[] = [
    {
      label: 'Abrir devolutiva',
      prompt: 'Sugira como abrir a reunião de devolutiva considerando o nível de maturidade revelado neste diagnóstico.',
    },
    {
      label: 'Ordem das dimensões',
      prompt: 'Em que ordem devo apresentar as dimensões na devolutiva? Justifique pela lógica de impacto.',
    },
    {
      label: 'Resistência',
      prompt: 'Que resistências posso encontrar ao apresentar estes resultados e como lidar com elas?',
    },
  ]

  categories.push({ title: 'Devolutiva', chips: devolutiva })

  return categories
}
