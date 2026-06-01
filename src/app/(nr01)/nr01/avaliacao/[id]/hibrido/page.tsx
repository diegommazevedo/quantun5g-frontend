/**
 * Devolutiva híbrida Pentagrama × NR-01 — motor determinístico (sem LLM).
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  NR01_DIMENSION_LABEL,
  RISK_LEVEL_LABEL,
} from '@/types/nr01'
import type { HybridReportPayload, HybridSignalType } from '@/types/hybrid'
import { gerarDevolutivaHibrida } from './actions'
import { PrintHybridButton } from './PrintHybridButton'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

const SIGNAL_STYLE: Record<HybridSignalType, string> = {
  REFORCO: 'bg-red-100 text-red-900 border-red-200',
  TENSAO: 'bg-amber-100 text-amber-900 border-amber-200',
  FACHADA: 'bg-violet-100 text-violet-900 border-violet-200',
  ALINHADO_RISCO: 'bg-zinc-100 text-zinc-700 border-zinc-200',
  SEM_DADOS_PENTAGRAMA: 'bg-zinc-100 text-zinc-500 border-zinc-200',
}

const SIGNAL_LABEL: Record<HybridSignalType, string> = {
  REFORCO: 'Reforço norma + vivido',
  TENSAO: 'Tensão regulatória',
  FACHADA: 'Fachada de conformidade',
  ALINHADO_RISCO: 'Alinhado',
  SEM_DADOS_PENTAGRAMA: 'Sem dados',
}

export default async function DevolutivaHibridaPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error: errParam } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assess } = await supabase
    .from('nr01_assessments')
    .select('id, name, status, linked_diagnostic_id, companies(name)')
    .eq('id', id)
    .single()

  if (!assess) notFound()

  const a = assess as {
    id: string
    name: string
    status: string
    linked_diagnostic_id: string | null
    companies: { name: string } | null
  }

  const { data: hybrid } = await supabase
    .from('hybrid_reports')
    .select('*')
    .eq('assessment_id', id)
    .maybeSingle()

  const payload = (hybrid as { payload?: HybridReportPayload } | null)?.payload ?? null
  const sha = (hybrid as { payload_sha256?: string } | null)?.payload_sha256

  return (
    <div className="mx-auto max-w-4xl space-y-8 pb-16 print:max-w-none">
      <div className="flex flex-wrap items-start justify-between gap-4 print:hidden">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">
            {a.companies?.name ?? '—'} · Devolutiva integrada
          </p>
          <h1 className="text-2xl font-bold text-zinc-900">Diagnóstico híbrido</h1>
          <p className="mt-1 text-sm text-zinc-600">
            NR-01 × Pentagrama · motor v1.0 · sem LLM
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link
            href={`/nr01/avaliacao/${id}`}
            className="text-sm text-zinc-500 hover:text-zinc-900"
          >
            ← Avaliação
          </Link>
          {a.linked_diagnostic_id && (
            <Link
              href={`/relatorio/${a.linked_diagnostic_id}`}
              className="text-sm text-purple-700 hover:underline"
            >
              Relatório Pentagrama
            </Link>
          )}
        </div>
      </div>

      {errParam && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800 print:hidden">
          {decodeURIComponent(errParam)}
        </div>
      )}

      {!a.linked_diagnostic_id && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
          Esta avaliação não tem diagnóstico Pentagrama vinculado. Edite o vínculo ao criar uma nova
          avaliação ou recrie com <code className="rounded bg-amber-100 px-1">linked_diagnostic_id</code>.
        </div>
      )}

      {a.linked_diagnostic_id && a.status === 'CONCLUIDO' && (
        <section className="flex flex-wrap gap-3 print:hidden">
          <form action={gerarDevolutivaHibrida}>
            <input type="hidden" name="assessment_id" value={id} />
            <button
              type="submit"
              className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
            >
              {payload ? 'Recalcular devolutiva' : 'Gerar devolutiva híbrida'}
            </button>
          </form>
          <form action={gerarDevolutivaHibrida}>
            <input type="hidden" name="assessment_id" value={id} />
            <input type="hidden" name="seed_plano" value="1" />
            <button
              type="submit"
              className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
            >
              Gerar + semear plano PDCA
            </button>
          </form>
          {payload && (
            <Link
              href={`/nr01/avaliacao/${id}/plano`}
              className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
            >
              Abrir plano de ação →
            </Link>
          )}
          {payload && <PrintHybridButton companyName={payload.company_name} />}
        </section>
      )}

      {!payload && a.linked_diagnostic_id && (
        <p className="text-sm text-zinc-500 print:hidden">
          Clique em &quot;Gerar devolutiva híbrida&quot; após processar NR-01 e encerrar o Pentagrama vinculado.
        </p>
      )}

      {payload && (
        <>
          <header className="rounded-xl border border-zinc-200 bg-gradient-to-br from-zinc-900 to-zinc-800 p-6 text-white print:border-zinc-400 print:bg-white print:text-zinc-900">
            <p className="text-xs uppercase tracking-widest opacity-80">Quantum5G · Devolutiva integrada</p>
            <h2 className="mt-2 text-xl font-bold">{payload.company_name}</h2>
            <p className="mt-1 text-sm opacity-90">
              {payload.assessment_name} + {payload.diagnostic_name}
            </p>
            <div className="mt-4 flex flex-wrap gap-4 text-sm">
              <span>ISO NR-01: <strong>{payload.iso_score?.toFixed(1) ?? '—'}</strong> ({RISK_LEVEL_LABEL[payload.iso_risk_level]})</span>
              <span>Pentagrama combinado: <strong>{payload.pentagrama_global_combined != null ? `${payload.pentagrama_global_combined.toFixed(0)}%` : '—'}</strong></span>
              <span>N IC: {payload.pentagrama_n_ic ?? 0}</span>
            </div>
            {sha && (
              <p className="mt-3 break-all font-mono text-[10px] opacity-60 print:text-zinc-500">
                SHA-256: {sha}
              </p>
            )}
          </header>

          <section className="space-y-4 rounded-xl border border-zinc-200 bg-white p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">Resumo executivo</h3>
            <div className="space-y-3 text-sm leading-relaxed text-zinc-800">
              <p><span className="font-semibold text-zinc-900">Avaliativo:</span> {payload.executive_brief.avaliativo}</p>
              <p><span className="font-semibold text-zinc-900">Corretivo:</span> {payload.executive_brief.corretivo}</p>
              <p><span className="font-semibold text-zinc-900">Executivo:</span> {payload.executive_brief.executivo}</p>
            </div>
            <div className="grid gap-2 sm:grid-cols-3 text-xs text-zinc-600">
              <div className="rounded-lg bg-zinc-50 p-3"><strong>Curto:</strong> {payload.executive_brief.horizontes.curto}</div>
              <div className="rounded-lg bg-zinc-50 p-3"><strong>Médio:</strong> {payload.executive_brief.horizontes.medio}</div>
              <div className="rounded-lg bg-zinc-50 p-3"><strong>Longo:</strong> {payload.executive_brief.horizontes.longo}</div>
            </div>
          </section>

          {payload.signals.length > 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-6">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-zinc-700">
                Matriz de tensão (NR-01 × vivido)
              </h3>
              <ul className="space-y-3">
                {payload.signals.map((s) => (
                  <li key={s.nr01_code} className="rounded-lg border border-zinc-100 p-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-medium text-zinc-900">
                        {NR01_DIMENSION_LABEL[s.nr01_code]}
                      </span>
                      <span className={`rounded-full border px-2 py-0.5 text-xs font-medium ${SIGNAL_STYLE[s.signal]}`}>
                        {SIGNAL_LABEL[s.signal]}
                      </span>
                      <span className="text-xs text-zinc-500">horizonte {s.horizon}</span>
                    </div>
                    <p className="mt-2 text-sm text-zinc-700">{s.narrative}</p>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-6">
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-emerald-900">
              Plano fecundado ({payload.plano_fecundado.length} ações priorizadas)
            </h3>
            {payload.plano_fecundado.length === 0 ? (
              <p className="text-sm text-zinc-600">Nenhuma dimensão em atenção ou superior — plano manual recomendado.</p>
            ) : (
              <ol className="space-y-4">
                {payload.plano_fecundado.map((p) => (
                  <li key={`${p.intervention_id}-${p.hybrid_rank}`} className="rounded-lg border border-emerald-100 bg-white p-4">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="text-xs font-mono text-zinc-400">#{p.hybrid_rank}</span>
                      <span className="font-semibold text-zinc-900">{p.title}</span>
                      <span className="rounded bg-zinc-900 px-1.5 py-0.5 text-xs text-white">{p.priority}</span>
                      <span className="text-xs text-zinc-500">{p.horizon} · {p.due_in_days} dias</span>
                    </div>
                    <p className="mt-2 whitespace-pre-wrap text-sm text-zinc-700">{p.description}</p>
                    {p.kpi && <p className="mt-2 text-xs text-zinc-500">KPI: {p.kpi}</p>}
                  </li>
                ))}
              </ol>
            )}
          </section>

          {payload.top_priorities.length > 0 && (
            <section className="rounded-xl border border-zinc-200 bg-white p-4 text-sm">
              <h3 className="font-semibold text-zinc-800">Top 3 para board</h3>
              <ul className="mt-2 list-disc pl-5 text-zinc-700">
                {payload.top_priorities.map((t) => (
                  <li key={t}>{t}</li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  )
}
