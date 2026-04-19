/**
 * QUANTUM5G — NR-01 · Análise cruzada Pentagrama ↔ NR-01
 *
 * Mostra o resultado do bridge (computado em processarResultados quando
 * há linked_diagnostic_id):
 *   - Score combinado + nível
 *   - Confidence (nominal/statistical) + min_n
 *   - Convergências (ambos sinalizam o mesmo)
 *   - Divergências (uma leitura adiantada à outra — material de devolutiva)
 *   - Matriz de correlação aproximada
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  Nr01Assessment,
  Nr01PentagramaBridge,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from '@/types/nr01'

interface Props {
  params: Promise<{ id: string }>
}

const COMBINED_LABEL: Record<string, string> = {
  excelente:  'Excelente',
  saudavel:   'Saudável',
  vulneravel: 'Vulnerável',
  critico:    'Crítico',
  sem_dados:  'Sem dados',
}

const COMBINED_COLOR: Record<string, string> = {
  excelente:  'bg-emerald-500 text-white',
  saudavel:   'bg-green-500 text-white',
  vulneravel: 'bg-orange-500 text-white',
  critico:    'bg-red-600 text-white',
  sem_dados:  'bg-zinc-300 text-zinc-700',
}

export default async function BridgePage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carrega avaliação + empresa
  const { data: assessmentData } = await supabase
    .from('nr01_assessments')
    .select(`
      *,
      companies:companies!nr01_assessments_company_id_fkey ( id, name )
    `)
    .eq('id', id)
    .single()
  if (!assessmentData) notFound()
  const a = assessmentData as unknown as Nr01Assessment & {
    companies: { id: string; name: string } | null
  }

  // Carrega bridge se existir
  const { data: bridgeData } = await supabase
    .from('nr01_pentagrama_bridge')
    .select('*')
    .eq('assessment_id', id)
    .maybeSingle()

  const bridge = bridgeData as Nr01PentagramaBridge | null

  // ============================================================
  // Caso 1: avaliação sem vínculo Pentagrama
  // ============================================================
  if (!a.linked_diagnostic_id) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Análise cruzada NR-01 ↔ Pentagrama</h1>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-zinc-50 p-6">
          <p className="text-sm text-zinc-700">
            Esta avaliação não está vinculada a um diagnóstico Pentagrama.
            Análise cruzada não está disponível.
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            Vínculo é definido na criação da avaliação (campo &quot;Vincular a um diagnóstico
            Pentagrama&quot;). Para habilitar, crie uma nova avaliação com o vínculo selecionado.
          </p>
          <Link
            href={`/nr01/avaliacao/${a.id}`}
            className="mt-4 inline-block text-sm text-zinc-700 underline hover:text-zinc-900"
          >
            ← Voltar à avaliação
          </Link>
        </div>
      </div>
    )
  }

  // ============================================================
  // Caso 2: tem vínculo mas bridge ainda não foi calculado
  // (provavelmente porque processarResultados ainda não rodou ou o
  //  diagnóstico Pentagrama vinculado não tem diagnostic_results)
  // ============================================================
  if (!bridge) {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Análise cruzada NR-01 ↔ Pentagrama</h1>
        </div>
        <div className="rounded-xl border border-yellow-200 bg-yellow-50 p-6">
          <p className="text-sm text-yellow-900">
            Bridge ainda não calculado.
          </p>
          <p className="mt-2 text-sm text-yellow-800">
            Status atual da avaliação: <code className="rounded bg-yellow-100 px-1.5 py-0.5">{a.status}</code>.
            O cruzamento é gerado automaticamente em &quot;Processar resultados&quot;,
            desde que o diagnóstico Pentagrama vinculado já tenha resultados calculados.
          </p>
          <Link
            href={`/nr01/avaliacao/${a.id}`}
            className="mt-4 inline-block text-sm text-yellow-900 underline"
          >
            ← Voltar à avaliação
          </Link>
        </div>
      </div>
    )
  }

  // ============================================================
  // Caso 3: bridge presente — render completo
  // ============================================================
  const combinedLevel = bridge.combined_level ?? 'sem_dados'
  const minN = bridge.min_n_respondents

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Análise cruzada NR-01 ↔ Pentagrama</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Cruza ISO regulatório (NR-01) com IC vivido (Pentagrama). Calculado em{' '}
            {new Date(bridge.computed_at).toLocaleString('pt-BR')}.
          </p>
        </div>
        <Link href={`/nr01/avaliacao/${a.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </div>

      {/* Bloco resumo */}
      <section className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Score combinado</div>
          <div className="mt-1 font-serif text-3xl font-semibold text-zinc-900">
            {bridge.combined_score?.toFixed(1) ?? '—'}
          </div>
          <span className={`mt-2 inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${COMBINED_COLOR[combinedLevel]}`}>
            {COMBINED_LABEL[combinedLevel]}
          </span>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Confiança da análise</div>
          <div className="mt-1 text-lg font-semibold text-zinc-900">
            {bridge.confidence_level === 'statistical' ? 'Estatística' : 'Aproximação nominal'}
          </div>
          <p className="mt-1 text-xs text-zinc-500">
            {bridge.confidence_level === 'statistical'
              ? 'Correlação Pearson/Spearman com N suficiente.'
              : `Aproximação por delta (menor N: ${minN ?? '—'}). Estatística real exige N ≥ 200.`}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Diagnóstico Pentagrama vinculado</div>
          <Link
            href={`/diagnostico/${bridge.diagnostic_id}`}
            className="mt-1 inline-block text-sm text-zinc-700 underline hover:text-zinc-900"
          >
            Abrir diagnóstico
          </Link>
        </div>
      </section>

      {/* Convergências */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Convergências ({bridge.convergences.length})
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Pares de dimensões NR-01 ↔ Pentagrama que sinalizam o mesmo padrão (|delta| ≤ 12 pp).
          Confirma robustez da leitura.
        </p>
        {bridge.convergences.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
            Nenhuma convergência clara encontrada.
          </div>
        ) : (
          <ul className="space-y-2">
            {bridge.convergences.map((c, i) => (
              <li
                key={i}
                className="rounded-lg border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900"
              >
                <span className="font-mono text-xs text-emerald-700">{c.nr01_dim} ↔ {c.pentagrama_dim}</span>
                <p className="mt-1">{c.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Divergências */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Divergências ({bridge.divergences.length})
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Pares com gap significativo (|delta| ≥ 25 pp). Material clínico de devolutiva — uma
          leitura está adiantada à outra (regulatório vs vivido).
        </p>
        {bridge.divergences.length === 0 ? (
          <div className="rounded-lg border border-dashed border-zinc-300 bg-white p-4 text-sm text-zinc-500">
            Nenhuma divergência significativa.
          </div>
        ) : (
          <ul className="space-y-2">
            {bridge.divergences.map((d, i) => (
              <li
                key={i}
                className="rounded-lg border border-orange-300 bg-orange-50 p-3 text-sm text-orange-900"
              >
                <div className="flex items-center justify-between">
                  <span className="font-mono text-xs text-orange-700">{d.nr01_dim} ↔ {d.pentagrama_dim}</span>
                  <span className="font-mono text-xs font-semibold text-orange-700">
                    Δ {d.gap > 0 ? '+' : ''}{d.gap.toFixed(1)} pp
                  </span>
                </div>
                <p className="mt-1">{d.descricao}</p>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Matriz de correlação */}
      <section>
        <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-zinc-700">
          Matriz de correlação aproximada
        </h2>
        <p className="mb-3 text-xs text-zinc-500">
          Pseudo-coeficiente: r ≈ 1 − |delta| / 100. Valores próximos de 1 indicam acordo entre
          as duas leituras; próximos de 0 indicam dissonância.
        </p>
        <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
          <table className="min-w-full divide-y divide-zinc-200 text-sm">
            <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
              <tr>
                <th className="px-4 py-3">NR-01</th>
                <th className="px-4 py-3">Pentagrama</th>
                <th className="px-4 py-3 text-right">r</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-100">
              {Object.entries(bridge.correlation_matrix).flatMap(([nr01Dim, pentMap]) =>
                Object.entries(pentMap).map(([pentDim, r]) => (
                  <tr key={`${nr01Dim}-${pentDim}`} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-900">{nr01Dim}</td>
                    <td className="px-4 py-2 text-zinc-700">{pentDim}</td>
                    <td className="px-4 py-2 text-right">
                      <span
                        className={`font-mono text-xs ${
                          r >= 0.7 ? 'text-emerald-700'
                          : r >= 0.4 ? 'text-yellow-700'
                          : 'text-red-700'
                        }`}
                      >
                        {r.toFixed(3)}
                      </span>
                    </td>
                  </tr>
                )),
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Aviso se confiança nominal */}
      {bridge.confidence_level === 'nominal' && (
        <div className="rounded-lg border border-yellow-200 bg-yellow-50 p-4 text-xs text-yellow-900">
          <strong>Atenção:</strong> análise nominal por delta (não estatística). Use as convergências
          e divergências como hipóteses clínicas, não como diagnóstico fechado. Bridge passa a
          &quot;estatística&quot; quando o menor N entre as dimensões pareadas atinge 200 respondentes.
        </div>
      )}
    </div>
  )
}
