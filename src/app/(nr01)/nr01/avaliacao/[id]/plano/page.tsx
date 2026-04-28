/**
 * QUANTUM5G — NR-01 · Plano de Ação (PDCA)
 * Lista itens agrupados por dimensão. Permite sugestão automática a partir das
 * dimensões em risco, criação manual, mudança de status e checkpoints 30/60/90.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import {
  NR01_DIMENSION_LABEL,
  Nr01ActionItem,
  Nr01ActionPlan,
  Nr01ActionStatus,
  Nr01Assessment,
  Nr01DimensionScore,
  NR01_DIMENSION_CODES,
  RISK_LEVEL_COLOR,
  RISK_LEVEL_LABEL,
} from '@/types/nr01'
import {
  adicionarItemPlano,
  aprovarPlano,
  atualizarStatusItem,
  marcarCheckpoint,
  sugerirAcoesAuto,
} from './actions'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ error?: string }>
}

const STATUS_LABEL: Record<Nr01ActionStatus, string> = {
  pendente:     'Pendente',
  em_andamento: 'Em andamento',
  bloqueado:    'Bloqueado',
  concluido:    'Concluído',
  cancelado:    'Cancelado',
}

const STATUS_COLOR: Record<Nr01ActionStatus, string> = {
  pendente:     'bg-zinc-100 text-zinc-700',
  em_andamento: 'bg-blue-100 text-blue-800',
  bloqueado:    'bg-red-100 text-red-800',
  concluido:    'bg-emerald-100 text-emerald-800',
  cancelado:    'bg-zinc-200 text-zinc-500 line-through',
}

const PRIORITY_COLOR: Record<'P1' | 'P2' | 'P3', string> = {
  P1: 'bg-red-600 text-white',
  P2: 'bg-amber-100 text-amber-800',
  P3: 'bg-zinc-400 text-white',
}

function isOverdue(dueDate: string, status: Nr01ActionStatus): boolean {
  if (status === 'concluido' || status === 'cancelado') return false
  return new Date(dueDate) < new Date()
}

export default async function PlanoPDCAPage({ params, searchParams }: Props) {
  const { id } = await params
  const { error } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: assessmentData } = await supabase
    .from('nr01_assessments')
    .select('id, name, status, consultant_id')
    .eq('id', id)
    .single()
  if (!assessmentData) notFound()
  const a = assessmentData as Pick<Nr01Assessment, 'id' | 'name' | 'status' | 'consultant_id'>

  const [{ data: planData }, { data: scoresData }] = await Promise.all([
    supabase
      .from('nr01_action_plans')
      .select('*')
      .eq('assessment_id', id)
      .maybeSingle(),
    supabase
      .from('nr01_dimension_scores')
      .select('*')
      .eq('assessment_id', id)
      .order('dimension_code'),
  ])

  const plan = planData as Nr01ActionPlan | null
  const scores = (scoresData ?? []) as Nr01DimensionScore[]
  const scoreByDim = new Map(scores.map((s) => [s.dimension_code, s]))

  let items: Nr01ActionItem[] = []
  if (plan) {
    const { data: itemsData } = await supabase
      .from('nr01_action_items')
      .select('*')
      .eq('action_plan_id', plan.id)
      .order('priority')
      .order('due_date')
    items = (itemsData ?? []) as Nr01ActionItem[]
  }

  // Agrupa por dimensão
  const itemsByDim = new Map<string, Nr01ActionItem[]>()
  for (const it of items) {
    if (!itemsByDim.has(it.dimension_code)) itemsByDim.set(it.dimension_code, [])
    itemsByDim.get(it.dimension_code)!.push(it)
  }

  // KPIs do plano
  const total = items.length
  const concluidos = items.filter((i) => i.status === 'concluido').length
  const emAtraso = items.filter((i) => isOverdue(i.due_date, i.status)).length
  const p1Pendentes = items.filter((i) => i.priority === 'P1' && i.status !== 'concluido').length

  const dimensoesEmRisco = scores.filter((s) =>
    ['atencao', 'elevado', 'critico'].includes(s.risk_level),
  )

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-wide text-zinc-500">{a.name}</p>
          <h1 className="text-2xl font-bold text-zinc-900">Plano de Ação (PDCA)</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Status do plano:{' '}
            <code className="rounded bg-zinc-100 px-1.5 py-0.5">
              {plan?.status ?? 'não criado'}
            </code>
            {plan?.next_review_at && (
              <>
                {' '}· Próxima revisão{' '}
                <code className="rounded bg-zinc-100 px-1.5 py-0.5">
                  {plan.next_review_at}
                </code>
              </>
            )}
          </p>
        </div>
        <Link
          href={`/nr01/avaliacao/${id}`}
          className="text-sm text-zinc-500 hover:text-zinc-900"
        >
          ← Voltar à avaliação
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      {/* KPIs */}
      <section className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Total</div>
          <div className="mt-1 text-2xl font-semibold text-zinc-900">{total}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Concluídos</div>
          <div className="mt-1 text-2xl font-semibold text-emerald-700">{concluidos}</div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">Em atraso</div>
          <div className={`mt-1 text-2xl font-semibold ${emAtraso > 0 ? 'text-red-600' : 'text-zinc-900'}`}>
            {emAtraso}
          </div>
        </div>
        <div className="rounded-xl border border-zinc-200 bg-white p-4">
          <div className="text-xs uppercase tracking-wide text-zinc-500">P1 pendentes</div>
          <div className={`mt-1 text-2xl font-semibold ${p1Pendentes > 0 ? 'text-red-600' : 'text-zinc-900'}`}>
            {p1Pendentes}
          </div>
        </div>
      </section>

      {/* Ações de plano */}
      <section className="flex flex-wrap gap-3">
        {scores.length === 0 ? (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Processe os resultados antes de construir o plano de ação.
          </div>
        ) : (
          <>
            <form action={sugerirAcoesAuto}>
              <input type="hidden" name="assessment_id" value={id} />
              <button
                type="submit"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700"
              >
                Sugerir ações automaticamente ({dimensoesEmRisco.length} dim. em risco)
              </button>
            </form>
            {plan?.status === 'rascunho' && items.length > 0 && (
              <form action={aprovarPlano}>
                <input type="hidden" name="assessment_id" value={id} />
                <button
                  type="submit"
                  className="rounded-lg bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
                >
                  Aprovar plano
                </button>
              </form>
            )}
            {plan?.status === 'aprovado' && (
              <span className="rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                ✓ Plano aprovado
                {plan.approved_at && ` em ${new Date(plan.approved_at).toLocaleDateString('pt-BR')}`}
              </span>
            )}
          </>
        )}
      </section>

      {/* Form de ação manual */}
      {scores.length > 0 && (
        <details className="rounded-xl border border-zinc-200 bg-white p-4">
          <summary className="cursor-pointer text-sm font-semibold text-zinc-900">
            + Adicionar item manual
          </summary>
          <form action={adicionarItemPlano} className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
            <input type="hidden" name="assessment_id" value={id} />
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Dimensão *</label>
              <select
                name="dimension_code"
                required
                defaultValue=""
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              >
                <option value="">— escolha —</option>
                {NR01_DIMENSION_CODES.map((c) => (
                  <option key={c} value={c}>{NR01_DIMENSION_LABEL[c]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Prioridade</label>
              <select name="priority" defaultValue="P2" className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm">
                <option value="P1">P1 — alta</option>
                <option value="P2">P2 — média</option>
                <option value="P3">P3 — baixa</option>
              </select>
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Título *</label>
              <input
                name="title"
                required
                placeholder="Ex: Implantar canal externo de denúncias"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-700">Descrição</label>
              <textarea
                name="description"
                rows={2}
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Responsável (nome) *</label>
              <input
                name="owner_name"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Responsável (e-mail)</label>
              <input
                name="owner_email"
                type="email"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Prazo *</label>
              <input
                name="due_date"
                type="date"
                required
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-zinc-700">Custo estimado (BRL)</label>
              <input
                name="estimated_cost_brl"
                type="number"
                step="0.01"
                min="0"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <label className="mb-1 block text-xs font-medium text-zinc-700">KPI de sucesso</label>
              <input
                name="kpi"
                placeholder="Ex: Reduzir score de carga em 10 p.p. em 60 dias"
                className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
              />
            </div>
            <div className="md:col-span-2">
              <button
                type="submit"
                className="rounded-lg bg-blue-800 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-900"
              >
                Adicionar
              </button>
            </div>
          </form>
        </details>
      )}

      {/* Itens agrupados por dimensão */}
      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white p-10 text-center">
          <p className="text-zinc-700">Nenhum item no plano ainda.</p>
          <p className="mt-2 text-sm text-zinc-500">
            Use a sugestão automática para popular o plano a partir das dimensões em risco.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {NR01_DIMENSION_CODES.map((dimCode) => {
            const dimItems = itemsByDim.get(dimCode)
            if (!dimItems || dimItems.length === 0) return null
            const score = scoreByDim.get(dimCode)
            return (
              <section key={dimCode} className="overflow-hidden rounded-xl border border-zinc-200 bg-white">
                <div className="flex items-center justify-between border-b border-zinc-100 bg-zinc-50 px-4 py-3">
                  <h2 className="text-sm font-semibold text-zinc-900">{NR01_DIMENSION_LABEL[dimCode]}</h2>
                  {score && (
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-zinc-500">
                        score {score.score_pct?.toFixed(1) ?? '—'} · n {score.n_respondents}
                      </span>
                      <span className={`rounded-full px-2 py-0.5 font-medium ${RISK_LEVEL_COLOR[score.risk_level]}`}>
                        {RISK_LEVEL_LABEL[score.risk_level]}
                      </span>
                    </div>
                  )}
                </div>
                <ul className="divide-y divide-zinc-100">
                  {dimItems.map((it) => (
                    <li key={it.id} className="px-4 py-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${PRIORITY_COLOR[it.priority]}`}>
                              {it.priority}
                            </span>
                            <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${STATUS_COLOR[it.status]}`}>
                              {STATUS_LABEL[it.status]}
                            </span>
                            {isOverdue(it.due_date, it.status) && (
                              <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] font-medium text-red-800">
                                Em atraso
                              </span>
                            )}
                          </div>
                          <h3 className="mt-1.5 text-sm font-semibold text-zinc-900">{it.title}</h3>
                          {it.description && (
                            <p className="mt-1 text-xs text-zinc-600">{it.description}</p>
                          )}
                          <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-zinc-500">
                            <span>Resp: <strong className="text-zinc-700">{it.owner_name}</strong></span>
                            <span>Prazo: {new Date(it.due_date).toLocaleDateString('pt-BR')}</span>
                            {it.estimated_cost_brl != null && (
                              <span>Custo est.: R$ {it.estimated_cost_brl.toLocaleString('pt-BR')}</span>
                            )}
                            {it.kpi && <span>KPI: {it.kpi}</span>}
                          </div>
                          {/* Checkpoints */}
                          <div className="mt-2 flex flex-wrap gap-1.5 text-[10px]">
                            {(['30', '60', '90'] as const).map((cp) => {
                              const field =
                                cp === '30' ? it.check_30d_at
                                : cp === '60' ? it.check_60d_at
                                : it.check_90d_at
                              return field ? (
                                <span key={cp} className="rounded bg-emerald-100 px-1.5 py-0.5 text-emerald-800">
                                  ✓ {cp}d {new Date(field).toLocaleDateString('pt-BR')}
                                </span>
                              ) : (
                                <form key={cp} action={marcarCheckpoint} className="inline">
                                  <input type="hidden" name="assessment_id" value={id} />
                                  <input type="hidden" name="item_id" value={it.id} />
                                  <input type="hidden" name="checkpoint" value={cp} />
                                  <button
                                    type="submit"
                                    className="rounded border border-zinc-300 px-1.5 py-0.5 text-zinc-600 hover:border-zinc-500 hover:text-zinc-900"
                                  >
                                    + {cp}d
                                  </button>
                                </form>
                              )
                            })}
                          </div>
                        </div>
                        {/* Mudar status */}
                        <form action={atualizarStatusItem} className="flex items-center gap-2">
                          <input type="hidden" name="assessment_id" value={id} />
                          <input type="hidden" name="item_id" value={it.id} />
                          <select
                            name="status"
                            defaultValue={it.status}
                            className="rounded-lg border border-zinc-300 px-2 py-1 text-xs"
                          >
                            {(Object.keys(STATUS_LABEL) as Nr01ActionStatus[]).map((s) => (
                              <option key={s} value={s}>{STATUS_LABEL[s]}</option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="rounded-lg bg-zinc-900 px-2 py-1 text-xs font-semibold text-white hover:bg-zinc-700"
                          >
                            Atualizar
                          </button>
                        </form>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            )
          })}
        </div>
      )}
    </div>
  )
}
