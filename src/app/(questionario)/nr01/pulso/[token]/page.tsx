/**
 * QUANTUM5G — NR-01 · Pulso semanal (público, anônimo, ~90s)
 *
 * Acesso por token de invite. Carrega 3 questões da semana e
 * apresenta Likert 1-5. Submit dispara registro anônimo.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import type { Nr01PulseDispatch, Nr01PulseInvite, Nr01Question } from '@/types/nr01'
import PulsoFormClient from './PulsoFormClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function PulsoPublicoPage({ params }: Props) {
  const { token } = await params
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
    <PulsoFormClient
      token={token}
      questions={ordered}
      weekNumber={dispatch.week_number}
      closesAtLabel={closes.toLocaleString('pt-BR')}
    />
  )
}
