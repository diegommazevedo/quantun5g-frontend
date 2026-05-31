/**
 * QUANTUM5G — Template HTML do laudo NR-01 para PDF (e visualização print)
 *
 * Patch 009 — reestruturado para conter EXATAMENTE as 12 seções oficiais do
 * NR01_GRO.docx (seção "MODELO DE LAUDO ROBUSTO"), nesta ordem, sem mais, sem
 * menos. Apêndice contém escala Likert aplicada + hashes do pacote de evidências.
 *
 * Removidos do PDF regulatório (permanecem em telas internas):
 *   - Alertas sistêmicos
 *   - Projeção econômica
 *   - Monitoramento contínuo / micro-pulsos
 *   - Bridge com Pentagrama
 *
 * Documento jurídico: preto no branco, serifa para corpo, sem ícones, sem cor
 * exceto barra de progresso cinza no score por dimensão.
 */

import {
  NR01_DIMENSION_LABEL,
  RISK_LEVEL_LABEL,
  type Nr01DimensionCode,
  type Nr01RiskLevel,
} from '@/types/nr01'
import { METHODOLOGY_TEXT_V1_1 } from '@/lib/nr01/evidence'
import { formatTechnicalLeadLine } from '@/lib/nr01/technical-lead'
import { LIKERT_LABELS } from '@/lib/nr01/instrument'
import type { LaudoData } from '@/lib/nr01/pdf-data'

// ============================================================
// HELPERS DE FORMATAÇÃO
// ============================================================

function fmtDateBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function fmtDateTimeBR(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR')
}

function escapeHtml(s: string | null | undefined): string {
  if (!s) return ''
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function mdParaHtml(md: string): string {
  return md
    .split('\n\n')
    .map((block) => {
      const t = block.trim()
      if (!t) return ''
      if (t.startsWith('### ')) return `<h3>${escapeHtml(t.slice(4))}</h3>`
      if (t.startsWith('## '))  return `<h2 class="metodologia-h2">${escapeHtml(t.slice(3))}</h2>`
      if (t.startsWith('# '))   return `<h3>${escapeHtml(t.slice(2))}</h3>`
      // Escape mínimo (preserva * e ` para o markdown inline abaixo)
      const html = t
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
        .replace(/`([^`]+)`/g, '<code>$1</code>')
        .replace(/\n/g, '<br/>')
      return `<p>${html}</p>`
    })
    .join('\n')
}

function meanScore(s: { mean_likert: number | null; score_pct: number | null }): number | null {
  if (s.mean_likert != null) return s.mean_likert
  if (s.score_pct != null) return s.score_pct
  return null
}

function fmtMean(v: number | null): string {
  return v == null ? '—' : v.toFixed(2).replace('.', ',')
}

const RISK_RANK: Record<Nr01RiskLevel, number> = {
  critico: 5,
  elevado: 4,
  atencao: 3,
  baixo: 2,
  muito_baixo: 1,
  sem_dados: 0,
}

// ============================================================
// TEXTOS OFICIAIS FIXOS (NR01_GRO.docx — MODELO DE LAUDO ROBUSTO) — P015: léxico
// ============================================================

const TEXTO_FINALIDADE = `O presente laudo técnico tem por finalidade avaliar os fatores de risco psicossociais relacionados ao trabalho, conforme diretrizes estabelecidas pela NR-01, identificando condições que possam impactar a saúde dos colaboradores, a organização do trabalho e o funcionamento institucional, bem como subsidiar a elaboração de estratégias de prevenção e intervenção.`

const TEXTO_FUNDAMENTACAO_P1 = `Este laudo está fundamentado nas diretrizes da NR-01 — Gerenciamento de Riscos Ocupacionais (GRO), que estabelece a obrigatoriedade da identificação, avaliação e controle dos riscos ocupacionais, incluindo fatores psicossociais relacionados à organização do trabalho.`

const TEXTO_FUNDAMENTACAO_P2 = `A análise considera aspectos vinculados à carga de trabalho, relações interpessoais, estrutura organizacional e exigências emocionais, em consonância com princípios técnicos aplicáveis à saúde ocupacional.`

const TEXTO_METODOLOGIA_P1 = `A avaliação foi realizada por meio de instrumento estruturado de percepção de risco psicossocial, composto por 10 dimensões relacionadas às condições de trabalho e às relações organizacionais.`

const TEXTO_METODOLOGIA_P2 = `O instrumento foi aplicado aos colaboradores de forma confidencial, utilizando escala de resposta tipo Likert (1 a 5), sendo 1 correspondente a menor percepção de risco e 5 a maior percepção de risco.`

const TEXTO_METODOLOGIA_P3 = `Os dados foram analisados quantitativamente por meio de médias por dimensão, permitindo a classificação dos níveis de risco e posterior interpretação técnica.`

const CRITERIOS_FAIXAS: Array<{ faixa: string; classificacao: string }> = [
  { faixa: '1,0 – 1,8', classificacao: 'Risco muito baixo' },
  { faixa: '1,9 – 2,6', classificacao: 'Risco baixo' },
  { faixa: '2,7 – 3,4', classificacao: 'Atenção' },
  { faixa: '3,5 – 4,2', classificacao: 'Risco elevado' },
  { faixa: '4,3 – 5,0', classificacao: 'Risco crítico' },
]

const CONCLUSAO_POR_NIVEL: Record<Nr01RiskLevel, string> = {
  muito_baixo: 'o ambiente organizacional apresenta risco psicossocial muito baixo, em condição favorável. Recomenda-se a manutenção das práticas atuais com monitoramento periódico dos indicadores psicossociais.',
  baixo: 'o ambiente organizacional apresenta risco psicossocial baixo, com fragilidades pontuais que requerem atenção preventiva e ajustes finos na condução das dimensões afetadas.',
  atencao: 'o ambiente organizacional apresenta risco psicossocial em nível de atenção, demandando medidas preventivas estruturadas nas dimensões identificadas, sob pena de progressão para níveis mais críticos caso não haja intervenção tempestiva.',
  elevado: 'o ambiente organizacional apresenta risco psicossocial elevado, demandando intervenção estruturada com foco na reorganização do trabalho, melhoria das relações e redução das exigências sobre os colaboradores.',
  critico: 'o ambiente organizacional apresenta risco psicossocial crítico, demandando intervenção imediata com reavaliação urgente das condições de trabalho e implementação de medidas corretivas prioritárias.',
  sem_dados: 'não foi possível concluir sobre o nível global de risco psicossocial devido a dados insuficientes. Recomenda-se nova avaliação com maior adesão.',
}

const CONCLUSAO_FECHAMENTO = 'As evidências coletadas subsidiam as recomendações técnicas apresentadas nesta avaliação, com plano de acompanhamento e monitoramento contínuo previstos conforme diretrizes da NR-01/GRO.'

// ============================================================
// CSS PRINT A4 — DOCUMENTO TÉCNICO
// ============================================================

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Source+Serif+4:opsz,wght@8..60,400;8..60,600;8..60,700&family=Inter:wght@400;600;700&display=swap');

@page {
  size: A4;
  margin: 22mm 22mm 22mm 22mm;
}

* { box-sizing: border-box; }

html, body {
  margin: 0; padding: 0;
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: 10.5pt; line-height: 1.5;
  color: #111; background: #fff;
}

h1, h2, h3, h4 {
  font-family: 'Inter', system-ui, sans-serif;
  color: #000;
  margin: 0 0 8pt 0;
  page-break-after: avoid;
}
h1 { font-size: 22pt; font-weight: 700; letter-spacing: -0.01em; }
h2 { font-size: 14pt; font-weight: 700; margin-top: 18pt; border-bottom: 1px solid #000; padding-bottom: 3pt; text-transform: uppercase; letter-spacing: 0.02em; }
h3 { font-size: 11.5pt; font-weight: 600; margin-top: 12pt; }
h4 { font-size: 10pt; font-weight: 600; margin-top: 8pt; }
.metodologia-h2 { font-size: 11.5pt; text-transform: none; letter-spacing: 0; border-bottom: none; margin-top: 10pt; }

p { margin: 0 0 6pt 0; text-align: justify; }

/* Capa */
.capa {
  height: 235mm;
  display: flex; flex-direction: column; justify-content: space-between;
  page-break-after: always;
}
.capa .selo {
  font-family: 'Inter', sans-serif; font-size: 10pt;
  letter-spacing: 0.18em; text-transform: uppercase;
  color: #555;
}
.capa .titulo { margin-top: 50mm; }
.capa .titulo h1 {
  font-size: 26pt; line-height: 1.18; letter-spacing: -0.02em; margin-bottom: 6mm;
}
.capa .titulo .subtitulo {
  font-family: 'Inter', sans-serif; font-size: 11pt; color: #333;
}
.capa .meta-bloco {
  font-family: 'Inter', sans-serif; font-size: 9.5pt; color: #333;
  border-top: 1px solid #000; padding-top: 6mm;
}
.capa .meta-bloco dl { display: grid; grid-template-columns: 45mm 1fr; row-gap: 3mm; column-gap: 6mm; margin: 0; }
.capa .meta-bloco dt { color: #666; }
.capa .meta-bloco dd { margin: 0; color: #000; font-weight: 600; }

/* Sumário */
.sumario { page-break-after: always; }
.sumario ol { font-family: 'Inter', sans-serif; font-size: 10.5pt; padding-left: 20pt; }
.sumario li { margin-bottom: 4pt; }

/* Seção (cada uma quebra página antes) */
section.principal {
  page-break-before: always;
}

/* Tabelas */
table { width: 100%; border-collapse: collapse; font-size: 9.5pt; margin: 8pt 0; }
table th, table td {
  text-align: left; padding: 4pt 6pt;
  border-bottom: 1px solid #ccc;
  vertical-align: top;
}
table th {
  font-family: 'Inter', sans-serif; font-weight: 600;
  background: #f5f5f5; border-bottom: 1.5px solid #000;
  font-size: 9pt; text-transform: uppercase; letter-spacing: 0.03em;
}
table.compact th, table.compact td { padding: 3pt 5pt; font-size: 9pt; }

/* Score por dimensão */
.score-row {
  display: grid; grid-template-columns: 60mm 1fr 22mm 28mm;
  gap: 5mm; align-items: center;
  padding: 5pt 0; border-bottom: 1px solid #e5e5e5;
}
.score-row .nome {
  font-family: 'Inter', sans-serif; font-weight: 600; font-size: 10pt;
}
.score-row .barra { background: #eee; height: 6pt; border-radius: 1pt; overflow: hidden; }
.score-row .barra > div { height: 100%; background: #555; }
.score-row .val { font-family: 'Inter', sans-serif; font-size: 10pt; font-weight: 600; text-align: right; }
.score-row .lvl { font-family: 'Inter', sans-serif; font-size: 8.5pt; text-align: right; color: #444; }

.muted { color: #666; }
.badge {
  display: inline-block; padding: 1.5pt 4pt;
  font-family: 'Inter', sans-serif; font-size: 8pt; font-weight: 600;
  border: 1px solid #000; border-radius: 1pt; text-transform: uppercase;
  letter-spacing: 0.04em;
}

.bullets { margin: 4pt 0 6pt 14pt; padding: 0; }
.bullets li { margin-bottom: 2pt; }

.assinatura-bloco {
  margin-top: 30mm;
  padding-top: 4mm;
  font-family: 'Inter', sans-serif; font-size: 9.5pt;
}
.assinatura-bloco .linha-assinatura {
  height: 20mm; border-bottom: 1px solid #000;
  margin-bottom: 3mm;
}
.assinatura-bloco .pre {
  display: grid; grid-template-columns: 1fr 1fr; gap: 8mm;
  font-size: 9pt;
}
.assinatura-bloco .local-data {
  margin-bottom: 18mm;
  font-size: 10pt;
}

.evidencia-hash {
  font-family: 'Courier New', monospace; font-size: 7.5pt;
  word-break: break-all; color: #333;
  background: #f8f8f8; padding: 2pt 4pt; border: 1px solid #ddd;
}

/* Markdown inline (renderizado em mdParaHtml) */
strong { font-weight: 600; }
code {
  font-family: 'Courier New', monospace;
  font-size: 0.92em;
  background: #f3f3f3;
  padding: 1pt 4pt;
  border-radius: 2pt;
}

.evite-quebra { page-break-inside: avoid; }

/* Subseção 7.x — dimensão */
.dim-bloco { margin: 10pt 0 14pt; page-break-inside: avoid; }
.dim-bloco h3 { margin: 0 0 4pt; }
.dim-bloco .dim-meta {
  font-family: 'Inter', sans-serif; font-size: 9pt; color: #444;
  margin-bottom: 4pt;
}
.dim-bloco .laudo-oficial { margin: 4pt 0 0; }
.dim-bloco .laudo-principal { margin-bottom: 5pt; line-height: 1.5; }
.dim-bloco .laudo-recomendacao { color: #333; line-height: 1.5; font-style: italic; }
.dim-bloco .laudo-fallback { font-size: 9pt; color: #999; margin-top: 4pt; }

/* Macro oficial */
.laudo-macro-oficial {
  margin: 12pt 0; padding: 10pt 14pt;
  background: #f7f7f7; border-left: 2pt solid #000;
}
.laudo-macro-oficial p { margin: 0 0 6pt; line-height: 1.5; }
.laudo-macro-oficial p.recomendacao { font-style: italic; color: #333; margin-bottom: 0; }
`

// ============================================================
// CAPA + SUMÁRIO
// ============================================================

function renderCapa(d: LaudoData): string {
  const a = d.assessment
  const r = d.result
  const co = a.companies
  return `
<section class="capa">
  <div>
    <div class="selo">Quantum5G · Laudo Técnico NR-01</div>
    <div class="titulo">
      <h1>Laudo Técnico de Avaliação de Fatores Psicossociais Relacionados ao Trabalho</h1>
      <div class="subtitulo">Conforme diretrizes da NR-01 — Gerenciamento de Riscos Ocupacionais (GRO)</div>
    </div>
  </div>

  <div class="meta-bloco">
    <dl>
      <dt>Empresa</dt><dd>${escapeHtml(co?.name ?? '—')}</dd>
      <dt>Avaliação</dt><dd>${escapeHtml(a.name)}</dd>
      <dt>Período de avaliação</dt><dd>${escapeHtml(a.reference_period ?? '—')}</dd>
      <dt>Data de emissão</dt><dd>${fmtDateBR(d.generatedAt)}</dd>
      <dt>Instrumento</dt><dd>Pentagrama NR-01 ${escapeHtml(a.instrument_version)}</dd>
      <dt>ISO global</dt><dd>${r?.iso_score != null ? fmtMean(r.iso_score) : '—'} · ${r?.iso_risk_level ? RISK_LEVEL_LABEL[r.iso_risk_level] : '—'}</dd>
      <dt>Responsável técnico</dt><dd>${escapeHtml(formatTechnicalLeadLine(a.technical_lead))}</dd>
    </dl>
  </div>
</section>
`
}

function renderSumario(): string {
  const items = [
    '1. Identificação',
    '2. Finalidade',
    '3. Fundamentação técnica',
    '4. Metodologia',
    '5. População avaliada',
    '6. Critérios de classificação',
    '7. Resultados por dimensão',
    '8. Análise global',
    '9. Identificação dos riscos psicossociais',
    '10. Recomendações',
    '11. Conclusão',
    '12. Responsabilidade técnica',
    'Apêndice — Escala Likert e pacote de evidências',
  ]
  return `
<section class="sumario principal">
  <h2>Sumário</h2>
  <ol>${items.map((i) => `<li>${escapeHtml(i.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
</section>
`
}

// ============================================================
// 1. IDENTIFICAÇÃO
// ============================================================

function renderSecao1_Identificacao(d: LaudoData): string {
  const a = d.assessment
  const co = a.companies
  return `
<section class="principal">
  <h2>1. Identificação</h2>
  <table class="compact">
    <tr><th style="width: 45mm;">Empresa</th><td>${escapeHtml(co?.name ?? '—')}</td></tr>
    <tr><th>Avaliação</th><td>${escapeHtml(a.name)}</td></tr>
    <tr><th>Responsável técnico</th><td>${escapeHtml(a.technical_lead.name)}</td></tr>
    <tr><th>Profissão</th><td>${escapeHtml(a.technical_lead.profession ?? '—')}</td></tr>
    <tr><th>Registro profissional</th><td>${escapeHtml(a.technical_lead.crp ?? '—')}</td></tr>
    <tr><th>Período de avaliação</th><td>${escapeHtml(a.reference_period ?? '—')}</td></tr>
    <tr><th>Data de emissão</th><td>${fmtDateBR(d.generatedAt)}</td></tr>
  </table>
</section>
`
}

// ============================================================
// 2. FINALIDADE
// ============================================================

function renderSecao2_Finalidade(): string {
  return `
<section class="principal">
  <h2>2. Finalidade</h2>
  <p>${escapeHtml(TEXTO_FINALIDADE)}</p>
</section>
`
}

// ============================================================
// 3. FUNDAMENTAÇÃO TÉCNICA
// ============================================================

function renderSecao3_Fundamentacao(): string {
  return `
<section class="principal">
  <h2>3. Fundamentação técnica</h2>
  <p>${escapeHtml(TEXTO_FUNDAMENTACAO_P1)}</p>
  <p>${escapeHtml(TEXTO_FUNDAMENTACAO_P2)}</p>
</section>
`
}

// ============================================================
// 4. METODOLOGIA
// ============================================================

function renderSecao4_Metodologia(): string {
  return `
<section class="principal">
  <h2>4. Metodologia</h2>
  <p>${escapeHtml(TEXTO_METODOLOGIA_P1)}</p>
  <p>${escapeHtml(TEXTO_METODOLOGIA_P2)}</p>
  <p>${escapeHtml(TEXTO_METODOLOGIA_P3)}</p>
  <h3>Detalhamento metodológico (versão v1.1)</h3>
  ${mdParaHtml(METHODOLOGY_TEXT_V1_1)}
</section>
`
}

// ============================================================
// 5. POPULAÇÃO AVALIADA
// ============================================================

function renderSecao5_Populacao(d: LaudoData): string {
  const r = d.result
  const pack = d.evidencePack
  const co = d.assessment.companies
  const totalCol = co?.total_collaborators ?? null
  const respostas = pack?.total_responses_complete ?? r?.total_responses ?? null
  const adesao = pack?.adherence_pct ?? r?.adherence_pct ?? null
  const adesaoStr = adesao != null ? adesao.toFixed(1).replace('.', ',') + '%' : '—'

  return `
<section class="principal">
  <h2>5. População avaliada</h2>
  <p>
    Participaram da avaliação <strong>${respostas ?? '—'}</strong>
    ${respostas === 1 ? 'colaborador' : 'colaboradores'}${totalCol ? `, em um quadro funcional total de <strong>${totalCol}</strong>` : ''},
    representando uma adesão de <strong>${adesaoStr}</strong> no período da coleta.
  </p>
  <p>A adesão ao instrumento foi considerada${adesao != null && adesao >= 60 ? ' satisfatória' : ' parcial'} para análise representativa do ambiente organizacional, respeitando o critério de k-anonymity ≥ ${d.assessment.k_anonymity_min} respondentes por corte.</p>
  <table class="compact">
    <tr><th style="width: 60mm;">Convites enviados</th><td>${pack?.total_invites_sent ?? r?.total_invites ?? '—'}</td></tr>
    <tr><th>Respostas completas</th><td>${respostas ?? '—'}</td></tr>
    <tr><th>Adesão</th><td>${adesaoStr}</td></tr>
    <tr><th>Janela de coleta — abertura</th><td>${fmtDateTimeBR(pack?.collection_started_at)}</td></tr>
    <tr><th>Janela de coleta — encerramento</th><td>${fmtDateTimeBR(pack?.collection_ended_at)}</td></tr>
    <tr><th>k-anonymity mínimo</th><td>${d.assessment.k_anonymity_min} respondentes por corte</td></tr>
  </table>
</section>
`
}

// ============================================================
// 6. CRITÉRIOS DE CLASSIFICAÇÃO
// ============================================================

function renderSecao6_Criterios(): string {
  const linhas = CRITERIOS_FAIXAS.map(
    (c) => `<tr><td><strong>${escapeHtml(c.faixa)}</strong></td><td>${escapeHtml(c.classificacao)}</td></tr>`,
  ).join('')
  return `
<section class="principal">
  <h2>6. Critérios de classificação</h2>
  <p>A classificação do nível de risco por dimensão e do índice global utiliza as seguintes faixas, na escala Likert 1,0–5,0 (oficial v1.1):</p>
  <table class="compact">
    <thead><tr><th style="width: 40mm;">Faixa (média Likert)</th><th>Classificação de risco</th></tr></thead>
    <tbody>${linhas}</tbody>
  </table>
  <p class="muted">Nota: maior valor na escala Likert corresponde a maior percepção de risco. Questões com enunciado direcionado já são tratadas no extrator oficial, sem necessidade de inversão posterior.</p>
</section>
`
}

// ============================================================
// 7. RESULTADOS POR DIMENSÃO
// ============================================================

function renderSecao7_Resultados(d: LaudoData): string {
  const dimMap = new Map<Nr01DimensionCode, { name: string; ord: number; clause: string }>(
    d.dimensions.map((dim) => [dim.code, { name: dim.name, ord: dim.ord, clause: dim.nr01_clause }]),
  )

  const ordenados = [...d.dimensionScores].sort((a, b) => {
    const oa = dimMap.get(a.dimension_code)?.ord ?? 999
    const ob = dimMap.get(b.dimension_code)?.ord ?? 999
    return oa - ob
  })

  const blocos = ordenados.map((s, idx) => {
    const meta = dimMap.get(s.dimension_code)
    const nome = meta?.name ?? s.dimension_code
    const subnum = `7.${idx + 1}`
    const valor = meanScore(s)
    const valorStr = fmtMean(valor)
    const lvl = RISK_LEVEL_LABEL[s.risk_level]
    const barraPct = valor != null ? Math.max(2, Math.min(100, (valor / 5) * 100)) : 0

    let laudoBlock = ''
    if (s.risk_level !== 'sem_dados') {
      const laudo = d.laudoTextos.get(`${s.dimension_code}::${s.risk_level}`)
      if (laudo) {
        laudoBlock = `
  <div class="laudo-oficial">
    <p class="laudo-principal">${escapeHtml(laudo.texto_principal)}</p>
    <p class="laudo-recomendacao">${escapeHtml(laudo.texto_recomendacao)}</p>
  </div>`
      } else {
        laudoBlock = `<p class="laudo-fallback"><em>Texto oficial v1.1 não encontrado para esta combinação dimensão × nível.</em></p>`
      }
    } else {
      laudoBlock = `<p class="laudo-fallback"><em>Sem dados suficientes nesta dimensão para emissão de laudo (n &lt; k-anonymity).</em></p>`
    }

    return `
<div class="dim-bloco">
  <h3>${escapeHtml(subnum)} ${escapeHtml(nome)}</h3>
  <div class="score-row">
    <div class="nome">Classificação</div>
    <div class="barra"><div style="width: ${barraPct}%"></div></div>
    <div class="val">${valorStr}</div>
    <div class="lvl">${escapeHtml(lvl)}</div>
  </div>
  <div class="dim-meta">
    Referência normativa: <em>${escapeHtml(meta?.clause ?? '—')}</em>
    · n = ${s.n_respondents}
    · desvio ${fmtMean(s.stddev_likert)}
  </div>
  ${laudoBlock}
</div>
`
  }).join('')

  return `
<section class="principal">
  <h2>7. Resultados por dimensão</h2>
  <p>Os resultados a seguir apresentam a média Likert (1,0–5,0) por dimensão, sua classificação de risco conforme os critérios da seção 6, e o laudo técnico oficial v1.1 correspondente.</p>
  ${blocos}
</section>
`
}

// ============================================================
// 8. ANÁLISE GLOBAL
// ============================================================

function renderSecao8_AnaliseGlobal(d: LaudoData): string {
  const r = d.result
  if (!r) {
    return `
<section class="principal">
  <h2>8. Análise global</h2>
  <p>O Índice de Saúde Organizacional (ISO) ainda não foi calculado para esta avaliação.</p>
</section>
`
  }

  const dimMap = new Map<Nr01DimensionCode, string>(
    d.dimensions.map((dim) => [dim.code, dim.name]),
  )

  const dimComScore = d.dimensionScores.filter(
    (s) => meanScore(s) != null && s.risk_level !== 'sem_dados',
  )

  const topElevadoOuCritico = dimComScore
    .filter((s) => s.risk_level === 'elevado' || s.risk_level === 'critico')
    .sort((a, b) => RISK_RANK[b.risk_level] - RISK_RANK[a.risk_level] || (meanScore(b) ?? 0) - (meanScore(a) ?? 0))
    .slice(0, 3)

  const topAtencao = dimComScore
    .filter((s) => s.risk_level === 'atencao')
    .sort((a, b) => (meanScore(b) ?? 0) - (meanScore(a) ?? 0))
    .slice(0, 3)

  const macro = d.laudoMacrosByLevel.get(r.iso_risk_level)

  let blocoCriticas: string
  if (topElevadoOuCritico.length > 0) {
    // Cenário 1: há dimensões em elevado/crítico
    blocoCriticas = `
  <p><strong>Dimensões com maior risco identificado:</strong></p>
  <ul class="bullets">
    ${topElevadoOuCritico.map((s) =>
      `<li>${escapeHtml(dimMap.get(s.dimension_code) ?? s.dimension_code)} (${fmtMean(meanScore(s))} · ${escapeHtml(RISK_LEVEL_LABEL[s.risk_level])})</li>`,
    ).join('')}
  </ul>`
  } else if (topAtencao.length > 0) {
    // Cenário 2: nenhuma em elevado/crítico, mas há em atenção
    blocoCriticas = `
  <p><strong>Dimensões com maior nível de atenção identificado:</strong></p>
  <ul class="bullets">
    ${topAtencao.map((s) =>
      `<li>${escapeHtml(dimMap.get(s.dimension_code) ?? s.dimension_code)} (${fmtMean(meanScore(s))} · ${escapeHtml(RISK_LEVEL_LABEL[s.risk_level])})</li>`,
    ).join('')}
  </ul>
  <p class="muted">Nenhuma dimensão atingiu níveis elevado ou crítico nesta avaliação. As dimensões acima representam os pontos de maior atenção identificados, recomendando-se medidas preventivas estruturadas conforme detalhado nas seções subsequentes.</p>`
  } else {
    // Cenário 3: tudo em risco baixo ou muito baixo
    blocoCriticas = `
  <p>Nenhuma dimensão apresentou risco em níveis de atenção, elevado ou crítico na presente avaliação. Recomenda-se manutenção das práticas atuais com monitoramento periódico dos indicadores psicossociais.</p>`
  }

  return `
<section class="principal">
  <h2>8. Análise global</h2>
  <table class="compact">
    <tr><th style="width: 60mm;">ISO global (Likert 1,0–5,0)</th><td><strong>${fmtMean(r.iso_score)}</strong></td></tr>
    <tr><th>Nível de risco</th><td>${escapeHtml(RISK_LEVEL_LABEL[r.iso_risk_level])}</td></tr>
    <tr><th>Calculado em</th><td>${fmtDateTimeBR(r.calculated_at)}</td></tr>
  </table>

  <h3>Dimensões mais críticas identificadas</h3>
  ${blocoCriticas}

  ${macro ? `
  <div class="laudo-macro-oficial evite-quebra">
    <p>${escapeHtml(macro.texto_principal)}</p>
    <p class="recomendacao">${escapeHtml(macro.texto_recomendacao)}</p>
  </div>
  ` : '<p><em>Texto macro oficial v1.1 não encontrado para o nível atual.</em></p>'}
</section>
`
}

// ============================================================
// 9. IDENTIFICAÇÃO DOS RISCOS PSICOSSOCIAIS
// ============================================================

function renderSecao9_Riscos(d: LaudoData): string {
  const dimMap = new Map<Nr01DimensionCode, string>(
    d.dimensions.map((dim) => [dim.code, dim.name]),
  )
  const emRisco = [...d.dimensionScores]
    .filter((s) => s.risk_level === 'atencao' || s.risk_level === 'elevado' || s.risk_level === 'critico')
    .sort((a, b) => RISK_RANK[b.risk_level] - RISK_RANK[a.risk_level] || (meanScore(b) ?? 0) - (meanScore(a) ?? 0))

  if (emRisco.length === 0) {
    return `
<section class="principal">
  <h2>9. Identificação dos riscos psicossociais</h2>
  <p>Nesta avaliação não foram identificadas dimensões classificadas em atenção, risco elevado ou risco crítico. Recomenda-se manutenção das práticas vigentes e monitoramento periódico conforme NR-01.</p>
</section>
`
  }

  const itens = emRisco.map((s) => {
    const nome = dimMap.get(s.dimension_code) ?? s.dimension_code
    const ancoras = (s.anchor_items ?? []).slice(0, 2).map((a) => escapeHtml(a.text)).join(' · ')
    return `<li><strong>${escapeHtml(nome)}</strong> — ${escapeHtml(RISK_LEVEL_LABEL[s.risk_level])} (média ${fmtMean(meanScore(s))})${ancoras ? `<br/><span class="muted" style="font-size: 9pt;">Itens-âncora: ${ancoras}</span>` : ''}</li>`
  }).join('')

  return `
<section class="principal">
  <h2>9. Identificação dos riscos psicossociais</h2>
  <p>Foram identificados os seguintes fatores de risco psicossocial relacionados ao trabalho, ordenados por severidade:</p>
  <ol class="bullets">${itens}</ol>
</section>
`
}

// ============================================================
// 10. RECOMENDAÇÕES
// ============================================================

function renderSecao10_Recomendacoes(d: LaudoData): string {
  const planoAtivo = d.actionPlan && (d.actionPlan.status === 'aprovado' || d.actionPlan.status === 'em_execucao' || d.actionPlan.status === 'concluido')

  if (planoAtivo && d.actionItems.length > 0) {
    const itens = d.actionItems.map((it) => `
      <tr>
        <td>${escapeHtml(it.priority)}</td>
        <td>${escapeHtml(NR01_DIMENSION_LABEL[it.dimension_code as Nr01DimensionCode] ?? it.dimension_code)}</td>
        <td><strong>${escapeHtml(it.title)}</strong>${it.description ? `<br/><span class="muted" style="font-size: 8.5pt;">${escapeHtml(it.description)}</span>` : ''}${Array.isArray(it.rollout_steps) && it.rollout_steps.length > 0 ? `<br/><span class="muted" style="font-size: 8pt;">Passos: ${it.rollout_steps.map((s) => typeof s === 'string' ? s : s.descricao).join(' · ')}</span>` : ''}</td>
        <td>${escapeHtml(it.owner_name)}</td>
        <td>${fmtDateBR(it.due_date)}</td>
        <td>${escapeHtml(it.kpi ?? '—')}</td>
        <td>${escapeHtml(it.status)}</td>
      </tr>
    `).join('')
    return `
<section class="principal">
  <h2>10. Recomendações</h2>
  <p>
    Com base nos riscos identificados, foi aprovado plano de ação técnico
    com status <strong>${escapeHtml(d.actionPlan!.status)}</strong>${d.actionPlan!.approved_at ? `, em ${fmtDateBR(d.actionPlan!.approved_at)}` : ''}${d.actionPlan!.next_review_at ? `, com próxima revisão em ${fmtDateBR(d.actionPlan!.next_review_at)}` : ''}.
  </p>
  <table class="compact">
    <thead>
      <tr><th>Prio</th><th>Dimensão</th><th>Ação</th><th>Responsável</th><th>Prazo</th><th>KPI</th><th>Status</th></tr>
    </thead>
    <tbody>${itens}</tbody>
  </table>
</section>
`
  }

  // Sem plano aprovado: recomendações oficiais extraídas dos textos micro das dimensões em risco
  const dimMap = new Map<Nr01DimensionCode, string>(
    d.dimensions.map((dim) => [dim.code, dim.name]),
  )
  const emRisco = [...d.dimensionScores]
    .filter((s) => s.risk_level === 'atencao' || s.risk_level === 'elevado' || s.risk_level === 'critico')
    .sort((a, b) => RISK_RANK[b.risk_level] - RISK_RANK[a.risk_level])

  if (emRisco.length === 0) {
    return `
<section class="principal">
  <h2>10. Recomendações</h2>
  <p>Recomenda-se a manutenção das práticas atuais de gestão de fatores psicossociais, com monitoramento periódico conforme NR-01 e reavaliação no próximo ciclo.</p>
</section>
`
  }

  const itens = emRisco.map((s) => {
    const nome = dimMap.get(s.dimension_code) ?? s.dimension_code
    const laudo = d.laudoTextos.get(`${s.dimension_code}::${s.risk_level}`)
    if (!laudo) return `<li><strong>${escapeHtml(nome)}</strong> — recomendação oficial indisponível.</li>`
    return `<li><strong>${escapeHtml(nome)}</strong> — ${escapeHtml(laudo.texto_recomendacao)}</li>`
  }).join('')

  return `
<section class="principal">
  <h2>10. Recomendações</h2>
  <p>Com base nos riscos identificados na seção 9, recomendam-se as seguintes intervenções (textos oficiais v1.1, ordenados por severidade):</p>
  <ol class="bullets">${itens}</ol>
  <p class="muted">A formalização destas recomendações em plano de ação aprovado, com responsáveis nomeados, prazos e indicadores, integra a próxima etapa do ciclo de gerenciamento conforme NR-01.</p>
</section>
`
}

// ============================================================
// 11. CONCLUSÃO
// ============================================================

function renderSecao11_Conclusao(d: LaudoData): string {
  const nivel: Nr01RiskLevel = d.result?.iso_risk_level ?? 'sem_dados'
  const corpo = CONCLUSAO_POR_NIVEL[nivel]
  return `
<section class="principal">
  <h2>11. Conclusão</h2>
  <p>Conclui-se que ${escapeHtml(corpo)} ${escapeHtml(CONCLUSAO_FECHAMENTO)}</p>
</section>
`
}

// ============================================================
// 12. RESPONSABILIDADE TÉCNICA
// ============================================================

function renderSecao12_Responsabilidade(d: LaudoData): string {
  const rt = d.assessment.technical_lead
  const lead = rt.name
  const crp = rt.crp ?? '—'
  const prof = rt.profession ?? ''
  return `
<section class="principal">
  <h2>12. Responsabilidade técnica</h2>
  <p>O abaixo-assinado declara, sob as penas da lei, que esta avaliação foi conduzida conforme a metodologia descrita na seção 4 deste documento, com instrumento oficial v1.1 cuja integridade pode ser auditada via hash SHA-256 declarado no apêndice (pacote de evidências). Assume-se responsabilidade técnica pelos resultados aqui apresentados, permanecendo este laudo válido até a próxima reavaliação periódica conforme NR-01.</p>

  <div class="assinatura-bloco evite-quebra">
    <div class="local-data">
      Local: ____________________________ &nbsp; Data: ${fmtDateBR(d.generatedAt)}
    </div>
    <div class="linha-assinatura"></div>
    <div class="pre">
      <div>
        <div><strong>${escapeHtml(lead)}</strong></div>
        ${prof ? `<div>${escapeHtml(prof)}</div>` : ''}
        <div>${escapeHtml(crp)}</div>
        <div>Responsável Técnico</div>
      </div>
      <div></div>
    </div>
  </div>
</section>
`
}

// ============================================================
// APÊNDICE — Escala Likert + Pacote de evidências
// ============================================================

function renderApendice(d: LaudoData): string {
  const escala = LIKERT_LABELS.map((l) => `<li><strong>${l.value}</strong> — ${escapeHtml(l.label)}</li>`).join('')

  const p = d.evidencePack
  const hashesTabela = p ? `
  <table class="compact">
    <tr><th style="width: 60mm;">Hash do instrumento (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.instrument_sha256)}</span></td></tr>
    <tr><th>Hash dos laudos oficiais (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.laudos_pack_sha256 ?? '—')}</span></td></tr>
    <tr><th>Hash do pacote (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.pack_sha256)}</span></td></tr>
    <tr><th>Hash do PDF (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.pdf_sha256 ?? '— (gerado após emissão)')}</span></td></tr>
    <tr><th>Metodologia (versão)</th><td>${escapeHtml(p.methodology_version)}</td></tr>
    <tr><th>Pacote gerado em</th><td>${fmtDateTimeBR(p.generated_at)}</td></tr>
  </table>
  ` : '<p><em>Pacote de evidências ainda não emitido.</em></p>'

  return `
<section class="principal">
  <h2>Apêndice — Escala Likert e pacote de evidências</h2>

  <h3>Escala Likert aplicada</h3>
  <ol class="bullets">${escala}</ol>
  <p class="muted">Escala oficial v1.1: 1 = menor percepção de risco; 5 = maior percepção de risco.</p>

  <h3>Pacote de evidências (trilha de auditoria)</h3>
  <p>Hashes SHA-256 que asseguram a integridade do instrumento, dos laudos oficiais, do pacote consolidado e do PDF emitido. Apresentar este conteúdo em fiscalização para comprovar metodologia, instrumento aplicado e adesão.</p>
  ${hashesTabela}
</section>
`
}

// ============================================================
// FUNÇÃO PRINCIPAL
// ============================================================

export function buildLaudoHtml(d: LaudoData): string {
  return `
<!doctype html>
<html lang="pt-BR">
<head>
  <meta charset="utf-8" />
  <title>Laudo Técnico NR-01 — ${escapeHtml(d.assessment.companies?.name ?? '')}</title>
  <style>${CSS}</style>
</head>
<body>
${renderCapa(d)}
${renderSumario()}
${renderSecao1_Identificacao(d)}
${renderSecao2_Finalidade()}
${renderSecao3_Fundamentacao()}
${renderSecao4_Metodologia()}
${renderSecao5_Populacao(d)}
${renderSecao6_Criterios()}
${renderSecao7_Resultados(d)}
${renderSecao8_AnaliseGlobal(d)}
${renderSecao9_Riscos(d)}
${renderSecao10_Recomendacoes(d)}
${renderSecao11_Conclusao(d)}
${renderSecao12_Responsabilidade(d)}
${renderApendice(d)}
</body>
</html>
`.trim()
}
