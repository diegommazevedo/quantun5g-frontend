/**
 * Documento do relatório Pentagrama (capa → metodologia).
 * Usado na tela interativa e na rota /print/relatorio/[id] (sem chrome do app).
 * Suporta diagnóstico só-IC e subresumo por departamento.
 */

import { PentagramaVisual } from '@/components/relatorio/PentagramaVisual'
import { NivelBadge } from '@/components/relatorio/NivelBadge'
import { GapBar } from '@/components/relatorio/GapBar'
import { AlertasList } from '@/components/relatorio/AlertasList'
import { BlocoScoreGrid } from '@/components/relatorio/BlocoScoreGrid'
import type { DepartmentIcSummary } from '@/lib/pentagrama/ic-department-scores'
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
  departmentSummary?: DepartmentIcSummary | null
}

export function RelatorioDocument({
  companyName,
  diagnosticName,
  leaderName,
  consultantLabel,
  result,
  laudosMap,
  dataGeracao,
  departmentSummary = null,
}: RelatorioDocumentProps) {
  const nivelGlobal = result.nivel_combined ?? 'sem_dados'
  const gradientBg = NIVEL_BG[nivelGlobal] ?? NIVEL_BG.sem_dados
  const fmt = (v: number | null) => (v !== null ? `${Math.round(v)}%` : '—')
  const hasIl = result.il_global_pct !== null
  const showDept = Boolean(departmentSummary && departmentSummary.departments.length > 0)
  let n = 1
  const sec = {
    resumo: n++,
    dept: showDept ? n++ : 0,
    pentagrama: n++,
    scores: n++,
    laudos: n++,
    gaps: hasIl ? n++ : 0,
    alertas: n++,
    blocos: n++,
    metodo: n++,
  }

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
      className="mx-auto max-w-4xl space-y-0 px-6 pb-16 print:max-w-none print:px-0 print:pb-0"
    >
      {/* CAPA */}
      <section className="page-break-after relative mb-6 overflow-hidden rounded-2xl print:mb-0 print:rounded-none">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg}`} />
        <div className="relative z-10 flex flex-col justify-between gap-10 px-8 py-9 sm:px-10 sm:py-10">
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

          <div className="flex items-end justify-between gap-4">
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
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-5 text-xl font-bold text-zinc-900">{sec.resumo}. Resumo Executivo</h2>
        <div className="mb-5 flex flex-wrap gap-3">
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
            <span className="ml-2 text-zinc-500">
              · Diagnóstico conduzido sem Instrumento de Liderança (IL).
            </span>
          )}
          {result.n_ic_respondents < 3 && (
            <span className="ml-2 inline-flex items-center rounded-full border border-amber-200 bg-amber-100 px-2 py-0.5 text-xs text-amber-800">
              ⚠ Baixa amostragem — pesos invertidos (IL×60% / IC×40%)
            </span>
          )}
        </div>
      </section>

      {/* 2. POR DEPARTAMENTO */}
      {showDept && departmentSummary && (
        <section className="border-b border-zinc-100 py-7">
          <h2 className="mb-2 text-xl font-bold text-zinc-900">
            {sec.dept}. Leitura por Departamento
          </h2>
          <p className="mb-4 text-sm text-zinc-500">
            Subresumo do IC por setor. Scores só aparecem com amostra mínima de{' '}
            {departmentSummary.minSample} (N=1 oculto por confidencialidade). N&nbsp;&lt;&nbsp;3 é
            leitura indicativa.
          </p>

          <div className="mb-4 rounded-xl border border-sky-200 bg-sky-50 px-5 py-4 text-sm leading-relaxed text-sky-950">
            {departmentSummary.commentary}
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Departamento
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    N
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Fís
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Afe
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Rac
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Soc
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Cul
                  </th>
                  <th className="px-2 py-2.5 text-center text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Global
                  </th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold uppercase tracking-wide text-zinc-500">
                    Nível
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {departmentSummary.departments.map((d) => (
                  <tr key={`${d.departmentId ?? d.departmentLabel}-${d.n}`}>
                    <td className="px-3 py-2.5 font-medium text-zinc-900">
                      {d.departmentLabel}
                      {d.indicative && (
                        <span className="ml-1.5 text-[10px] font-normal uppercase tracking-wide text-amber-700">
                          indicativo
                        </span>
                      )}
                    </td>
                    <td className="px-2 py-2.5 text-center tabular-nums text-zinc-600">{d.n}</td>
                    {d.scoresVisible ? (
                      <>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-700">
                          {fmt(d.fisica)}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-700">
                          {fmt(d.afetiva)}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-700">
                          {fmt(d.racional)}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-700">
                          {fmt(d.social)}
                        </td>
                        <td className="px-2 py-2.5 text-center tabular-nums text-blue-700">
                          {fmt(d.cultural)}
                        </td>
                        <td className="px-2 py-2.5 text-center font-bold tabular-nums text-zinc-900">
                          {fmt(d.global)}
                        </td>
                        <td className="px-3 py-2.5">
                          <NivelBadge nivel={d.nivel} size="sm" />
                        </td>
                      </>
                    ) : (
                      <td colSpan={7} className="px-3 py-2.5 text-xs italic text-zinc-400">
                        Score oculto (N &lt; {departmentSummary.minSample} — confidencialidade)
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* PENTAGRAMA */}
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">
          {sec.pentagrama}. Pentagrama de Saúde Organizacional
        </h2>
        <p className="mb-5 text-sm text-zinc-500">
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

      {/* SCORES */}
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-5 text-xl font-bold text-zinc-900">
          {sec.scores}. Scores por Dimensão
        </h2>
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

      {/* LAUDOS */}
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">
          {sec.laudos}. Laudos por Dimensão
        </h2>
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

      {/* GAPS — só com IL */}
      {hasIl && (
        <section className="border-b border-zinc-100 py-7">
          <h2 className="mb-2 text-xl font-bold text-zinc-900">
            {sec.gaps}. Análise de Gaps IL × IC
          </h2>
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
      )}

      {/* ALERTAS */}
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">
          {sec.alertas}. Alertas do Diagnóstico
        </h2>
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

      {/* BLOCOS */}
      <section className="border-b border-zinc-100 py-7">
        <h2 className="mb-2 text-xl font-bold text-zinc-900">{sec.blocos}. Scores por Bloco</h2>
        <p className="mb-5 text-sm text-zinc-500">
          Cada dimensão é dividida em blocos temáticos. Blocos com score IC ≤ 40% são
          considerados críticos e marcados com ⚠.
        </p>
        <BlocoScoreGrid result={result} />
      </section>

      {/* METODOLOGIA */}
      <section className="py-7">
        <h2 className="mb-4 text-xl font-bold text-zinc-900">{sec.metodo}. Nota Metodológica</h2>
        <div className="space-y-3 rounded-xl border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
          <p>
            <span className="font-semibold text-zinc-800">Instrumento. </span>
            {hasIl
              ? 'IC (125 questões anônimas) + IL (125 questões do líder) nas dimensões Física, Afetiva, Racional, Social e Cultural.'
              : 'IC — Instrumento de Colaboradores (125 questões anônimas) nas cinco dimensões. IL não aplicado.'}
          </p>
          <p>
            <span className="font-semibold text-zinc-800">Escala. </span>
            Likert 1–5 (máximo 5 por questão). Score dimensional = (soma das médias das 25
            questões ÷ 125) × 100.
          </p>
          <p>
            <span className="font-semibold text-zinc-800">Ponderação. </span>
            {hasIl
              ? 'Combinado IC×60% + IL×40% (N≥3); pesos invertidos se N<3.'
              : 'Sem IL: score do diagnóstico = IC puro (100%).'}
          </p>
          <p>
            <span className="font-semibold text-zinc-800">Níveis. </span>
            Crítico 0–40% · Vulnerável 40–60% · Saudável 60–80% · Excelente 80–100% (sempre pelo
            IC).
          </p>
          <p>
            <span className="font-semibold text-zinc-800">Departamentos. </span>
            Cortes setoriais usam a mesma fórmula do IC; N&lt;2 oculta o score (confidencialidade).
            N&lt;3 é leitura indicativa e não substitui o agregado da empresa.
          </p>
          <p>
            <span className="font-semibold text-zinc-800">Anonimato. </span>
            Respostas individuais do IC nunca são expostas — apenas médias agregadas.
          </p>
        </div>
        <p className="pt-4 text-center text-xs text-zinc-400">
          Quantum5G · Pentagrama de Ginger · Módulo Diagnóstico · {new Date().getFullYear()}
        </p>
      </section>
    </div>
  )
}
