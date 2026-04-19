/**
 * QUANTUM5G — Template HTML do laudo NR-01 para PDF (e visualização print)
 *
 * Função pura: recebe LaudoData → devolve HTML completo (string).
 * CSS embed (sem dependência externa). Tipografia Source Serif 4 + Inter via
 * @import do Google Fonts — funciona em browser e no Chromium serverless.
 *
 * Documento jurídico: preto no branco, serifa para corpo, sem ícones, sem cor
 * exceto barra de progresso cinza no score por dimensão.
 *
 * Aproximadamente 25 páginas A4 quando preenchido.
 */

import {
  RISK_LEVEL_LABEL,
  type Nr01DimensionCode,
} from '@/types/nr01'
import {
  METHODOLOGY_TEXT_V1_0,
} from '@/lib/nr01/evidence'
import { LIKERT_LABELS } from '@/lib/nr01/instrument'
import { formatBrl } from '@/lib/nr01/economic'
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
  // Conversor minúsculo de markdown — só ##, ###, parágrafos e bold.
  // Suficiente para METHODOLOGY_TEXT_V1_0; nada além.
  return md
    .split('\n\n')
    .map((block) => {
      const t = block.trim()
      if (!t) return ''
      if (t.startsWith('### ')) return `<h3>${escapeHtml(t.slice(4))}</h3>`
      if (t.startsWith('## '))  return `<h2>${escapeHtml(t.slice(3))}</h2>`
      if (t.startsWith('# '))   return `<h1>${escapeHtml(t.slice(2))}</h1>`
      const html = escapeHtml(t)
        .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
        .replace(/\n/g, '<br/>')
      return `<p>${html}</p>`
    })
    .join('\n')
}

// ============================================================
// CSS PRINT A4
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
h2 { font-size: 14pt; font-weight: 700; margin-top: 18pt; border-bottom: 1px solid #000; padding-bottom: 3pt; }
h3 { font-size: 11.5pt; font-weight: 600; margin-top: 12pt; }
h4 { font-size: 10pt; font-weight: 600; margin-top: 8pt; }

p { margin: 0 0 6pt 0; }

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
.capa .titulo { margin-top: 60mm; }
.capa .titulo h1 {
  font-size: 28pt; line-height: 1.15; letter-spacing: -0.02em; margin-bottom: 6mm;
}
.capa .titulo .subtitulo {
  font-family: 'Inter', sans-serif; font-size: 11pt; color: #333;
}
.capa .meta-bloco {
  font-family: 'Inter', sans-serif; font-size: 9.5pt; color: #333;
  border-top: 1px solid #000; padding-top: 6mm;
}
.capa .meta-bloco dl { display: grid; grid-template-columns: 40mm 1fr; row-gap: 3mm; column-gap: 6mm; margin: 0; }
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

/* Score por dimensão — ÚNICA cor permitida (cinza) */
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

.alert {
  border-left: 3pt solid #000;
  padding: 5pt 8pt;
  margin: 6pt 0;
  background: #f9f9f9;
}
.alert .tipo {
  font-family: 'Inter', sans-serif; font-weight: 700;
  font-size: 9pt; text-transform: uppercase; letter-spacing: 0.04em;
}

.bullets { margin: 4pt 0 6pt 14pt; padding: 0; }
.bullets li { margin-bottom: 2pt; }

.assinatura-bloco {
  margin-top: 30mm;
  padding-top: 4mm;
  border-top: 1px solid #000;
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

.evidencia-hash {
  font-family: 'Courier New', monospace; font-size: 7.5pt;
  word-break: break-all; color: #333;
  background: #f8f8f8; padding: 2pt 4pt; border: 1px solid #ddd;
}

.footer-pagina {
  position: running(footer);
  font-family: 'Inter', sans-serif; font-size: 7.5pt; color: #666;
  text-align: center;
}
@page { @bottom-center { content: element(footer); } }

.pulo-pagina { page-break-before: always; }
.evite-quebra { page-break-inside: avoid; }
`

// ============================================================
// SEÇÕES INDIVIDUAIS
// ============================================================

function rendCapa(d: LaudoData): string {
  const a = d.assessment
  const r = d.result
  const co = a.companies
  const pack = d.evidencePack
  return `
<section class="capa">
  <div>
    <div class="selo">Quantum5G · Laudo Técnico NR-01</div>
    <div class="titulo">
      <h1>Laudo Técnico de Avaliação de Fatores de Risco Psicossocial Relacionados ao Trabalho</h1>
      <div class="subtitulo">Conformidade com NR-01/GRO · Portarias MTE 1.419/2024 e 765/2025</div>
    </div>
  </div>

  <div class="meta-bloco">
    <dl>
      <dt>Empresa</dt><dd>${escapeHtml(co?.name ?? '—')}</dd>
      <dt>Trabalhadores</dt><dd>${co?.total_collaborators ?? '—'}</dd>
      <dt>Avaliação</dt><dd>${escapeHtml(a.name)}</dd>
      <dt>Período</dt><dd>${escapeHtml(a.reference_period ?? '—')}</dd>
      <dt>Instrumento</dt><dd>Pentagrama NR-01 ${escapeHtml(a.instrument_version)}</dd>
      <dt>Modalidade</dt><dd>${escapeHtml(a.modality)}</dd>
      <dt>Data de emissão</dt><dd>${fmtDateBR(d.generatedAt)}</dd>
      <dt>ISO global</dt><dd>${r?.iso_score?.toFixed(1) ?? '—'} · ${r?.iso_risk_level ? RISK_LEVEL_LABEL[r.iso_risk_level] : '—'}</dd>
      <dt>Responsável técnico</dt><dd>${escapeHtml(a.technical_lead?.name ?? '—')}${a.technical_lead_crp ? ' · ' + escapeHtml(a.technical_lead_crp) : ''}</dd>
      <dt>Hash do pacote</dt><dd><span class="evidencia-hash">${escapeHtml(pack?.pack_sha256?.slice(0, 32) ?? '—')}…</span></dd>
    </dl>
  </div>
</section>
`
}

function rendSumario(): string {
  const items = [
    '1. Identificação e contexto',
    '2. Metodologia',
    '3. Adesão e amostra',
    '4. Resultado por dimensão NR-01',
    '5. Índice de Saúde Organizacional (ISO)',
    '6. Alertas sistêmicos detectados',
    '7. Plano de ação aprovado',
    '8. Projeção econômica',
    '9. Monitoramento contínuo',
    '10. Pacote de evidências',
    '11. Apêndice — escala de resposta + questões aplicadas',
    '12. Termo de responsabilidade técnica',
  ]
  return `
<section class="sumario principal">
  <h2>Sumário</h2>
  <ol>${items.map((i) => `<li>${escapeHtml(i.replace(/^\d+\.\s*/, ''))}</li>`).join('')}</ol>
</section>
`
}

function rendIdentificacao(d: LaudoData): string {
  const a = d.assessment
  const co = a.companies
  return `
<section class="principal">
  <h2>1. Identificação e contexto</h2>
  <table class="compact">
    <tr><th>Empresa</th><td>${escapeHtml(co?.name ?? '—')}</td></tr>
    <tr><th>Total de trabalhadores</th><td>${co?.total_collaborators ?? '—'}</td></tr>
    <tr><th>Avaliação</th><td>${escapeHtml(a.name)}</td></tr>
    <tr><th>Período de referência</th><td>${escapeHtml(a.reference_period ?? '—')}</td></tr>
    <tr><th>Estado da avaliação</th><td>${escapeHtml(a.status)}</td></tr>
    <tr><th>Instrumento aplicado</th><td>Pentagrama NR-01 ${escapeHtml(a.instrument_version)} (80 questões, 10 dimensões, escala Likert 1-5)</td></tr>
    <tr><th>Modalidade de coleta</th><td>${escapeHtml(a.modality)}</td></tr>
    <tr><th>k-anonymity mínimo</th><td>${a.k_anonymity_min} respondentes por corte</td></tr>
    <tr><th>Vínculo Pentagrama</th><td>${a.linked_diagnostic_id ? 'Sim · ' + escapeHtml(a.linked_diagnostic_id) : 'Não'}</td></tr>
  </table>
</section>
`
}

function rendMetodologia(): string {
  return `
<section class="principal">
  <h2>2. Metodologia</h2>
  ${mdParaHtml(METHODOLOGY_TEXT_V1_0)}
</section>
`
}

function rendAdesao(d: LaudoData): string {
  const r = d.result
  const pack = d.evidencePack
  return `
<section class="principal">
  <h2>3. Adesão e amostra</h2>
  <table class="compact">
    <tr><th>Convites enviados</th><td>${pack?.total_invites_sent ?? r?.total_invites ?? '—'}</td></tr>
    <tr><th>Respostas completas</th><td>${pack?.total_responses_complete ?? r?.total_responses ?? '—'}</td></tr>
    <tr><th>Adesão</th><td>${pack?.adherence_pct?.toFixed(1) ?? r?.adherence_pct?.toFixed(1) ?? '—'}%</td></tr>
    <tr><th>Janela de coleta — abertura</th><td>${fmtDateTimeBR(pack?.collection_started_at)}</td></tr>
    <tr><th>Janela de coleta — encerramento</th><td>${fmtDateTimeBR(pack?.collection_ended_at)}</td></tr>
  </table>
  <p class="muted">Todas as agregações apresentadas atendem ao critério de k-anonymity ≥ ${d.assessment.k_anonymity_min}; cortes com menos respondentes não são exibidos.</p>
</section>
`
}

function rendDimensoes(d: LaudoData): string {
  const dimMap = new Map<Nr01DimensionCode, { name: string; clause: string }>(
    d.dimensions.map((dim) => [dim.code, { name: dim.name, clause: dim.nr01_clause }]),
  )

  const blocos = d.dimensionScores.map((s) => {
    const meta = dimMap.get(s.dimension_code)
    const pct = s.score_pct ?? 0
    const lvl = RISK_LEVEL_LABEL[s.risk_level]
    const anchorList = (s.anchor_items ?? []).map((a) => `
      <li><strong>${escapeHtml(a.text)}</strong><br/><span class="muted">média ${a.mean.toFixed(2)} · questão ${a.ord}</span></li>
    `).join('')
    return `
<div class="evite-quebra" style="margin-bottom: 8pt;">
  <div class="score-row">
    <div class="nome">${escapeHtml(meta?.name ?? s.dimension_code)}</div>
    <div class="barra"><div style="width: ${Math.max(2, pct)}%"></div></div>
    <div class="val">${pct.toFixed(1)}</div>
    <div class="lvl">${escapeHtml(lvl)}</div>
  </div>
  <div style="font-size: 9pt; color: #444; margin: 2pt 0 4pt 0;">
    Referência normativa: <em>${escapeHtml(meta?.clause ?? '—')}</em>
    · n=${s.n_respondents}
    · média Likert ${s.mean_likert?.toFixed(2) ?? '—'}
    · desvio ${s.stddev_likert?.toFixed(2) ?? '—'}
  </div>
  ${s.anchor_items && s.anchor_items.length > 0 ? `
  <div style="font-size: 9pt; margin-top: 3pt;">
    <strong>Itens-âncora (3 piores avaliados):</strong>
    <ol class="bullets" style="font-size: 9pt;">${anchorList}</ol>
  </div>` : ''}
</div>
`
  }).join('')

  return `
<section class="principal">
  <h2>4. Resultado por dimensão NR-01</h2>
  <p class="muted">Score normalizado 0–100, onde 100 representa condição mais saudável. Classificação de risco em cinco faixas: muito baixo, baixo, atenção, elevado, crítico.</p>
  ${blocos}
</section>
`
}

function rendIso(d: LaudoData): string {
  const r = d.result
  if (!r) return ''
  return `
<section class="principal">
  <h2>5. Índice de Saúde Organizacional (ISO)</h2>
  <p>O ISO consolida os scores das dimensões com dados suficientes em uma média ponderada,
  com pesos calibrados conforme o Guia Técnico do MTE.</p>
  <table class="compact">
    <tr><th>ISO global</th><td><strong>${r.iso_score.toFixed(1)} / 100</strong></td></tr>
    <tr><th>Nível de risco</th><td>${RISK_LEVEL_LABEL[r.iso_risk_level]}</td></tr>
    <tr><th>Calculado em</th><td>${fmtDateTimeBR(r.calculated_at)}</td></tr>
  </table>
</section>
`
}

function rendAlertas(d: LaudoData): string {
  const alerts = d.result?.systemic_alerts ?? []
  if (alerts.length === 0) {
    return `
<section class="principal">
  <h2>6. Alertas sistêmicos detectados</h2>
  <p>Nenhum alerta sistêmico crítico foi detectado nesta avaliação.</p>
</section>
`
  }
  return `
<section class="principal">
  <h2>6. Alertas sistêmicos detectados</h2>
  ${alerts.map((al) => `
    <div class="alert evite-quebra">
      <div class="tipo">${escapeHtml(al.tipo)} · severidade ${escapeHtml(al.severidade)}</div>
      <p>${escapeHtml(al.descricao)}</p>
      <p class="muted" style="font-size:8.5pt;">Dimensões envolvidas: ${al.dimensoes.map(escapeHtml).join(', ')}</p>
    </div>
  `).join('')}
</section>
`
}

function rendPlano(d: LaudoData): string {
  if (!d.actionPlan || d.actionItems.length === 0) {
    return `
<section class="principal">
  <h2>7. Plano de ação</h2>
  <p>Plano de ação ainda em elaboração ou não aprovado. A construção do plano segue
  protocolo PDCA com responsáveis nomeados, prazos e KPIs por item.</p>
</section>
`
  }
  return `
<section class="principal">
  <h2>7. Plano de ação aprovado</h2>
  <p>
    Status do plano: <strong>${escapeHtml(d.actionPlan.status)}</strong>
    ${d.actionPlan.approved_at ? `· aprovado em ${fmtDateBR(d.actionPlan.approved_at)}` : ''}
    ${d.actionPlan.next_review_at ? `· próxima revisão ${fmtDateBR(d.actionPlan.next_review_at)}` : ''}
  </p>
  <table class="compact">
    <thead>
      <tr>
        <th>Prio</th><th>Dimensão</th><th>Ação</th><th>Responsável</th>
        <th>Prazo</th><th>Status</th><th>KPI</th>
      </tr>
    </thead>
    <tbody>
      ${d.actionItems.map((it) => `
        <tr>
          <td>${escapeHtml(it.priority)}</td>
          <td>${escapeHtml(it.dimension_code)}</td>
          <td><strong>${escapeHtml(it.title)}</strong>${it.description ? `<br/><span class="muted" style="font-size:8.5pt;">${escapeHtml(it.description)}</span>` : ''}</td>
          <td>${escapeHtml(it.owner_name)}</td>
          <td>${fmtDateBR(it.due_date)}</td>
          <td>${escapeHtml(it.status)}</td>
          <td>${escapeHtml(it.kpi ?? '—')}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>
</section>
`
}

function rendEconomico(d: LaudoData): string {
  const p = d.economic.projection
  if (!p) {
    return `
<section class="principal">
  <h2>8. Projeção econômica</h2>
  <p>Projeção econômica ainda não calculada para esta avaliação.</p>
</section>
`
  }
  return `
<section class="principal">
  <h2>8. Projeção econômica</h2>
  <p>Estimativa de exposição financeira anual e impacto de cenários de intervenção.
  Premissas baseadas em DIEESE, ISMA-BR e INSS (2024-2025). Vetores marcados como
  "em roadmap" não compõem o total — modelo simplificado pendente de versão final.</p>

  <h3>Cenário "não agir" (12 meses)</h3>
  <table class="compact">
    <tr><th>Multas MTE potenciais</th><td>${formatBrl(Number(p.na_fines_exposure_brl))}</td></tr>
    <tr><th>Afastamentos CID-F</th><td>${formatBrl(Number(p.na_absence_cost_brl))}</td></tr>
    <tr><th>Turnover atribuível</th><td>${formatBrl(Number(p.na_turnover_cost_brl))}</td></tr>
    <tr><th>Produtividade perdida</th><td>${formatBrl(Number(p.na_productivity_loss_brl))}</td></tr>
    <tr><th><strong>Total</strong></th><td><strong>${formatBrl(Number(p.na_total_brl))}</strong></td></tr>
  </table>

  <h3>Cenário "agir integral"</h3>
  <table class="compact">
    <tr><th>Investimento no programa</th><td>${formatBrl(Number(p.ai_program_cost_brl))}</td></tr>
    <tr><th>Economia capturada</th><td>${formatBrl(Number(p.ai_total_savings_brl))}</td></tr>
    <tr><th>Resultado líquido (ano 1)</th><td><strong>${formatBrl(Number(p.ai_net_brl))}</strong></td></tr>
    <tr><th>ROI</th><td>${p.ai_roi_pct != null ? Number(p.ai_roi_pct).toFixed(0) + '%' : '—'}</td></tr>
    <tr><th>Payback</th><td>${p.ai_payback_months != null ? Number(p.ai_payback_months).toFixed(1) + ' meses' : '—'}</td></tr>
  </table>
</section>
`
}

function rendMonitoramento(d: LaudoData): string {
  const c = d.pulse.config
  if (!c) {
    return `
<section class="principal">
  <h2>9. Monitoramento contínuo</h2>
  <p>Monitoramento por micro-pulsos não configurado para esta avaliação.
  A NR-01 exige monitoramento contínuo com reavaliação periódica; recomenda-se
  ativar logo após a aprovação do plano de ação.</p>
</section>
`
  }
  return `
<section class="principal">
  <h2>9. Monitoramento contínuo</h2>
  <table class="compact">
    <tr><th>Status</th><td>${c.enabled ? 'Ativo' : 'Inativo'}</td></tr>
    <tr><th>Perguntas por semana</th><td>${c.questions_per_week}</td></tr>
    <tr><th>Janela de resposta</th><td>${c.window_hours} horas</td></tr>
    <tr><th>Calibração</th><td>${c.calibration_weeks} semanas iniciais sem alertas preditivos</td></tr>
    <tr><th>Semanas disparadas</th><td>${d.pulse.weeksDispatched}</td></tr>
    <tr><th>Último pulso</th><td>${fmtDateTimeBR(c.last_dispatched_at)}</td></tr>
  </table>
</section>
`
}

function rendEvidencias(d: LaudoData): string {
  const p = d.evidencePack
  if (!p) {
    return `
<section class="principal">
  <h2>10. Pacote de evidências</h2>
  <p>Pacote de evidências ainda não emitido. A geração formal do pacote consolida
  hashes do instrumento, das respostas e do conjunto, com assinatura técnica do responsável.</p>
</section>
`
  }
  return `
<section class="principal">
  <h2>10. Pacote de evidências</h2>
  <p>Trilha imutável vinculada a esta avaliação. Apresentar este conteúdo em
  fiscalização para comprovar metodologia, instrumento aplicado e adesão.</p>
  <table class="compact">
    <tr><th>Hash do instrumento (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.instrument_sha256)}</span></td></tr>
    <tr><th>Hash do pacote (SHA-256)</th><td><span class="evidencia-hash">${escapeHtml(p.pack_sha256)}</span></td></tr>
    <tr><th>Coleta — abertura</th><td>${fmtDateTimeBR(p.collection_started_at)}</td></tr>
    <tr><th>Coleta — encerramento</th><td>${fmtDateTimeBR(p.collection_ended_at)}</td></tr>
    <tr><th>Convites enviados</th><td>${p.total_invites_sent}</td></tr>
    <tr><th>Respostas completas</th><td>${p.total_responses_complete}</td></tr>
    <tr><th>Adesão</th><td>${p.adherence_pct.toFixed(1)}%</td></tr>
    <tr><th>Metodologia (versão)</th><td>${escapeHtml(p.methodology_version)}</td></tr>
    <tr><th>Responsável técnico</th><td>${escapeHtml(p.technical_lead_name)}${p.technical_lead_crp ? ' · ' + escapeHtml(p.technical_lead_crp) : ''}</td></tr>
    <tr><th>Pacote gerado em</th><td>${fmtDateTimeBR(p.generated_at)}</td></tr>
  </table>
</section>
`
}

function rendApendice(d: LaudoData): string {
  // Lista de questões agrupadas por dimensão (precisa carregar separadamente
  // se quiser todas; por hora documenta a escala).
  const escala = LIKERT_LABELS.map((l) => `<li><strong>${l.value}</strong> — ${escapeHtml(l.label)}</li>`).join('')

  // Lista das 10 dimensões com descrição
  const dims = d.dimensions.map((dim) => `
    <tr>
      <td>${escapeHtml(dim.name)}</td>
      <td>${escapeHtml(dim.description)}</td>
      <td><span class="evidencia-hash" style="font-size: 7pt;">peso ${dim.weight.toFixed(2)}</span></td>
    </tr>
  `).join('')

  return `
<section class="principal">
  <h2>11. Apêndice — escala de resposta e dimensões</h2>

  <h3>Escala Likert aplicada</h3>
  <ol class="bullets">${escala}</ol>
  <p class="muted">Questões com enunciado negativo (reverse_scored) são invertidas
  matematicamente antes do cálculo (valor 6 − resposta), de forma que o score final
  permanece monotônico: maior = mais saudável.</p>

  <h3>Dimensões e referência normativa</h3>
  <table class="compact">
    <thead><tr><th>Dimensão</th><th>Descrição</th><th>Peso</th></tr></thead>
    <tbody>${dims}</tbody>
  </table>
</section>
`
}

function rendAssinatura(d: LaudoData): string {
  const a = d.assessment
  return `
<section class="principal">
  <h2>12. Termo de responsabilidade técnica</h2>
  <p>O abaixo-assinado declara, sob as penas da lei, que esta avaliação foi conduzida
  conforme metodologia descrita na seção 2 deste documento, com instrumento validado
  e cuja integridade pode ser auditada via hash SHA-256 declarado no pacote de evidências
  (seção 10). Assume-se responsabilidade técnica pelos resultados aqui apresentados,
  permanecendo este laudo válido até a próxima reavaliação periódica conforme NR-01.</p>

  <div class="assinatura-bloco evite-quebra">
    <div class="linha-assinatura"></div>
    <div class="pre">
      <div>
        <div><strong>${escapeHtml(a.technical_lead?.name ?? '—')}</strong></div>
        <div>${escapeHtml(a.technical_lead_crp ?? 'CRP —')}</div>
      </div>
      <div style="text-align: right;">
        <div>Local: ____________________________</div>
        <div>Data: ${fmtDateBR(d.generatedAt)}</div>
      </div>
    </div>
  </div>
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
${rendCapa(d)}
${rendSumario()}
${rendIdentificacao(d)}
${rendMetodologia()}
${rendAdesao(d)}
${rendDimensoes(d)}
${rendIso(d)}
${rendAlertas(d)}
${rendPlano(d)}
${rendEconomico(d)}
${rendMonitoramento(d)}
${rendEvidencias(d)}
${rendApendice(d)}
${rendAssinatura(d)}
</body>
</html>
`.trim()
}
