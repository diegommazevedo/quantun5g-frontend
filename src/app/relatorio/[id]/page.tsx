/**
 * QUANTUM5G — TELA-08: Relatório de Diagnóstico
 * 9 seções: capa · resumo executivo · pentágrama · scores · laudos
 *           gaps IL×IC · alertas · blocos críticos · metodologia
 *
 * Rota: /relatorio/[id]  → requer autenticação (consultant | leader | admin)
 * PDF: window.print() com @media print no globals.css
 */

import { notFound, redirect } from 'next/navigation'
import { createClient }       from '@/lib/supabase/server'
import { PentagramaVisual }   from '@/components/relatorio/PentagramaVisual'
import { NivelBadge }         from '@/components/relatorio/NivelBadge'
import { GapBar }             from '@/components/relatorio/GapBar'
import { AlertasList }        from '@/components/relatorio/AlertasList'
import { BlocoScoreGrid }     from '@/components/relatorio/BlocoScoreGrid'
import type { Diagnostic, Company, DiagnosticResult, Laudo, Profile, AiReport } from '@/types/database'
import { PrintButton }         from './PrintButton'
import { LiberarLiderButton }  from './LiberarLiderButton'
import { SecaoIA }             from '@/components/relatorio/SecaoIA'
import { createClient as adminCli } from '@supabase/supabase-js'

// ─── Constantes ────────────────────────────────────────────────

const DIM_COLOR: Record<string, string> = {
  fisica:   'bg-blue-600',
  afetiva:  'bg-red-500',
  racional: 'bg-orange-500',
  social:   'bg-green-600',
  cultural: 'bg-violet-600',
}

const DIM_LABEL: Record<string, string> = {
  fisica:   'Física',
  afetiva:  'Afetiva',
  racional: 'Racional',
  social:   'Social',
  cultural: 'Cultural',
}

// Nível combinado → rótulo de fundo para a capa
const NIVEL_BG: Record<string, string> = {
  critico:    'from-red-600    to-red-800',
  vulneravel: 'from-amber-500  to-amber-700',
  saudavel:   'from-green-600  to-green-800',
  excelente:  'from-blue-600   to-blue-800',
  sem_dados:  'from-zinc-500   to-zinc-700',
}

const NIVEL_LABEL: Record<string, string> = {
  critico:    'Crítico',
  vulneravel: 'Vulnerável',
  saudavel:   'Saudável',
  excelente:  'Excelente',
  sem_dados:  'Sem dados',
}

// ─── Tipos auxiliares ───────────────────────────────────────────

type DiagWithCompany = Diagnostic & {
  companies: Pick<Company, 'id' | 'name' | 'total_collaborators'>
}

interface Props {
  params: Promise<{ id: string }>
}

// ─── Page ───────────────────────────────────────────────────────

export default async function RelatorioPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // ── Diagnóstico + empresa
  const { data: diag } = await supabase
    .from('diagnostics')
    .select('*, companies(id, name, total_collaborators)')
    .eq('id', id)
    .single() as { data: DiagWithCompany | null }

  if (!diag) notFound()

  // ── Resultado calculado
  const { data: result } = await supabase
    .from('diagnostic_results')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: DiagnosticResult | null }

  if (!result) {
    return (
      <div className="max-w-xl mx-auto mt-24 text-center space-y-4">
        <p className="text-2xl">⏳</p>
        <h1 className="text-xl font-semibold text-zinc-800">Relatório ainda não gerado</h1>
        <p className="text-zinc-500 text-sm">
          O diagnóstico precisa ser encerrado e o motor de cálculo executado antes de visualizar o relatório.
        </p>
        <a href={`/diagnostico/${id}`} className="text-sm text-purple-700 hover:underline">
          ← Voltar ao diagnóstico
        </a>
      </div>
    )
  }

  // ── Perfil do consultor
  const { data: profile } = await supabase
    .from('profiles')
    .select('name, email, role')
    .eq('id', user.id)
    .single() as { data: Pick<Profile, 'name' | 'email' | 'role'> | null }

  const isConsultantOrAdmin = profile?.role === 'admin' || profile?.role === 'consultant'

  // ── AI Report
  const adminSupabase = adminCli(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
  const { data: aiReport } = await adminSupabase
    .from('ai_reports')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: AiReport | null }

  // ── Laudos
  const laudoIds = [
    result.laudo_fisica_id,
    result.laudo_afetiva_id,
    result.laudo_racional_id,
    result.laudo_social_id,
    result.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } = laudoIds.length > 0
    ? await supabase.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
    : { data: [] as Laudo[] }

  const laudosMap = Object.fromEntries((laudosRows ?? []).map(l => [l.id, l]))

  // ── Helpers
  const company   = diag.companies as Pick<Company, 'id' | 'name' | 'total_collaborators'>
  const nivelGlobal = result.nivel_combined ?? 'sem_dados'
  const gradientBg  = NIVEL_BG[nivelGlobal] ?? NIVEL_BG['sem_dados']
  const dataGeracao = new Date(result.calculated_at).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'long', year: 'numeric',
  })

  const DIMENSOES = [
    { key: 'fisica',   ic: result.ic_fisica_pct,   il: result.il_fisica_pct,   combined: result.combined_fisica_pct,   gap: result.gap_fisica,   nivel: result.nivel_ic_fisica,   laudoId: result.laudo_fisica_id   },
    { key: 'afetiva',  ic: result.ic_afetiva_pct,  il: result.il_afetiva_pct,  combined: result.combined_afetiva_pct,  gap: result.gap_afetiva,  nivel: result.nivel_ic_afetiva,  laudoId: result.laudo_afetiva_id  },
    { key: 'racional', ic: result.ic_racional_pct, il: result.il_racional_pct, combined: result.combined_racional_pct, gap: result.gap_racional, nivel: result.nivel_ic_racional, laudoId: result.laudo_racional_id },
    { key: 'social',   ic: result.ic_social_pct,   il: result.il_social_pct,   combined: result.combined_social_pct,   gap: result.gap_social,   nivel: result.nivel_ic_social,   laudoId: result.laudo_social_id   },
    { key: 'cultural', ic: result.ic_cultural_pct, il: result.il_cultural_pct, combined: result.combined_cultural_pct, gap: result.gap_cultural, nivel: result.nivel_ic_cultural, laudoId: result.laudo_cultural_id },
  ]

  const fmt = (v: number | null) => v !== null ? `${Math.round(v)}%` : '—'

  // ─────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-white">
      {/* Barra de ações — não imprime */}
      <div className="no-print sticky top-0 z-10 border-b border-zinc-200 bg-white/95 backdrop-blur px-6 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <a href={`/diagnostico/${id}`} className="text-sm text-zinc-500 hover:text-zinc-800 transition-colors">
            ← Voltar
          </a>
          <span className="text-zinc-200">|</span>
          <span className="text-sm font-medium text-zinc-800">Relatório — {diag.name}</span>
        </div>
        <div className="flex items-center gap-2">
          {diag.leader_email && (
            <LiberarLiderButton
              diagnosticId={id}
              leaderEmail={diag.leader_email}
            />
          )}
          <PrintButton
            companyName={company.name}
            diagnosticName={diag.name}
          />
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-0">

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 1 — CAPA
        ═══════════════════════════════════════════════════════ */}
        <section
          className="page-break relative rounded-2xl overflow-hidden mb-12 print:rounded-none print:mb-8"
          style={{ minHeight: 420 }}
        >
          <div className={`absolute inset-0 bg-gradient-to-br ${gradientBg}`} />
          <div className="relative z-10 px-10 py-12 flex flex-col justify-between" style={{ minHeight: 420 }}>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-white/60 text-sm font-medium tracking-widest uppercase mb-1">
                  Pentagrama de Ginger · Módulo Diagnóstico
                </p>
                <h1 className="text-3xl font-bold text-white leading-tight">
                  {company.name}
                </h1>
                <p className="text-white/80 text-lg mt-1">{diag.name}</p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Nível geral</p>
                <p className="text-2xl font-black text-white">{NIVEL_LABEL[nivelGlobal]}</p>
              </div>
            </div>

            <div className="mt-auto pt-12 flex items-end justify-between">
              <div className="space-y-1">
                {diag.leader_name && (
                  <p className="text-white/80 text-sm">
                    <span className="opacity-60">Líder: </span>{diag.leader_name}
                  </p>
                )}
                <p className="text-white/80 text-sm">
                  <span className="opacity-60">Consultor: </span>{profile?.name ?? profile?.email ?? '—'}
                </p>
                <p className="text-white/80 text-sm">
                  <span className="opacity-60">Colaboradores respondentes: </span>
                  <span className="font-semibold">{result.n_ic_respondents}</span>
                </p>
              </div>
              <div className="text-right">
                <p className="text-white/60 text-xs">Gerado em</p>
                <p className="text-white text-sm font-medium">{dataGeracao}</p>
              </div>
            </div>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 2 — RESUMO EXECUTIVO
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">1. Resumo Executivo</h2>

          {/* Score global */}
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Score IC Global</p>
              <p className="text-4xl font-black text-zinc-900">{fmt(result.ic_global_pct)}</p>
              <p className="text-xs text-zinc-400 mt-1">Colaboradores</p>
            </div>
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Score IL Global</p>
              <p className="text-4xl font-black text-zinc-900">{fmt(result.il_global_pct)}</p>
              <p className="text-xs text-zinc-400 mt-1">Liderança</p>
            </div>
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-white px-6 py-5 text-center ring-1 ring-zinc-200">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Score Combinado</p>
              <p className="text-4xl font-black text-zinc-900">{fmt(result.combined_global_pct)}</p>
              <p className="text-xs text-zinc-400 mt-1">
                IC×{Math.round(result.ic_weight * 100)}% + IL×{Math.round(result.il_weight * 100)}%
              </p>
            </div>
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Nível Geral</p>
              <div className="flex justify-center mt-2">
                <NivelBadge nivel={result.nivel_combined} size="md" />
              </div>
              <p className="text-xs text-zinc-400 mt-2">baseado no IC</p>
            </div>
          </div>

          {/* Amostragem */}
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-800">{result.n_ic_respondents}</span> colaboradores responderam ao IC
            {result.n_ic_respondents < 3 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
                ⚠ Baixa amostragem — pesos invertidos (IL×60% / IC×40%)
              </span>
            )}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 3 — PENTAGRAMA VISUAL
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">2. Pentagrama de Saúde Organizacional</h2>
          <p className="text-sm text-zinc-500 mb-8">
            Comparação entre a percepção dos colaboradores (IC, linha sólida azul)
            e a percepção da liderança (IL, linha tracejada laranja).
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

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 4 — SCORES POR DIMENSÃO
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">3. Scores por Dimensão</h2>
          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide">Dimensão</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">IC %</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">IL %</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">Combinado</th>
                  <th className="px-5 py-3 text-left   text-xs font-semibold text-zinc-500 uppercase tracking-wide">Nível IC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {DIMENSOES.map(({ key, ic, il, combined, nivel }) => (
                  <tr key={key} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${DIM_COLOR[key]}`} />
                        {DIM_LABEL[key]}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums font-semibold text-blue-700">{fmt(ic)}</td>
                    <td className="px-5 py-3.5 text-center tabular-nums font-semibold text-orange-600">{fmt(il)}</td>
                    <td className="px-5 py-3.5 text-center tabular-nums font-bold text-zinc-900">{fmt(combined)}</td>
                    <td className="px-5 py-3.5"><NivelBadge nivel={nivel} size="sm" /></td>
                  </tr>
                ))}
                {/* Linha global */}
                <tr className="bg-zinc-50 font-semibold border-t-2 border-zinc-200">
                  <td className="px-5 py-3.5 text-zinc-800 font-bold">Global</td>
                  <td className="px-5 py-3.5 text-center tabular-nums text-blue-700">{fmt(result.ic_global_pct)}</td>
                  <td className="px-5 py-3.5 text-center tabular-nums text-orange-600">{fmt(result.il_global_pct)}</td>
                  <td className="px-5 py-3.5 text-center tabular-nums font-black text-zinc-900">{fmt(result.combined_global_pct)}</td>
                  <td className="px-5 py-3.5"><NivelBadge nivel={result.nivel_combined} size="sm" /></td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 5 — LAUDOS POR DIMENSÃO
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">4. Laudos por Dimensão</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Análise qualitativa de cada dimensão, baseada no nível IC apurado.
          </p>

          <div className="space-y-5">
            {DIMENSOES.map(({ key, nivel, laudoId }) => {
              const laudo = laudoId ? laudosMap[laudoId] : null
              return (
                <div key={key} className="rounded-xl border border-zinc-200 overflow-hidden">
                  <div className={`px-5 py-3 flex items-center justify-between ${DIM_COLOR[key].replace('bg-', 'bg-').replace('-600', '-600').replace('-500', '-500')} text-white`}>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold">{DIM_LABEL[key]}</span>
                    </div>
                    <NivelBadge nivel={nivel} size="sm" />
                  </div>
                  <div className="px-5 py-4 bg-white">
                    {laudo ? (
                      <p className="text-sm text-zinc-700 leading-relaxed">{laudo.texto}</p>
                    ) : (
                      <p className="text-sm text-zinc-400 italic">Laudo não disponível para esta dimensão.</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 6 — ANÁLISE DE GAPS IL × IC
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">5. Análise de Gaps IL × IC</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Gap = IL% − IC%. Valor positivo indica que a liderança percebe a dimensão
            melhor do que os colaboradores. Valor negativo indica subestimação.
          </p>

          {/* Legenda */}
          <div className="flex flex-wrap gap-3 mb-6 text-xs">
            {[
              { label: 'Alinhado',               color: 'bg-green-400',  range: '|gap| < 10pp' },
              { label: 'Div. Moderada',           color: 'bg-amber-400',  range: '10–20pp'      },
              { label: 'Div. Significativa',      color: 'bg-orange-400', range: '20–30pp'      },
              { label: 'Bolha de Percepção',      color: 'bg-red-400',    range: '≥ 30pp'       },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className={`inline-block w-3 h-3 rounded-full ${item.color}`} />
                <span className="text-zinc-600">{item.label}</span>
                <span className="text-zinc-400">({item.range})</span>
              </div>
            ))}
          </div>

          <div className="overflow-x-auto rounded-xl border border-zinc-200">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-200 bg-zinc-50">
                  <th className="px-5 py-3 text-left text-xs font-semibold text-zinc-500 uppercase tracking-wide w-32">Dimensão</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">IC %</th>
                  <th className="px-5 py-3 text-center text-xs font-semibold text-zinc-500 uppercase tracking-wide">IL %</th>
                  <th className="px-5 py-3 text-left   text-xs font-semibold text-zinc-500 uppercase tracking-wide">Gap</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100 bg-white">
                {DIMENSOES.map(({ key, ic, il, gap }) => (
                  <tr key={key} className="hover:bg-zinc-50 transition-colors">
                    <td className="px-5 py-3.5 font-medium text-zinc-900">
                      <div className="flex items-center gap-2">
                        <span className={`inline-block w-2.5 h-2.5 rounded-full ${DIM_COLOR[key]}`} />
                        {DIM_LABEL[key]}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-center tabular-nums text-blue-700 font-semibold">{fmt(ic)}</td>
                    <td className="px-5 py-3.5 text-center tabular-nums text-orange-600 font-semibold">{fmt(il)}</td>
                    <td className="px-5 py-3.5"><GapBar gap={gap} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 7 — ALERTAS
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">6. Alertas do Diagnóstico</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Sinais automáticos detectados pelo motor de cálculo que requerem atenção especial.
          </p>

          {/* Questões âncora — destaque especial */}
          {result.anchor_questions && result.anchor_questions.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">
                ⚓ Questões Âncora detectadas (média IC ≤ 1.5)
              </p>
              <div className="flex flex-wrap gap-2">
                {result.anchor_questions.map(aq => (
                  <div key={aq.questao} className="rounded-lg border border-amber-300 bg-white px-3 py-2 text-xs text-amber-800">
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

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 8 — BLOCOS CRÍTICOS
        ═══════════════════════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">7. Scores por Bloco</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Cada dimensão é dividida em blocos temáticos. Blocos com score IC ≤ 40%
            são considerados críticos e marcados com ⚠.
          </p>
          <BlocoScoreGrid result={result} />
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 9 — NOTA METODOLÓGICA
        ═══════════════════════════════════════════════════════ */}
        <section className="py-10">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">8. Nota Metodológica</h2>
          <div className="prose prose-sm max-w-none text-zinc-600 space-y-4">
            <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 space-y-3">
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Instrumentos</h3>
                <p>
                  O diagnóstico Quantum5G utiliza dois instrumentos do <strong>Pentagrama de Ginger</strong>:
                  o <strong>IC — Instrumento de Colaboradores</strong> (125 questões, respostas anônimas) e o
                  <strong> IL — Instrumento de Liderança</strong> (125 questões espelhadas, resposta única do líder).
                  Ambos avaliam as cinco dimensões organizacionais: Física, Afetiva, Racional, Social e Cultural.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Escala de resposta</h3>
                <p>
                  Escala Likert de 4 pontos: <strong>1 — Nunca</strong>, <strong>2 — Raramente</strong>,
                  <strong> 3 — Frequentemente</strong>, <strong>4 — Sempre</strong>.
                  Os scores são convertidos para percentual: (média − 1) ÷ 3 × 100.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Ponderação IC × IL</h3>
                <p>
                  O score combinado usa <strong>IC × 60% + IL × 40%</strong> quando N ≥ 3 respondentes,
                  priorizando a voz coletiva dos colaboradores. Com N &lt; 3, os pesos são invertidos
                  (IL × 60% + IC × 40%).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Classificação de nível</h3>
                <p>
                  <strong>Crítico</strong> (0–40%) · <strong>Vulnerável</strong> (40–60%) ·
                  <strong> Saudável</strong> (60–80%) · <strong>Excelente</strong> (80–100%).
                  O nível de cada dimensão é determinado exclusivamente pelo score IC.
                  Os laudos são textos fixos associados ao nível IC de cada dimensão.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Alertas automáticos</h3>
                <p>
                  <strong>Bolha Sistêmica</strong>: gap IL−IC ≥ 20pp em ≥ 3 dimensões.
                  <strong> Questão Âncora</strong>: média IC ≤ 1.5 em questão específica.
                  <strong> Bloco Crítico Oculto</strong>: bloco com IC ≤ 40% em dimensão com nível ≥ Saudável.
                  <strong> Baixa Amostragem</strong>: N &lt; 5 respondentes (aviso) ou N &lt; 3 (pesos invertidos).
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-zinc-800 mb-1">Anonimato</h3>
                <p>
                  As respostas dos colaboradores são totalmente anônimas.
                  Nenhuma informação de identidade é registrada ou vinculada às respostas individuais.
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 text-center pt-2">
              Quantum5G · Pentagrama de Ginger · Módulo Diagnóstico · {new Date().getFullYear()}
            </p>
          </div>
        </section>

        {/* ═══════════════════════════════════════════════════════
            SEÇÃO 10 — ANÁLISE IA (only for consultant/admin)
        ═══════════════════════════════════════════════════════ */}
        {isConsultantOrAdmin && (
          <div className="border-t border-zinc-100 no-print">
            <SecaoIA
              diagnosticId={id}
              companyName={company.name}
              report={aiReport}
              canGenerate={isConsultantOrAdmin}
            />
          </div>
        )}

      </div>
    </div>
  )
}
