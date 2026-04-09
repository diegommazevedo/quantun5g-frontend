/**
 * QUANTUM5G — Relatório do Líder
 * Rota: /relatorio/lider/[id]
 *
 * Acesso: líder autenticado com email = diagnostic.leader_email
 * Fluxo de primeiro acesso: convite por email → /auth/callback → esta rota
 * Sem ações de consultor (sem encerrar, sem tokens IL/IC)
 * PDF export via window.print() disponível
 */

import { notFound, redirect } from 'next/navigation'
import { createClient }        from '@/lib/supabase/server'
import { createClient as createAdmin } from '@supabase/supabase-js'
import { PentagramaVisual }    from '@/components/relatorio/PentagramaVisual'
import { NivelBadge }          from '@/components/relatorio/NivelBadge'
import { GapBar }              from '@/components/relatorio/GapBar'
import { AlertasList }         from '@/components/relatorio/AlertasList'
import { BlocoScoreGrid }      from '@/components/relatorio/BlocoScoreGrid'
import { PrintButton }         from '@/app/relatorio/[id]/PrintButton'
import type { DiagnosticResult, Laudo } from '@/types/database'

// ─── Constantes (idênticas ao relatório do consultor) ───────────

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

interface Props {
  params: Promise<{ id: string }>
}

export default async function RelatorioLiderPage({ params }: Props) {
  const { id } = await params

  // ── 1. Autenticação
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/relatorio/lider/${id}`)

  // ── 2. Busca diagnóstico via admin (bypass RLS para verificar acesso)
  const admin = createAdmin(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  const { data: diag } = await admin
    .from('diagnostics')
    .select('id, name, leader_email, leader_name, companies(id, name, total_collaborators)')
    .eq('id', id)
    .single() as { data: { id: string; name: string; leader_email: string | null; leader_name: string | null; companies: { name: string; total_collaborators: number } } | null }

  if (!diag) notFound()

  // ── 3. Autorização: email do usuário deve ser o leader_email
  const leaderEmail = (diag.leader_email as string | null)?.toLowerCase().trim()
  const userEmail   = user.email?.toLowerCase().trim()

  if (!leaderEmail || leaderEmail !== userEmail) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm text-center space-y-4 p-8">
          <p className="text-4xl">🔒</p>
          <h1 className="text-xl font-semibold text-zinc-800">Acesso negado</h1>
          <p className="text-sm text-zinc-500">
            Este relatório está disponível apenas para o líder do diagnóstico.
            Se você é o líder, entre com o e-mail cadastrado no diagnóstico.
          </p>
          <a href="/login" className="text-sm text-violet-700 hover:underline">
            Entrar com outro e-mail
          </a>
        </div>
      </div>
    )
  }

  // ── 4. Resultado calculado
  const { data: result } = await admin
    .from('diagnostic_results')
    .select('*')
    .eq('diagnostic_id', id)
    .single() as { data: DiagnosticResult | null }

  if (!result) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="max-w-sm text-center space-y-4 p-8">
          <p className="text-4xl">⏳</p>
          <h1 className="text-xl font-semibold text-zinc-800">Relatório ainda não disponível</h1>
          <p className="text-sm text-zinc-500">
            O consultor ainda está processando os resultados do diagnóstico.
            Você receberá um novo link assim que estiver pronto.
          </p>
        </div>
      </div>
    )
  }

  // ── 5. Laudos
  const laudoIds = [
    result.laudo_fisica_id, result.laudo_afetiva_id, result.laudo_racional_id,
    result.laudo_social_id, result.laudo_cultural_id,
  ].filter((v): v is string => !!v)

  const { data: laudosRows } = laudoIds.length > 0
    ? await admin.from('laudos').select('*').in('id', laudoIds) as { data: Laudo[] | null }
    : { data: [] as Laudo[] }

  const laudosMap = Object.fromEntries((laudosRows ?? []).map(l => [l.id, l]))

  // ── 6. Helpers
  const company      = diag.companies as { name: string; total_collaborators: number }
  const nivelGlobal  = result.nivel_combined ?? 'sem_dados'
  const gradientBg   = NIVEL_BG[nivelGlobal] ?? NIVEL_BG['sem_dados']
  const dataGeracao  = new Date(result.calculated_at).toLocaleDateString('pt-BR', {
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
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-zinc-800">
            Seu Relatório de Diagnóstico
          </span>
          <span className="rounded-full bg-violet-100 border border-violet-200 px-2 py-0.5 text-xs text-violet-700">
            Visão Liderança
          </span>
        </div>
        <PrintButton
          companyName={company.name}
          diagnosticName={diag.name}
        />
      </div>

      <div className="max-w-4xl mx-auto px-6 pb-24 space-y-0">

        {/* ══ SEÇÃO 1 — CAPA ══════════════════════════════════════ */}
        <section className="page-break relative rounded-2xl overflow-hidden mb-12 print:rounded-none" style={{ minHeight: 420 }}>
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
                <p className="text-white/80 text-sm">
                  <span className="opacity-60">Líder: </span>
                  {diag.leader_name ?? leaderEmail}
                </p>
                <p className="text-white/80 text-sm">
                  <span className="opacity-60">Respondentes IC: </span>
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

        {/* ══ SEÇÃO 2 — RESUMO EXECUTIVO ══════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">1. Resumo Executivo</h2>
          <div className="flex flex-wrap gap-4 mb-8">
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Score IC Global</p>
              <p className="text-4xl font-black text-zinc-900">{fmt(result.ic_global_pct)}</p>
              <p className="text-xs text-zinc-400 mt-1">Colaboradores</p>
            </div>
            <div className="flex-1 min-w-40 rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 text-center">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Score IL Global</p>
              <p className="text-4xl font-black text-zinc-900">{fmt(result.il_global_pct)}</p>
              <p className="text-xs text-zinc-400 mt-1">Liderança (você)</p>
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
          <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-5 py-4 text-sm text-zinc-600">
            <span className="font-semibold text-zinc-800">{result.n_ic_respondents}</span> colaboradores responderam ao IC
            {result.n_ic_respondents < 3 && (
              <span className="ml-2 inline-flex items-center rounded-full bg-amber-100 border border-amber-200 px-2 py-0.5 text-xs text-amber-800">
                ⚠ Baixa amostragem — pesos ajustados (IL×60% / IC×40%)
              </span>
            )}
          </div>
        </section>

        {/* ══ SEÇÃO 3 — PENTAGRAMA VISUAL ═════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">2. Pentagrama de Saúde Organizacional</h2>
          <p className="text-sm text-zinc-500 mb-8">
            Azul (sólido) = percepção dos colaboradores (IC). Laranja (tracejado) = sua percepção como líder (IL).
          </p>
          <PentagramaVisual
            ic_fisica_pct={result.ic_fisica_pct}   ic_afetiva_pct={result.ic_afetiva_pct}
            ic_racional_pct={result.ic_racional_pct} ic_social_pct={result.ic_social_pct}
            ic_cultural_pct={result.ic_cultural_pct}
            il_fisica_pct={result.il_fisica_pct}   il_afetiva_pct={result.il_afetiva_pct}
            il_racional_pct={result.il_racional_pct} il_social_pct={result.il_social_pct}
            il_cultural_pct={result.il_cultural_pct}
          />
        </section>

        {/* ══ SEÇÃO 4 — SCORES POR DIMENSÃO ═══════════════════════ */}
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

        {/* ══ SEÇÃO 5 — LAUDOS POR DIMENSÃO ═══════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">4. Laudos por Dimensão</h2>
          <p className="text-sm text-zinc-500 mb-6">Análise qualitativa baseada no nível IC de cada dimensão.</p>
          <div className="space-y-5">
            {DIMENSOES.map(({ key, nivel, laudoId }) => {
              const laudo = laudoId ? laudosMap[laudoId] : null
              return (
                <div key={key} className="rounded-xl border border-zinc-200 overflow-hidden">
                  <div className={`px-5 py-3 flex items-center justify-between ${DIM_COLOR[key]} text-white`}>
                    <span className="font-semibold">{DIM_LABEL[key]}</span>
                    <NivelBadge nivel={nivel} size="sm" />
                  </div>
                  <div className="px-5 py-4 bg-white">
                    {laudo
                      ? <p className="text-sm text-zinc-700 leading-relaxed">{laudo.texto}</p>
                      : <p className="text-sm text-zinc-400 italic">Laudo não disponível.</p>
                    }
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* ══ SEÇÃO 6 — GAPS IL × IC ══════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">5. Análise de Gaps IL × IC</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Gap = IL% − IC%. Positivo = você percebe melhor que seus colaboradores. Negativo = subestimação.
          </p>
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
                  <tr key={key} className="hover:bg-zinc-50">
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

        {/* ══ SEÇÃO 7 — ALERTAS ════════════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">6. Alertas do Diagnóstico</h2>
          <p className="text-sm text-zinc-500 mb-6">Sinais automáticos detectados pelo motor de cálculo.</p>
          {result.anchor_questions && result.anchor_questions.length > 0 && (
            <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 px-5 py-4">
              <p className="text-sm font-semibold text-amber-900 mb-2">⚓ Questões Âncora (média IC ≤ 1.5)</p>
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

        {/* ══ SEÇÃO 8 — BLOCOS CRÍTICOS ════════════════════════════ */}
        <section className="page-break py-10 border-b border-zinc-100">
          <h2 className="text-xl font-bold text-zinc-900 mb-2">7. Scores por Bloco</h2>
          <p className="text-sm text-zinc-500 mb-6">
            Blocos com score IC ≤ 40% são considerados críticos (⚠).
          </p>
          <BlocoScoreGrid result={result} />
        </section>

        {/* ══ SEÇÃO 9 — NOTA METODOLÓGICA ═════════════════════════ */}
        <section className="py-10">
          <h2 className="text-xl font-bold text-zinc-900 mb-6">8. Nota Metodológica</h2>
          <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-6 py-5 space-y-3 text-sm text-zinc-600">
            <p><strong className="text-zinc-800">Instrumentos:</strong> IC (125 q, colaboradores, anônimo) e IL (125 q espelhadas, líder). 5 dimensões: Física, Afetiva, Racional, Social, Cultural.</p>
            <p><strong className="text-zinc-800">Escala:</strong> 1 (Nunca) a 4 (Sempre). Score% = (média − 1) ÷ 3 × 100.</p>
            <p><strong className="text-zinc-800">Ponderação:</strong> IC×60% + IL×40% (N ≥ 3). Com N &lt; 3, pesos invertidos.</p>
            <p><strong className="text-zinc-800">Níveis IC:</strong> Crítico (0–39%) · Vulnerável (40–59%) · Saudável (60–79%) · Excelente (80–100%).</p>
            <p><strong className="text-zinc-800">Anonimato:</strong> Respostas dos colaboradores totalmente anônimas — sem vínculo com identidade.</p>
          </div>
          <p className="text-xs text-zinc-400 text-center mt-6">
            Quantum5G · Pentagrama de Ginger · Módulo Diagnóstico · {new Date().getFullYear()}
          </p>
        </section>

      </div>
    </div>
  )
}
