'use client'

/**
 * QUANTUM5G — SecaoIA
 * Seção 10 do relatório: Análise IA — Pentagrama de Ginger.
 * Toggle Sintético/Analítico + todos os blocos de conteúdo.
 * 'use client' para toggle e localStorage.
 */

import { useState, useEffect } from 'react'
import { ExportButtons } from '@/components/relatorio/ExportButtons'
import type {
  AiReport,
  AiReportPlanoAcao,
  AiReportFerramenta,
  AiReportPergunta,
} from '@/types/database'

const PRIORIDADE_COLOR: Record<string, string> = {
  P1: 'bg-red-100 text-red-700 border-red-200',
  P2: 'bg-amber-100 text-amber-700 border-amber-200',
  P3: 'bg-green-100 text-green-700 border-green-200',
}

const TOOL_ICON: Record<string, string> = {
  '5S':                       '🧹',
  'Mapa de Riscos':           '⚠️',
  'Escuta Ativa':             '👂',
  'CNV':                      '💬',
  'OKR':                      '🎯',
  'Mapa da Clareza':          '🗺️',
  'Ishikawa':                 '🔍',
  'Diagrama de Ishikawa':     '🔍',
  'Dinâmica de Conflitos':    '⚡',
  'Mapa de Valores':          '💎',
  'Workshop de Propósito':    '🌟',
  'Espelho de Percepção':     '🪞',
  'Diagnóstico de Liderança': '👔',
  '360':                      '👔',
  'default':                  '🔧',
}

function getToolIcon(nome: string): string {
  for (const [key, icon] of Object.entries(TOOL_ICON)) {
    if (nome.toLowerCase().includes(key.toLowerCase())) return icon
  }
  return TOOL_ICON['default']
}

// ─── Geração on-demand ─────────────────────────────────────────

function GenerateButton({ diagnosticId }: { diagnosticId: string }) {
  const [loading, setLoading] = useState(false)
  const [error,   setError]   = useState<string | null>(null)

  async function handleGenerate() {
    setLoading(true)
    setError(null)
    try {
      const resp = await fetch(`/api/ai/generate/${diagnosticId}`, { method: 'POST' })
      if (!resp.ok) {
        const data = await resp.json() as { error?: string }
        throw new Error(data.error ?? `HTTP ${resp.status}`)
      }
      // Recarrega a página para exibir o relatório gerado
      window.location.reload()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro desconhecido')
      setLoading(false)
    }
  }

  return (
    <div className="text-center py-8">
      <p className="text-zinc-500 text-sm mb-4">
        Análise IA não gerada ainda para este diagnóstico.
      </p>
      {error && (
        <p className="text-red-600 text-xs mb-3 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          {error}
        </p>
      )}
      <button
        onClick={handleGenerate}
        disabled={loading}
        className="rounded-xl bg-purple-700 px-6 py-3 text-sm font-bold text-white hover:bg-purple-800 disabled:opacity-50 transition-colors"
      >
        {loading ? (
          <span className="flex items-center gap-2">
            <span className="animate-spin">⟳</span> Gerando análise… pode levar 30–60s
          </span>
        ) : '✨ Gerar Análise IA'}
      </button>
      <p className="text-xs text-zinc-400 mt-2">
        Powered by Groq · llama-3.3-70b-versatile
      </p>
    </div>
  )
}

// ─── Accordion ────────────────────────────────────────────────

function Accordion({ title, children }: { title: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  return (
    <div className="border border-zinc-200 rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-5 py-4 bg-zinc-50 hover:bg-zinc-100 transition-colors text-left"
      >
        <span className="font-semibold text-zinc-800 text-sm">{title}</span>
        <span className="text-zinc-400 text-lg">{open ? '▲' : '▼'}</span>
      </button>
      {open && (
        <div className="px-5 py-4 bg-white">
          {children}
        </div>
      )}
    </div>
  )
}

// ─── Componente principal ──────────────────────────────────────

interface Props {
  diagnosticId: string
  companyName:  string
  report:       AiReport | null
  canGenerate:  boolean  // só consultant/admin pode gerar
}

export function SecaoIA({ diagnosticId, companyName, report, canGenerate }: Props) {
  const [mode, setMode] = useState<'sintetico' | 'analitico'>('analitico')

  useEffect(() => {
    const saved = localStorage.getItem('quantum5g_ai_mode')
    if (saved === 'sintetico' || saved === 'analitico') setMode(saved)
  }, [])

  function toggleMode(m: 'sintetico' | 'analitico') {
    setMode(m)
    localStorage.setItem('quantum5g_ai_mode', m)
  }

  const narrativa  = report?.narrativa_executiva
  const plano      = report?.plano_de_acao      as AiReportPlanoAcao[] | null
  const ferramentas = report?.ferramentas_prescritas as AiReportFerramenta[] | null
  const roteiro    = report?.roteiro_devolutiva
  const perguntas  = report?.perguntas_aprofundamento as AiReportPergunta[] | null

  const showSintetico = mode === 'sintetico'

  return (
    <section className="py-10">
      {/* ── Header da seção ── */}
      <div className="flex flex-col gap-3 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-xl font-bold text-zinc-900">9. Análise IA</h2>
            <p className="text-sm text-zinc-500 mt-0.5">
              Pentagrama de Ginger — gerada por {report?.model_used ?? 'llama-3.3-70b-versatile'}
            </p>
          </div>
          {report && (
            <div className="flex items-center gap-2 flex-wrap">
              {/* Botões de exportação */}
              <ExportButtons report={report} companyName={companyName} size="sm" />
              {/* Toggle Sintético / Analítico */}
              <div className="flex rounded-lg border border-zinc-200 overflow-hidden text-xs font-semibold">
                <button
                  onClick={() => toggleMode('sintetico')}
                  className={`px-3 py-1.5 transition-colors ${mode === 'sintetico' ? 'bg-purple-700 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                >
                  Sintético
                </button>
                <button
                  onClick={() => toggleMode('analitico')}
                  className={`px-3 py-1.5 transition-colors ${mode === 'analitico' ? 'bg-purple-700 text-white' : 'bg-white text-zinc-600 hover:bg-zinc-50'}`}
                >
                  Analítico
                </button>
              </div>
              {/* Botão de regenerar */}
              {canGenerate && (
                <button
                  onClick={() => {
                    if (confirm('Regenerar análise IA? O conteúdo atual será substituído.')) {
                      fetch(`/api/ai/generate/${diagnosticId}`, { method: 'POST' })
                        .then(() => window.location.reload())
                    }
                  }}
                  title="Regenerar análise"
                  className="text-zinc-400 hover:text-zinc-700 text-lg transition-colors"
                >
                  ⟳
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Sem relatório ainda ── */}
      {!report && canGenerate && <GenerateButton diagnosticId={diagnosticId} />}
      {!report && !canGenerate && (
        <p className="text-sm text-zinc-400 italic text-center py-8">
          Análise IA não disponível para este diagnóstico.
        </p>
      )}

      {/* ── Conteúdo do relatório ── */}
      {report && (
        <div className="space-y-5">

          {/* Narrativa Executiva */}
          {narrativa && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 px-6 py-5">
              <h3 className="font-bold text-purple-900 mb-3 text-sm uppercase tracking-wide">
                Narrativa Executiva
              </h3>
              <p className="text-sm text-purple-800 leading-relaxed whitespace-pre-wrap">
                {showSintetico ? narrativa.sintetico : narrativa.analitico}
              </p>
            </div>
          )}

          {/* Plano de Ação */}
          {plano && plano.length > 0 && (
            <Accordion title={`Plano de Ação — ${showSintetico ? 'Top 3 prioridades' : `${plano.length} dimensões`}`}>
              <div className="space-y-4">
                {(showSintetico ? plano.slice(0, 3) : plano).map((item, i) => (
                  <div key={i} className="border-l-4 border-purple-300 pl-4">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="capitalize font-semibold text-sm text-zinc-800">{item.dimensao}</span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-bold ${PRIORIDADE_COLOR[item.prioridade] ?? 'bg-zinc-100 text-zinc-600 border-zinc-200'}`}>
                        {item.prioridade}
                      </span>
                      <span className="text-xs text-zinc-400">{item.prazo} · {item.responsavel}</span>
                    </div>
                    {!showSintetico && (
                      <p className="text-sm text-zinc-600 leading-relaxed mb-2">{item.narrativa}</p>
                    )}
                    <ul className="space-y-1">
                      {item.acoes.map((a, j) => (
                        <li key={j} className="text-sm text-zinc-700 flex items-start gap-1.5">
                          <span className="text-purple-400 mt-0.5 shrink-0">→</span> {a}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* Ferramentas Prescritas */}
          {ferramentas && ferramentas.length > 0 && (
            <Accordion title={`Ferramentas Prescritas — ${showSintetico ? '2 principais' : `${ferramentas.length} ferramentas`}`}>
              <div className="grid gap-4 sm:grid-cols-2">
                {(showSintetico ? ferramentas.slice(0, 2) : ferramentas).map((f, i) => (
                  <div key={i} className="rounded-lg border border-zinc-200 p-4">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-xl">{getToolIcon(f.nome)}</span>
                      <div>
                        <p className="font-semibold text-sm text-zinc-800">{f.nome}</p>
                        <p className="text-xs text-zinc-400 capitalize">{f.dimensao}</p>
                      </div>
                    </div>
                    <p className="text-xs text-zinc-600 leading-relaxed mb-3">{f.justificativa_especifica}</p>
                    {!showSintetico && (
                      <>
                        <p className="text-xs font-medium text-zinc-500 mb-1">Como aplicar:</p>
                        <p className="text-xs text-zinc-600 leading-relaxed mb-3">{f.como_aplicar}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          {(['30_dias','60_dias','90_dias'] as const).map(k => (
                            <div key={k} className="rounded-lg bg-zinc-50 border border-zinc-100 px-2 py-2">
                              <p className="font-bold text-zinc-500 mb-0.5">{k.replace('_', ' ')}</p>
                              <p className="text-zinc-600">{f.resultado_esperado[k]}</p>
                            </div>
                          ))}
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* Roteiro de Devolutiva */}
          {roteiro && !showSintetico && (
            <Accordion title="Roteiro de Devolutiva">
              <div className="space-y-4 text-sm text-zinc-700">
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Abertura</p>
                  <p className="leading-relaxed">{roteiro.abertura}</p>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Desenvolvimento</p>
                  <ol className="list-decimal list-inside space-y-1">
                    {roteiro.desenvolvimento.map((d, i) => <li key={i}>{d}</li>)}
                  </ol>
                </div>
                <div>
                  <p className="font-semibold text-zinc-800 mb-1">Fechamento</p>
                  <p className="leading-relaxed">{roteiro.fechamento}</p>
                </div>
                {roteiro.frases_de_transicao && roteiro.frases_de_transicao.length > 0 && (
                  <div>
                    <p className="font-semibold text-zinc-800 mb-1">Frases de transição</p>
                    <ul className="space-y-1">
                      {roteiro.frases_de_transicao.map((f, i) => (
                        <li key={i} className="flex items-start gap-1.5">
                          <span className="text-purple-400 shrink-0">»</span> <em>{f}</em>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </Accordion>
          )}

          {/* Perguntas de Aprofundamento */}
          {perguntas && perguntas.length > 0 && (
            <Accordion title={showSintetico ? 'Pergunta Principal de Devolutiva' : `${perguntas.length} Perguntas de Aprofundamento`}>
              <div className="space-y-3">
                {(showSintetico ? perguntas.slice(0, 1) : perguntas).map((q, i) => (
                  <div key={i} className="rounded-lg bg-zinc-50 border border-zinc-100 px-4 py-3">
                    <p className="font-medium text-sm text-zinc-800 mb-1">
                      <span className="text-purple-500 mr-1">?</span> {q.pergunta}
                    </p>
                    {!showSintetico && (
                      <p className="text-xs text-zinc-500 italic">{q.objetivo}</p>
                    )}
                    <p className="text-xs text-zinc-400 mt-1 capitalize">{q.dimensao}</p>
                  </div>
                ))}
              </div>
            </Accordion>
          )}

          {/* CTA Chat */}
          {canGenerate && (
            <div className="rounded-xl border border-purple-200 bg-purple-50 p-5 flex items-center justify-between">
              <div>
                <p className="font-semibold text-purple-900 text-sm">
                  Quer aprofundar a análise?
                </p>
                <p className="text-purple-700 text-xs mt-0.5">
                  Converse com o agente IA sobre este diagnóstico específico.
                </p>
              </div>
              <a
                href={`/relatorio/${diagnosticId}/agente`}
                className="shrink-0 rounded-xl bg-purple-700 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-800 transition-colors"
              >
                Abrir chat →
              </a>
            </div>
          )}

          {/* Rodapé */}
          <p className="text-center text-xs text-zinc-400 pt-2">
            Powered by Groq · {report.model_used} ·{' '}
            {report.generation_time_ms ? `gerado em ${(report.generation_time_ms / 1000).toFixed(1)}s` : ''}
            {report.tokens_used ? ` · ${report.tokens_used.toLocaleString()} tokens` : ''}
          </p>
        </div>
      )}
    </section>
  )
}
