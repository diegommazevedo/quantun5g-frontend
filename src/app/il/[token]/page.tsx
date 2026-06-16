/**
 * QUANTUM5G — TELA-05: Formulário IL (Instrumento de Liderança)
 * Rota pública — acessada via token único.
 * 125 questões, escala Likert 1–5.
 * Ao submeter: INSERT il_responses + UPDATE diagnostic status → COLETANDO_IC
 */

import { notFound } from 'next/navigation'
import { markSurveyInviteOpened } from '@/lib/survey/invites'
import ILFormClient from './ILFormClient'
import { PENTAGRAMA_LIKERT_SCALE } from '@/lib/pentagrama/likert-labels'
import { isPentagramaColetaAberta } from '@/lib/pentagrama/coleta'
import { resolveDiagnosticByIlToken } from '@/lib/pentagrama/public-diagnostic'

interface Props {
  params: Promise<{ token: string }>
  searchParams: Promise<{ invite?: string }>
}

export default async function ILPage({ params, searchParams }: Props) {
  const { token } = await params
  const { invite } = await searchParams
  await markSurveyInviteOpened(invite)

  const diag = await resolveDiagnosticByIlToken(token)
  if (!diag) notFound()

  // IL já respondido
  if (diag.il_submitted_at) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-bold text-zinc-900">Instrumento já respondido</h1>
          <p className="text-zinc-500 text-sm">
            Este instrumento de liderança já foi preenchido. Cada diagnóstico aceita apenas uma resposta de liderança.
          </p>
        </div>
      </div>
    )
  }

  // Status não aceita mais IL
  if (!isPentagramaColetaAberta(diag.status)) {
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <h1 className="text-xl font-bold text-zinc-900">Link indisponível</h1>
          <p className="text-zinc-500 text-sm">
            Este link de diagnóstico não está mais disponível para resposta.
          </p>
        </div>
      </div>
    )
  }

  const companyName = diag.companyName

  return (
    <div className="min-h-screen bg-zinc-50">
      {/* Header */}
      <div className="bg-white border-b border-zinc-200 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div>
            <span className="text-sm font-semibold text-zinc-900">Quantum5G</span>
            <span className="text-zinc-300 mx-2">|</span>
            <span className="text-sm text-zinc-500">Instrumento de Liderança</span>
          </div>
          <span className="text-xs text-zinc-400">{companyName}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Intro */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-3">
          <h1 className="text-xl font-bold text-zinc-900">
            Pentagrama de Ginger — Instrumento de Liderança
          </h1>
          {diag.leader_name && (
            <p className="text-zinc-600">Olá, <strong>{diag.leader_name}</strong>.</p>
          )}
          <p className="text-sm text-zinc-600 leading-relaxed">
            Para cada afirmação abaixo, escolha o número que melhor representa sua percepção honesta sobre a realidade atual da empresa que você lidera ou co-lidera.
          </p>
          <p className="text-sm text-zinc-600 font-medium">
            Não responda como gostaria que fosse — responda como você acredita que é hoje.
          </p>
          <div className="flex flex-wrap gap-3 pt-1">
            {PENTAGRAMA_LIKERT_SCALE.map(({ value, lines }) => (
              <span key={value} className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center">{value}</span>
                {lines.join(' ')}
              </span>
            ))}
          </div>
        </div>

        {/* Formulário client-side */}
        <ILFormClient diagnosticId={diag.id} token={token} />
      </div>
    </div>
  )
}
