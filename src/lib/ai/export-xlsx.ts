/**
 * QUANTUM5G — Export XLSX do Plano de Ação IA
 * Usa SheetJS (xlsx) com lazy-load para evitar SSR.
 * 3 abas: Plano de Ação · Ferramentas Prescritas · Perguntas de Devolutiva
 */

import type {
  AiReport,
  AiReportPlanoAcao,
  AiReportFerramenta,
  AiReportPergunta,
  AiReportRoteiro,
} from '@/types/database'

function formatDate(date = new Date()): string {
  return date.toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(/\//g, '-')
}

function safeFilename(company: string): string {
  return company
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9 ]/g, '').trim()
    .replace(/\s+/g, '_')
}

// ─── Larguras de colunas ──────────────────────────────────────

function colWidth(chars: number) { return { wch: chars } }

// ─── Export principal ─────────────────────────────────────────

export async function exportPlanoAcaoXlsx(
  report: AiReport,
  companyName: string,
) {
  // Lazy-load para não poluir o bundle SSR
  const XLSX = await import('xlsx')

  const wb = XLSX.utils.book_new()
  const date = formatDate()

  // ── ABA 1 — Plano de Ação ─────────────────────────────────
  const plano = (report.plano_de_acao ?? []) as AiReportPlanoAcao[]

  const planoRows: Record<string, string>[] = []

  // Cabeçalho de meta
  planoRows.push({
    Dimensão: `Plano de Ação — ${companyName}`,
    Prioridade: `Gerado em ${date}`,
    Narrativa: `Powered by Groq | Quantum5G`,
    Ações: '',
    Prazo: '',
    Responsável: '',
    Status: '',
  })
  planoRows.push({} as Record<string, string>) // linha em branco

  for (const item of plano) {
    planoRows.push({
      Dimensão:    capitalize(item.dimensao),
      Prioridade:  item.prioridade,
      Narrativa:   item.narrativa,
      Ações:       item.acoes.join('\n• '),
      Prazo:       item.prazo,
      Responsável: item.responsavel,
      Status:      '',  // preenchido pelo consultor
    })
  }

  const wsPlano = XLSX.utils.json_to_sheet(planoRows)
  wsPlano['!cols'] = [
    colWidth(14), colWidth(12), colWidth(55), colWidth(55),
    colWidth(12), colWidth(16), colWidth(14),
  ]
  XLSX.utils.book_append_sheet(wb, wsPlano, 'Plano de Ação')

  // ── ABA 2 — Ferramentas Prescritas ────────────────────────
  const ferramentas = (report.ferramentas_prescritas ?? []) as AiReportFerramenta[]

  const ferrRows: Record<string, string>[] = []
  ferrRows.push({
    Ferramenta: `Ferramentas Prescritas — ${companyName}`,
    Dimensão: `Gerado em ${date}`,
    Justificativa: '', 'Como Aplicar': '',
    '30 dias': '', '60 dias': '', '90 dias': '',
  })
  ferrRows.push({} as Record<string, string>)

  for (const f of ferramentas) {
    ferrRows.push({
      Ferramenta:    f.nome,
      Dimensão:      capitalize(f.dimensao),
      Justificativa: f.justificativa_especifica,
      'Como Aplicar': f.como_aplicar,
      '30 dias':     f.resultado_esperado['30_dias'],
      '60 dias':     f.resultado_esperado['60_dias'],
      '90 dias':     f.resultado_esperado['90_dias'],
    })
  }

  const wsFerr = XLSX.utils.json_to_sheet(ferrRows)
  wsFerr['!cols'] = [
    colWidth(25), colWidth(14), colWidth(50), colWidth(50),
    colWidth(30), colWidth(30), colWidth(30),
  ]
  XLSX.utils.book_append_sheet(wb, wsFerr, 'Ferramentas Prescritas')

  // ── ABA 3 — Perguntas de Devolutiva ───────────────────────
  const perguntas = (report.perguntas_aprofundamento ?? []) as AiReportPergunta[]

  const pergRows: Record<string, string>[] = []
  pergRows.push({
    Pergunta: `Perguntas de Devolutiva — ${companyName}`,
    Dimensão: `Gerado em ${date}`,
    Objetivo: '',
  })
  pergRows.push({} as Record<string, string>)

  for (const q of perguntas) {
    pergRows.push({
      Pergunta:  q.pergunta,
      Dimensão:  capitalize(q.dimensao),
      Objetivo:  q.objetivo,
    })
  }

  const wsPergs = XLSX.utils.json_to_sheet(pergRows)
  wsPergs['!cols'] = [colWidth(60), colWidth(14), colWidth(60)]
  XLSX.utils.book_append_sheet(wb, wsPergs, 'Perguntas de Devolutiva')

  // ── ABA 4 — Roteiro de Devolutiva ─────────────────────────
  const roteiro = report.roteiro_devolutiva as AiReportRoteiro | null
  if (roteiro) {
    const rotRows: Record<string, string>[] = [
      { Seção: 'Roteiro de Devolutiva', Conteúdo: companyName },
      {},
      { Seção: 'Abertura', Conteúdo: roteiro.abertura },
      {},
      { Seção: 'Desenvolvimento', Conteúdo: roteiro.desenvolvimento.join('\n') },
      {},
      { Seção: 'Fechamento', Conteúdo: roteiro.fechamento },
      {},
      { Seção: 'Frases de Transição', Conteúdo: (roteiro.frases_de_transicao ?? []).join('\n') },
    ] as Record<string, string>[]

    const wsRot = XLSX.utils.json_to_sheet(rotRows)
    wsRot['!cols'] = [colWidth(22), colWidth(80)]
    XLSX.utils.book_append_sheet(wb, wsRot, 'Roteiro de Devolutiva')
  }

  // ── Salva arquivo ─────────────────────────────────────────
  const fileName = `Plano_Acao_${safeFilename(companyName)}_${date}.xlsx`
  XLSX.writeFile(wb, fileName)
}

function capitalize(s: string) {
  return s.charAt(0).toUpperCase() + s.slice(1)
}
