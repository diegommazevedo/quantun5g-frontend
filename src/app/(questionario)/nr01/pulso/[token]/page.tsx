/**
 * QUANTUM5G — NR-01 · Pulso semanal (público, anônimo, ~90s)
 *
 * Acesso por token de invite. Carrega 3 questões da semana e
 * apresenta Likert 1-5. Submit dispara registro anônimo.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LIKERT_LABELS } from '@/lib/nr01/instrument'
import type { Nr01PulseDispatch, Nr01PulseInvite, Nr01Question } from '@/types/nr01'
import { submeterPulso } from './actions'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ status?: string; error?: string }>
}

export default async function PulsoPublicoPage({ params, searchParams }: Props) {
  const { token } = await params
  const { status, error } = await searchParams
  const supabase = await createClient()

  // Token → invite → dispatch
  const { data: inviteData } = await supabase
    .from('nr01_pulse_invites')
    .select('*')
    .eq('token', token)
    .maybeSingle()

  if (!inviteData) notFound()
  const invite = inviteData as Nr01PulseInvite

  const { data: dispatchData } = await supabase
    .from('nr01_pulse_dispatches')
    .select('*')
    .eq('id', invite.dispatch_id)
    .single()
  if (!dispatchData) notFound()
  const dispatch = dispatchData as Nr01PulseDispatch

  const now = new Date()
  const closes = new Date(dispatch.window_closes_at)

  // Já respondido? (used_at != null)
  if (invite.used_at) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Pulso já respondido</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Você respondeu esta semana em {new Date(invite.used_at).toLocaleString('pt-BR')}.
          Aguarde o próximo pulso semanal.
        </p>
      </div>
    )
  }

  if (now > closes) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Janela encerrada</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Este pulso encerrou em {closes.toLocaleString('pt-BR')}. Aguarde o próximo.
        </p>
      </div>
    )
  }

  if (status === 'ok') {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-emerald-900">Pulso registrado</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Obrigado. Sua resposta é anônima e foi computada no monitoramento contínuo.
        </p>
      </div>
    )
  }

  // Carrega as 3 questões deste dispatch
  const { data: qsData } = await supabase
    .from('nr01_questions')
    .select('*')
    .in('id', dispatch.question_ids)
  const questions = (qsData ?? []) as Nr01Question[]
  // Mantém ordem do question_ids
  const qById = new Map(questions.map((q) => [q.id, q]))
  const ordered = dispatch.question_ids.map((id) => qById.get(id)).filter(Boolean) as Nr01Question[]

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wide text-orange-600">
          Pulso semanal NR-01 · semana {dispatch.week_number}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900">{ordered.length} perguntas · ~90 segundos</h1>
        <p className="text-sm text-zinc-600">
          Anônimo. Sem cadastro. Janela: até {closes.toLocaleString('pt-BR')}.
        </p>
      </header>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(error)}
        </div>
      )}

      <form action={submeterPulso} className="space-y-5">
        <input type="hidden" name="token" value={token} />

        {ordered.map((q, i) => (
          <div key={q.id} className="rounded-lg border border-zinc-200 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-zinc-400">
              {i + 1} de {ordered.length} · {q.dimension_code}
            </p>
            <p className="mt-1.5 text-sm text-zinc-900">{q.text}</p>
            <div className="mt-3 flex flex-wrap gap-3">
              {LIKERT_LABELS.map((l) => (
                <label key={l.value} className="flex items-center gap-1 text-xs text-zinc-700">
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={l.value}
                    required
                    className="h-3.5 w-3.5"
                  />
                  {l.value} · {l.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        <div className="flex justify-end">
          <button
            type="submit"
            className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700"
          >
            Enviar pulso anônimo
          </button>
        </div>
      </form>
    </div>
  )
}
