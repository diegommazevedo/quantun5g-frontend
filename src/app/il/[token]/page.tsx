/**
 * QUANTUM5G — TELA-05: Formulário IL (Instrumento de Liderança)
 * Rota pública — acessada via token único.
 * 125 questões, escala Likert 1–5.
 * Ao submeter: INSERT il_responses + UPDATE diagnostic status → COLETANDO_IC
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ILFormClient from './ILFormClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ILPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Carrega diagnóstico pelo il_token
  const { data: diagRaw } = await supabase
    .from('diagnostics')
    .select('id, name, status, leader_name, il_submitted_at, companies(name)')
    .eq('il_token', token)
    .single()

  const diag = diagRaw as {
    id: string
    name: string
    status: string
    leader_name: string | null
    il_submitted_at: string | null
    companies: { name: string } | null
  } | null

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
  if (diag.status !== 'AGUARDANDO_IL') {
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

  const companyName = diag.companies?.name ?? ''

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
            {[
              { v: 1, label: 'Discordo totalmente' },
              { v: 2, label: 'Discordo parcialmente' },
              { v: 3, label: 'Neutro' },
              { v: 4, label: 'Concordo parcialmente' },
              { v: 5, label: 'Concordo totalmente' },
            ].map(({ v, label }) => (
              <span key={v} className="inline-flex items-center gap-1.5 text-xs text-zinc-500">
                <span className="w-5 h-5 rounded-full bg-zinc-100 text-zinc-700 font-bold flex items-center justify-center">{v}</span>
                {label}
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
