/**
 * QUANTUM5G — NR-01 · Monitoramento contínuo (micro-pulsos)
 *
 * Layout único: header de status, form de ativação, botão "disparar pulso da
 * semana" (cron fake manual), tabela histórica, série temporal por dimensão.
 *
 * Avisos importantes do plano (Diego, P3):
 *  - Calibration_weeks: alertas só após semana N+1 da config.
 *  - Adesão < 40% por 2 semanas consecutivas → alerta visual.
 *  - 3 perguntas/semana é o default, e ponto.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getActiveDriver } from '@/lib/nr01/email'
import { ASSESSMENT_STATUS_LABEL, NR01_DIMENSION_LABEL } from '@/types/nr01'
import type {
  Nr01Assessment,
  Nr01PulseConfig,
  Nr01PulseDispatch,
  Nr01PulseWeeklyScore,
} from '@/types/nr01'
import {
  ativarMonitoramento,
  desativarMonitoramento,
  dispararPulsoSemanal,
} from './actions'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ status?: string; error?: string; sent?: string; failed?: string }>
}

const WEEK_DAY_LABEL: Record<number, string> = {
  1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado', 7: 'domingo',
}

export default async function MonitoramentoPage({ params, searchParams }: Props) {
  const { id } = await params
  const { status, error, sent, failed } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Carrega avaliação + empresa
  const { data: assessData } = await supabase
    .from('nr01_assessments')
    .select(`
      id, name, status, instrument_version, company_id, consultant_id,
      companies:companies!nr01_assessments_company_id_fkey ( id, name, total_collaborators )
    `)
    .eq('id', id)
    .single()
  if (!assessData) notFound()
  const a = assessData as unknown as Nr01Assessment & {
    companies: { id: string; name: string; total_collaborators: number } | null
  }

  // Bloqueia se status != CONCLUIDO
  if (a.status !== 'CONCLUIDO') {
    return (
      <div className="mx-auto max-w-2xl space-y-6 py-8">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Monitoramento contínuo</h1>
        </div>
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-6">
          <p className="text-sm text-amber-900">
            Micro-pulsos disponíveis após o processamento dos resultados da avaliação.
          </p>
          <p className="mt-2 text-sm text-amber-800">
            Status atual: <code className="rounded bg-amber-100 px-1.5 py-0.5">{ASSESSMENT_STATUS_LABEL[a.status]}</code>.
          </p>
          <Link
            href={`/nr01/avaliacao/${a.id}`}
            className="mt-4 inline-block text-sm font-medium text-amber-900 underline"
          >
            ← Voltar à avaliação
          </Link>
        </div>
      </div>
    )
  }

  // Config + dispatches + scores semanais
  const [{ data: configData }, { data: dispatchesData }, { data: scoresData }] = await Promise.all([
    supabase.from('nr01_pulse_config').select('*').eq('assessment_id', id).maybeSingle(),
    supabase.from('nr01_pulse_dispatches').select('*').eq('assessment_id', id).order('week_number', { ascending: false }),
    supabase.from('nr01_pulse_weekly_scores').select('*').eq('assessment_id', id).order('week_number'),
  ])

  const config = configData as Nr01PulseConfig | null
  const dispatches = (dispatchesData ?? []) as Nr01PulseDispatch[]
  const weeklyScores = (scoresData ?? []) as Nr01PulseWeeklyScore[]

  // Métricas de adesão por semana
  const adherenceByWeek = new Map<number, { invites: number; respondents: number }>()
  for (const d of dispatches) {
    adherenceByWeek.set(d.week_number, {
      invites: d.invites_sent_count,
      respondents: 0,
    })
  }
  // Agrega respondentes únicos por dispatch
  if (dispatches.length > 0) {
    const dispatchIds = dispatches.map((d) => d.id)
    const { data: respPivotData } = await supabase
      .from('nr01_pulse_responses')
      .select('dispatch_id, anon_id')
      .in('dispatch_id', dispatchIds)
    const respByDispatch = new Map<string, Set<string>>()
    for (const r of (respPivotData ?? []) as Array<{ dispatch_id: string; anon_id: string }>) {
      if (!respByDispatch.has(r.dispatch_id)) respByDispatch.set(r.dispatch_id, new Set())
      respByDispatch.get(r.dispatch_id)!.add(r.anon_id)
    }
    for (const d of dispatches) {
      const set = respByDispatch.get(d.id)
      const existing = adherenceByWeek.get(d.week_number)!
      existing.respondents = set?.size ?? 0
    }
  }

  // Alerta de adesão baixa: 40% por 2 semanas seguidas
  const lastTwoWeeks = dispatches.slice(0, 2).map((d) => {
    const m = adherenceByWeek.get(d.week_number)
    if (!m || m.invites === 0) return 100
    return (m.respondents / m.invites) * 100
  })
  const lowAdherence = lastTwoWeeks.length === 2 && lastTwoWeeks.every((p) => p < 40)

  // Calibração: alertas só após semana N
  const inCalibration = (config?.weeks_dispatched ?? 0) <= (config?.calibration_weeks ?? 3)

  const driver = getActiveDriver()

  // ============================================================
  // RENDER
  // ============================================================
  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.companies?.name ?? '—'}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Monitoramento contínuo</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Micro-pulsos semanais ·{' '}
            {config?.enabled ? (
              <span className="text-emerald-700">ativo</span>
            ) : (
              <span className="text-zinc-500">inativo</span>
            )}
            {config?.weeks_dispatched ? ` · ${config.weeks_dispatched} semana(s) disparada(s)` : ''}
            {' · driver email: '}
            <code className={`rounded px-1.5 py-0.5 text-[11px] ${driver === 'resend' ? 'bg-emerald-100 text-emerald-800' : 'bg-zinc-100 text-zinc-700'}`}>
              {driver}
            </code>
          </p>
        </div>
        <Link href={`/nr01/avaliacao/${a.id}`} className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Voltar
        </Link>
      </div>

      {/* Mensagens */}
      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}
      {status === 'ativado' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Monitoramento ativado. Use o botão abaixo para disparar o primeiro pulso.
        </div>
      )}
      {status === 'disparado' && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Pulso disparado. Enviados: {sent ?? '0'} · Falharam: {failed ?? '0'}
          {driver === 'console' && ' · driver console: emails registrados no log do servidor.'}
        </div>
      )}
      {lowAdherence && (
        <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          ⚠ Adesão abaixo de 40% nas 2 últimas semanas. Considere revisar horário, frequência
          ou conversar com a liderança da empresa sobre o canal.
        </div>
      )}
      {inCalibration && (config?.weeks_dispatched ?? 0) > 0 && (
        <div className="rounded-lg border border-blue-200 bg-blue-50 px-4 py-3 text-xs text-blue-900">
          Modo calibração: alertas preditivos só a partir da semana{' '}
          {(config?.calibration_weeks ?? 3) + 1}. Os primeiros disparos servem para
          validar adesão e estabilidade do sinal.
        </div>
      )}

      {/* ============================================================ */}
      {/* CONFIG                                                       */}
      {/* ============================================================ */}
      <section className="rounded-xl border border-zinc-200 bg-white p-5">
        <div className="mb-3 flex items-center justify-between">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-zinc-700">
            {config?.enabled ? 'Configuração ativa' : 'Ativar monitoramento'}
          </h2>
          {config?.enabled && (
            <form action={desativarMonitoramento}>
              <input type="hidden" name="assessment_id" value={id} />
              <button
                type="submit"
                className="rounded-lg border border-zinc-300 px-3 py-1.5 text-xs text-zinc-600 hover:border-red-400 hover:text-red-700"
              >
                Desativar
              </button>
            </form>
          )}
        </div>

        <form action={ativarMonitoramento} className="space-y-4">
          <input type="hidden" name="assessment_id" value={id} />

          <label className="block text-xs text-zinc-600">
            <span className="mb-1 block">Lista de emails (separados por vírgula, ponto-e-vírgula ou linha)</span>
            <textarea
              name="emails"
              rows={4}
              required
              defaultValue={config?.recipient_emails?.join('\n') ?? ''}
              placeholder="ana@empresa.com&#10;bruno@empresa.com&#10;carla@empresa.com"
              className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900"
            />
          </label>

          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="block text-xs text-zinc-600">
              <span className="mb-1 block">Dia da semana</span>
              <select
                name="day_of_week"
                defaultValue={config?.day_of_week ?? 1}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                {Object.entries(WEEK_DAY_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}-feira</option>
                ))}
              </select>
            </label>
            <label className="block text-xs text-zinc-600">
              <span className="mb-1 block">Perguntas / semana</span>
              <input
                name="questions_per_week"
                type="number"
                min={1} max={5}
                defaultValue={config?.questions_per_week ?? 3}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
            <label className="block text-xs text-zinc-600">
              <span className="mb-1 block">Janela de resposta (horas)</span>
              <input
                name="window_hours"
                type="number"
                min={24} max={720}
                defaultValue={config?.window_hours ?? 168}
                className="block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </label>
          </div>

          <button
            type="submit"
            className="rounded-lg bg-zinc-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-zinc-700"
          >
            {config?.enabled ? 'Salvar alterações' : 'Ativar monitoramento'}
          </button>
        </form>
      </section>

      {/* ============================================================ */}
      {/* DISPARO                                                      */}
      {/* ============================================================ */}
      {config?.enabled && (
        <section className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-amber-900">
            Disparar pulso desta semana
          </h2>
          <p className="mb-3 text-xs text-amber-800">
            Cron automático entra em segunda onda. Por enquanto, manual: clique toda segunda-feira.
            Última semana: {config.last_dispatched_at
              ? new Date(config.last_dispatched_at).toLocaleString('pt-BR')
              : 'nunca'}.
          </p>
          <form action={dispararPulsoSemanal}>
            <input type="hidden" name="assessment_id" value={id} />
            <button
              type="submit"
              className="rounded-lg bg-blue-800 px-5 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
            >
              Disparar pulso ({(config.recipient_emails?.length ?? 0)} destinatários)
            </button>
          </form>
        </section>
      )}

      {/* ============================================================ */}
      {/* HISTÓRICO                                                    */}
      {/* ============================================================ */}
      {dispatches.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Histórico de pulsos
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Semana</th>
                  <th className="px-4 py-3">Disparado em</th>
                  <th className="px-4 py-3">Janela fecha</th>
                  <th className="px-4 py-3">Convites</th>
                  <th className="px-4 py-3">Respondentes únicos</th>
                  <th className="px-4 py-3">Adesão</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {dispatches.map((d) => {
                  const m = adherenceByWeek.get(d.week_number) ?? { invites: 0, respondents: 0 }
                  const pct = m.invites > 0 ? (m.respondents / m.invites) * 100 : 0
                  return (
                    <tr key={d.id} className="hover:bg-zinc-50">
                      <td className="px-4 py-2 text-zinc-900">#{d.week_number}</td>
                      <td className="px-4 py-2 text-zinc-700">
                        {new Date(d.dispatched_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-zinc-700">
                        {new Date(d.window_closes_at).toLocaleString('pt-BR')}
                      </td>
                      <td className="px-4 py-2 text-zinc-700">{m.invites}</td>
                      <td className="px-4 py-2 text-zinc-700">{m.respondents}</td>
                      <td className="px-4 py-2">
                        <span className={`font-mono text-xs ${pct < 40 ? 'text-red-700' : pct < 60 ? 'text-amber-700' : 'text-emerald-700'}`}>
                          {pct.toFixed(0)}%
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* ============================================================ */}
      {/* SCORES POR DIMENSÃO (texto, não gráfico — minimal)           */}
      {/* ============================================================ */}
      {weeklyScores.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-700">
            Scores semanais por dimensão (k-anonymity ≥ 3)
          </h2>
          <div className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
            <table className="min-w-full divide-y divide-zinc-200 text-sm">
              <thead className="bg-zinc-50 text-left text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">Dimensão</th>
                  {dispatches.slice().reverse().map((d) => (
                    <th key={d.id} className="px-4 py-3 text-right">S{d.week_number}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-100">
                {/* lista as 10 dimensões */}
                {Array.from(new Set(weeklyScores.map((s) => s.dimension_code))).sort().map((dim) => (
                  <tr key={dim} className="hover:bg-zinc-50">
                    <td className="px-4 py-2 text-zinc-900">{NR01_DIMENSION_LABEL[dim]}</td>
                    {dispatches.slice().reverse().map((d) => {
                      const s = weeklyScores.find((x) => x.week_number === d.week_number && x.dimension_code === dim)
                      return (
                        <td key={d.id} className="px-4 py-2 text-right font-mono text-xs text-zinc-700">
                          {s ? s.score_pct.toFixed(0) : '—'}
                        </td>
                      )
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-2 text-[11px] text-zinc-500">
            "—" = semana com menos de 3 respostas únicas para a dimensão (k-anonymity bloqueia).
            Gráfico de linha entra em v2 — texto agora basta para validar o sinal.
          </p>
        </section>
      )}
    </div>
  )
}

