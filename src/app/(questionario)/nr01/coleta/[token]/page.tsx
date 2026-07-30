/**
 * QUANTUM5G — NR-01 · Coleta pública (anônima)
 * Acesso por token de avaliação. Sem autenticação.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { markSurveyInviteOpened } from '@/lib/survey/invites'
import { loadInstrument } from '@/lib/nr01/instrument'
import { Nr01Assessment } from '@/types/nr01'
import ColetaFormClient from './ColetaFormClient'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function ColetaPublicaNr01Page({ params, searchParams }: Props) {
  const { token } = await params
  const { invite } = await searchParams
  await markSurveyInviteOpened(invite)
  const supabase = await createClient()

  const { data: assess } = await supabase
    .from('nr01_assessments')
    .select('id, name, status, instrument_version, collection_opens_at, collection_closes_at, k_anonymity_min')
    .eq('collection_token', token)
    .maybeSingle()

  if (!assess) notFound()
  const a = assess as Pick<Nr01Assessment, 'id' | 'name' | 'status' | 'instrument_version' | 'collection_opens_at' | 'collection_closes_at' | 'k_anonymity_min'>

  if (a.status !== 'COLETANDO') {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="text-xl font-semibold text-zinc-900">Coleta não disponível</h1>
        <p className="mt-2 text-sm text-zinc-600">
          Esta avaliação não está aberta para respostas no momento.
        </p>
      </div>
    )
  }

  const groups = await loadInstrument(a.instrument_version)

  return (
    <div className="mx-auto max-w-3xl space-y-8 py-8">
      <header className="space-y-2">
        <p className="text-xs uppercase tracking-wide text-orange-600">Avaliação NR-01</p>
        <h1 className="text-2xl font-bold text-zinc-900">{a.name}</h1>
        <p className="text-sm text-zinc-600">
          Sua resposta é <strong>anônima</strong>. Nenhuma identificação pessoal é coletada
          ou armazenada. Somente agregados com pelo menos {a.k_anonymity_min} respondentes
          são exibidos a líderes ou consultores.
        </p>
      </header>

      <ColetaFormClient token={token} groups={groups} kAnonymityMin={a.k_anonymity_min} />
    </div>
  )
}
