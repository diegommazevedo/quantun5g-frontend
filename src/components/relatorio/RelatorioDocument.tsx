/**
 * Documento do relatório Pentagrama (capa → metodologia).
 * Usado na tela interativa e na rota /print/relatorio/[id] (sem chrome do app).
 * Suporta diagnóstico só-IC (sem IL / sem líder).
 */

import { PentagramaVisual } from '@/components/relatorio/PentagramaVisual'
import { NivelBadge } from '@/components/relatorio/NivelBadge'
import { GapBar } from '@/components/relatorio/GapBar'
import { AlertasList } from '@/components/relatorio/AlertasList'
import { BlocoScoreGrid } from '@/components/relatorio/BlocoScoreGrid'
import type { DiagnosticResult, Laudo } from '@/types/database'

const DIM_COLOR: Record<string, string> = {
  fisica: 'bg-blue-600',
  afetiva: 'bg-red-500',
  racional: 'bg-orange-500',
  social: 'bg-green-600',
  cultural: 'bg-violet-600',
}

const DIM_LABEL: Record<string, string> = {
  fisica: 'Física',
  afetiva: 'Afetiva',
  racional: 'Racional',
  social: 'Social',
  cultural: 'Cultural',
}

const NIVEL_BG: Record<string, string> = {
  critico: 'from-red-600 to-red-800',
  vulneravel: 'from-amber-500 to-amber-700',
  saudavel: 'from-green-600 to-green-800',
  excelente: 'from-blue-600 to-blue-800',
  sem_dados: 'from-zinc-500 to-zinc-700',
}

const NIVEL_LABEL: Record<string, string> = {
  critico: 'Crítico',
  vulneravel: 'Vulnerável',
  saudavel: 'Saudável',
  excelente: 'Excelente',
  sem_dados: 'Sem dados',
}

export interface RelatorioDocumentProps {
  companyName: string
  diagnosticName: string
  leaderName: string | null
  consultantLabel: string
  result: DiagnosticResult
  laudosMap: Record<string, Laudo>
  dataGeracao: string
}

export function RelatorioDocument({
  companyName,
  diagnosticName,
  leaderName,
  consultantLabel,
  result,
  laudosMap,
  dataGeracao,
}: RelatorioDocumentProps) {
  const nivelGlobal = result.nivel_combined ?? 'sem_dados'
  const gradientBg = NIVEL_BG[nivelGlobal] ?? NIVEL_BG.sem_dados
  const fmt = (v: number | null) => (v !== null ? `${Math.round(v)}%` : '—')
  const hasIl = result.il_global_pct !== null

  const DIMENSOES = [
    {
      key: 'fisica',
      ic: result.ic_fisica_pct,
      il: result.il_fisica_pct,
      combined: result.combined_fisica_pct,
      gap: result.gap_fisica,
      nivel: result.nivel_ic_fisica,
      laudoId: result.laudo_fisica_id,
    },
    {
      key: 'afetiva',
      ic: result.ic_afetiva_pct,
      il: result.il_afetiva_pct,
      combined: result.combined_afetiva_pct,
      gap: result.gap_afetiva,
      nivel: result.nivel_ic_afetiva,
      laudoId: result.laudo_afetiva_id,
    },
    {
      key: 'racional',
      ic: result.ic_racional_pct,
      il: result.il_racional_pct,
      combined: result.combined_racional_pct,
      gap: result.gap_racional,
      nivel: result.nivel_ic_racional,
      laudoId: result.laudo_racional_id,
    },
    {
      key: 'social',
      ic: result.ic_social_pct,
      il: result.il_social_pct,
      combined: result.combined_social_pct,
      gap: result.gap_social,
      nivel: result.nivel_ic_social,
      laudoId: result.laudo_social_id,
    },
    {
      key: 'cultural',
      ic: result.ic_cultural_pct,
      il: result.il_cultural_pct,
      combined: result.combined_cultural_pct,
      gap: result.gap_cultural,
      nivel: result.nivel_ic_cultural,
      laudoId: result.laudo_cultural_id,
    },
  ]

  return (
    <div
      id="relatorio-documento"
      className="mx-auto max-w-4xl space-y-0 px-6 pb-24 print:max-w-none print:px-0 print:pb-0"
    >
      {/* CAPA */}
      <section
        className="page-break page-break-after relative mb-8 overflow-hidden rounded-2xl print:mb-0 print:rounded-none"
        style={{ minHeight: 320 }}
      >
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg}`} />
        <div
          className="relative z-10 flex flex-col justify-between px-8 py-10 sm:px-10 sm:py-12"
          style={{ minHeight: 320 }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="mb-1 text-sm font-medium uppercase tracking-widest text-white/60">
                Pentagrama de Ginger · Módulo Diagnóstico
              </p>
              <h1 className="text-3xl font-bold leading-tight text-white">{companyName}</h1>
              <p className="mt-1 text-lg text-white/80">{diagnosticName}</p>
              {!hasIl && (
                <p className="mt-2 inline-flex rounded-full bg-white/15 px-2.5 py-0.5 text-xs font-medium text-white/90">
                  Diagnóstico somente IC (sem IL)
                </p>
              )}
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Nível geral</p>
              <p className="text-2xl font-black text-white">{NIVEL_LABEL[nivelGlobal]}</p>
            </div>
          </div>

          <div className="mt-10 flex items-end justify-between gap-4 pt-6">
            <div className="space-y-1">
              {leaderName && (
                <p className="text-sm text-white/80">
                  <span className="opacity-60">Líder: </span>
                  {leaderName}
                </p>
              )}
              <p className="text-sm text-white/80">
                <span className="opacity-60">Consultor: </span>
                {consultantLabel}
              </p>
              <p className="text-sm text-white/80">
                <span className="opacity-60">Colaboradores respondentes: </span>
                <span className="font-semibold">{result.n_ic_respondents}</span>
              </p>
            </div>
            <div className="text-right">
              <p className="text-xs text-white/60">Gerado em</p>
              <p className="text-sm font-medium text-white">{dataGeracao}</p>
            </div>
          </div>
        </div>
      </section>

      {/* 1. RESUMO */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-5 text-xl font-bold text-zinc-900">1. Resumo Executivo</h2>
        <div className="mb-6 flex flex-wrap gap-3">
          <div className="relatorio-card min-w-36 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Score IC Global</p>
            <p className="text-3xl font-black text-zinc-900">{fmt(result.ic_global_pct)}</p>
            <p className="mt-1 text-xs text-zinc-400">Colaboradores</p>
          </div>
          {hasIl ? (
            <div className="relatorio-card min-w-36 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center">
              <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Score IL Global</p>
              <p className="text-3xl font-black text-zinc-900">{fmt(result.il_global_pct)}</p>
              <p className="mt-1 text-xs text-zinc-400">Liderança</p>
            </div>
          ) : null}
          <div className="relatorio-card min-w-36 flex-1 rounded-xl border border-zinc-200 bg-white px-5 py-4 text-center ring-1 ring-zinc-200">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">
              {hasIl ? 'Score Combinado' : 'Score do Diagnóstico'}
            </p>
            <p className="text-3xl font-black text-zinc-900">{fmt(result.combined_global_pct)}</p>
            <p className="mt-1 text-xs text-zinc-400">
              {hasIl
                ? `IC×${Math.round(result.ic_weight * 100)}% + IL×${Math.round(result.il_weight * 100)}%`
                : 'Somente IC (IL não aplicado)'}
            </p>
          </div>
          <div className="relatorio-card min-w-36 flex-1 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-center">
            <p className="mb-1 text-xs uppercase tracking-wide text-zinc-500">Nível Geral</p>
            <div className="mt-2 flex justify-center">
              <NivelBadge nivel={result.nivel_combined} size="md" />
            </div>
            <p className="mt-2 text-xs text-zinc-400">baseado no IC</p>
          </div>
        </div>
        <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-3 text-sm text-zinc-600">
          <span className="font-semibold text-zinc-800">{result.n_ic_respondents}</span>{' '}
          colaboradores responderam ao IC
          {!hasIl && (
            <span className="ml-2 text-zinc-500">· Diagnóstico conduzido sem Instrumento de Liderança (IL).</span>
          )}
          {result.n_ic_respondents < 3 && (
            <span className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              ⚠ Baixa amostragem — pesos invertidos (IL×60% / IC×40%)
            </span>
          )}
        </div>
      </section>

      {/* 2. PENTAGRAMA */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">2. Pentagrama de Saúde Organizacional</h2>
        <p className="mb-6 text-sm text-zinc-500">
          {hasIl
            ? 'Comparação entre a percepção dos colaboradores (IC, linha sólida azul) e a percepção da liderança (IL, linha tracejada laranja).'
            : 'Percepção dos colaboradores (IC) nas cinco dimensões. IL não aplicado neste diagnóstico.'}
        </p>
        <PentagramaVisual
          ic_fisica_pct={result.ic_fisica_pct}
          ic_afetiva_pct={result.ic_afetiva_pct}
          ic_racional_pct={result.ic_racional_pct}
          ic_social_pct={result.ic_social_pct}
          ic_cultural_pct={result.ic_cultural_pct}
          il_fisica_pct={result.il_fisica_pct}
          il_afetiva_pct={result.il_afetiva_pct}
          il_racional_pct={result.il_racional_pct}
          il_social_pct={result.il_social_pct}
          il_cultural_pct={result.il_cultural_pct}
        />
      </section>

      {/* 3. SCORES */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-5 text-xl font-bold text-zinc-900">3. Scores por Dimensão</h2>
        <div className="overflow-x-auto rounded-xl border border-zinc-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-200 bg-zinc-50">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Dimensão
                </th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  IC %
                </th>
                {hasIl && (
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    IL %
                  </th>
                )}
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  {hasIl ? 'Combinado' : 'Score'}
                </th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                  Nível IC
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100 bg-white">
              {DIMENSOES.map(({ key, ic, il, combined, nivel }) => (
                <tr key={key}>
                  <td className="px-4 py-3 font-medium text-zinc-900">
                    <div className="flex items-center gap-2">
                      <span className={`inline-block h-2.5 w-2.5 rounded-full ${DIM_COLOR[key]}`} />
                      {DIM_LABEL[key]}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-center font-semibold tabular-nums text-blue-700">
                    {fmt(ic)}
                  </td>
                  {hasIl && (
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-orange-600">
                      {fmt(il)}
                    </td>
                  )}
                  <td className="px-4 py-3 text-center font-bold tabular-nums text-zinc-900">
                    {fmt(combined)}
                  </td>
                  <td className="px-4 py-3">
                    <NivelBadge nivel={nivel} size="sm" />
                  </td>
                </tr>
              ))}
              <tr className="border-t-2 border-zinc-200 bg-zinc-50 font-semibold">
                <td className="px-4 py-3 font-bold text-zinc-800">Global</td>
                <td className="px-4 py-3 text-center tabular-nums text-blue-700">
                  {fmt(result.ic_global_pct)}
                </td>
                {hasIl && (
                  <td className="px-4 py-3 text-center tabular-nums text-orange-600">
                    {fmt(result.il_global_pct)}
                  </td>
                )}
                <td className="px-4 py-3 text-center font-black tabular-nums text-zinc-900">
                  {fmt(result.combined_global_pct)}
                </td>
                <td className="px-4 py-3">
                  <NivelBadge nivel={result.nivel_combined} size="sm" />
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. LAUDOS */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">4. Laudos por Dimensão</h2>
        <p className="mb-5 text-sm text-zinc-500">
          Análise qualitativa de cada dimensão, baseada no nível IC apurado.
        </p>
        <div className="space-y-4">
          {DIMENSOES.map(({ key, nivel, laudoId }) => {
            const laudo = laudoId ? laudosMap[laudoId] : null
            return (
              <div key={key} className="relatorio-card overflow-hidden rounded-xl border border-zinc-200">
                <div className={`flex items-center justify-between px-5 py-3 text-white ${DIM_COLOR[key]}`}>
                  <span className="font-semibold">{DIM_LABEL[key]}</span>
                  <NivelBadge nivel={nivel} size="sm" />
                </div>
                <div className="bg-white px-5 py-4">
                  {laudo ? (
                    <p className="text-sm leading-relaxed text-zinc-700">{laudo.texto}</p>
                  ) : (
                    <p className="text-sm italic text-zinc-400">
                      Laudo não disponível para esta dimensão.
                    </p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </section>

      {/* 5. GAPS — só com IL */}
      {hasIl ? (
        <section className="page-break border-b border-zinc-100 py-8">
          <h2 className="mb-2 text-xl font-bold text-zinc-900">5. Análise de Gaps IL × IC</h2>
          <p className="mb-5 text-sm text-zinc-500">
            Gap = IL% − IC%. Valor positivo indica que a liderança percebe a dimensão melhor do que
            os colaboradores. Valor negativo indica subestimação.
          </p>
          <div className="mb-5 flex flex-wrap gap-3 text-xs">
            {[
              { label: 'Alinhado', color: 'bg-green-400', range: '|gap| < 10pp' },
              { label: 'Div. Moderada', color: 'bg-amber-400', range: '10–20pp' },
              { label: 'Div. Significativa', color: 'bg-orange-400', range: '20–30pp' },
              { label: 'Bolha de Percepção', color: 'bg-red-400', range: '≥ 30pp' },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`inline-block h-3 w-3 rounded-full ${item.color}`} />
                <span className="text-zinc-600">{item.label}</span>
                <span className="text-zinc-400">({item.range})</span>
              </div>
            ))}
          </div>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="w-32 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Dimensão
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    IC %
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    IL %
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Gap
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {DIMENSOES.map(({ key, ic, il, gap }) => (
                  <tr key={key}>
                    <td className="px-4 py-3 font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block h-2.5 w-2.5 rounded-full ${DIM_COLOR[key]}`} />
                        {DIM_LABEL[key]}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-blue-700">
                      {fmt(ic)}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold tabular-nums text-orange-600">
                      {fmt(il)}
                    </td>
                    <td className="px-4 py-3">
                      <GapBar gap={gap} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : (
        <section className="page-break border-b border-zinc-100 py-8">
          <h2 className="mb-2 text-xl font-bold text-zinc-900">5. Análise de Gaps IL × IC</h2>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
            Gaps IL × IC não se aplicam: este diagnóstico foi processado somente com o IC (sem
            resposta de liderança).
          </div>
        </section>
      )}

      {/* 6. ALERTAS */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">6. Alertas do Diagnóstico</h2>
        <p className="mb-5 text-sm text-zinc-500">
          Sinais automáticos detectados pelo motor de cálculo que requerem atenção especial.
        </p>
        {result.anchor_questions && result.anchor_questions.length > 0 && (
          <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
            <p className="mb-2 text-sm font-semibold text-amber-900">
              ⚓ Questões Âncora detectadas (média IC ≤ 1.5)
            </p>
            <div className="flex flex-wrap gap-2">
              {result.anchor_questions.map((aq) => (
                <div
                  key={aq.questao}
                  className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-amber-800"
                >
                  <span className="font-bold">Q{aq.questao}</span>
                  <span className="mx-1 text-amber-400">·</span>
                  <span className="capitalize">{aq.dimensao}</span>
                  <span className="mx-1 text-amber-400">·</span>
                  <span>Média {aq.media.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        )}
        <AlertasList alerts={result.alerts ?? []} />
      </section>

      {/* 7. BLOCOS */}
      <section className="page-break border-b border-zinc-100 py-8">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">7. Scores por Bloco</h2>
        <p className="mb-5 text-sm text-zinc-500">
          Cada dimensão é dividida em blocos temáticos. Blocos com score IC ≤ 40% são
          considerados críticos e marcados com ⚠.
        </p>
        <BlocoScoreGrid result={result} />
      </section>

      {/* 8. METODOLOGIA */}
      <section className="py-8">
        <h2 className="mb-5 text-xl font-bold text-zinc-900">8. Nota Metodológica</h2>
        <div className="prose prose-sm max-w-none space-y-4 text-zinc-600">
          <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5">
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Instrumentos</h3>
              <p>
                {hasIl ? (
                  <>
                    O diagnóstico Quantum5G utiliza dois instrumentos do{' '}
                    <strong>Pentagrama de Ginger</strong>: o{' '}
                    <strong>IC — Instrumento de Colaboradores</strong> (125 questões, respostas
                    anônimas) e o <strong>IL — Instrumento de Liderança</strong> (125 questões
                    espelhadas, resposta única do líder). Ambos avaliam as cinco dimensões
                    organizacionais: Física, Afetiva, Racional, Social e Cultural.
                  </>
                ) : (
                  <>
                    Este diagnóstico utilizou o <strong>IC — Instrumento de Colaboradores</strong>{' '}
                    do <strong>Pentagrama de Ginger</strong> (125 questões, respostas anônimas)
                    nas cinco dimensões: Física, Afetiva, Racional, Social e Cultural. O IL
                    (Instrumento de Liderança) não foi aplicado.
                  </>
                )}
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Escala de resposta</h3>
              <p>
                Escala Likert de 4 pontos: <strong>1 — Nunca</strong>,{' '}
                <strong>2 — Raramente</strong>, <strong>3 — Frequentemente</strong>,{' '}
                <strong>4 — Sempre</strong>. Os scores são convertidos para percentual: (média −
                1) ÷ 3 × 100.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Ponderação</h3>
              <p>
                {hasIl ? (
                  <>
                    O score combinado usa <strong>IC × 60% + IL × 40%</strong> quando N ≥ 3
                    respondentes, priorizando a voz coletiva dos colaboradores. Com N &lt; 3, os
                    pesos são invertidos (IL × 60% + IC × 40%).
                  </>
                ) : (
                  <>
                    Sem IL, o score do diagnóstico corresponde ao <strong>IC puro (100%)</strong>.
                    Laudos e nível geral continuam determinados exclusivamente pelo score IC.
                  </>
                )}
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Classificação de nível</h3>
              <p>
                <strong>Crítico</strong> (0–40%) · <strong>Vulnerável</strong> (40–60%) ·{' '}
                <strong>Saudável</strong> (60–80%) · <strong>Excelente</strong> (80–100%). O
                nível de cada dimensão é determinado exclusivamente pelo score IC. Os laudos são
                textos fixos associados ao nível IC de cada dimensão.
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Alertas automáticos</h3>
              <p>
                <strong>Bolha Sistêmica</strong>: gap IL−IC ≥ 20pp em ≥ 3 dimensões.{' '}
                <strong>Questão Âncora</strong>: média IC ≤ 1.5 em questão específica.{' '}
                <strong>Bloco Crítico Oculto</strong>: bloco com IC ≤ 40% em dimensão com nível ≥
                Saudável. <strong>Baixa Amostragem</strong>: N &lt; 5 respondentes (aviso) ou N
                &lt; 3 (pesos invertidos).
              </p>
            </div>
            <div>
              <h3 className="mb-1 font-semibold text-zinc-800">Anonimato</h3>
              <p>
                As respostas dos colaboradores são totalmente anônimas. Nenhuma informação de
                identidade é registrada ou vinculada às respostas individuais.
              </p>
            </div>
          </div>
          <p className="pt-2 text-center text-xs text-zinc-400">
            Quantum5G · Pentagrama de Ginger · Módulo Diagnóstico · {new Date().getFullYear()}
          </p>
        </div>
      </section>
    </div>
  )
}
