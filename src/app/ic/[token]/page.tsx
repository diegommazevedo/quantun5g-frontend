/**
 * QUANTUM5G — TELA-06: Formulário IC (Instrumento de Colaboradores)
 * Rota pública — acessada via token único compartilhado com toda a equipe.
 * REGRA INVIOLÁVEL: respondente_anonimo_id gerado no cliente, sem FK.
 */

import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import ICFormClient from './ICFormClient'

interface Props {
  params: Promise<{ token: string }>
}

export default async function ICPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  // Carrega diagnóstico pelo ic_token
  const { data: diagRaw } = await supabase
    .from('diagnostics')
    .select('id, name, status, companies(name)')
    .eq('ic_token', token)
    .single()

  const diag = diagRaw as {
    id: string
    name: string
    status: string
    companies: { name: string } | null
  } | null

  if (!diag) notFound()

  // Coleta encerrada ou não iniciada
  if (diag.status !== 'COLETANDO_IC') {
    const encerrado = ['ENCERRADO', 'RELATORIO_GERADO', 'ARQUIVADO'].includes(diag.status)
    return (
      <div className="min-h-screen bg-zinc-50 flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          {encerrado ? (
            <>
              <div className="w-16 h-16 bg-zinc-100 rounded-full flex items-center justify-center mx-auto">
                <svg className="w-8 h-8 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m0-8v4m0-8a9 9 0 110 18A9 9 0 0112 3z" />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-zinc-900">Coleta encerrada</h1>
              <p className="text-zinc-500 text-sm">
                O período de respostas para este diagnóstico foi encerrado. Obrigado!
              </p>
            </>
          ) : (
            <>
              <h1 className="text-xl font-bold text-zinc-900">Link ainda não disponível</h1>
              <p className="text-zinc-500 text-sm">
                A coleta de colaboradores ainda não foi iniciada. Aguarde o responsável pelo diagnóstico.
              </p>
            </>
          )}
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
            <span className="text-sm text-zinc-500">Instrumento de Colaboradores</span>
          </div>
          <span className="text-xs text-zinc-400">{companyName}</span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-8">
        {/* Intro */}
        <div className="bg-white rounded-xl border border-zinc-200 p-6 space-y-3">
          <h1 className="text-xl font-bold text-zinc-900">
            Pentagrama de Ginger — Instrumento de Colaboradores
          </h1>
          <p className="text-sm text-zinc-600 leading-relaxed">
            Para cada afirmação abaixo, escolha o número que melhor representa sua experiência real nesta empresa.
          </p>
          <p className="text-sm text-zinc-600 font-medium">
            Responda com honestidade — suas respostas são totalmente anônimas.
          </p>

          {/* Aviso de anonimato */}
          <div className="rounded-lg bg-blue-50 border border-blue-200 px-4 py-3">
            <p className="text-xs text-blue-700 font-medium">
              🔒 Anonimato garantido — suas respostas não são vinculadas à sua identidade.
              Não é necessário fazer login ou fornecer seu nome.
            </p>
          </div>

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
        <ICFormClient diagnosticId={diag.id} token={token} />
      </div>
    </div>
  )
}
