'use client'

/**
 * QUANTUM5G — NR-01 · Formulário de pulso semanal (client-managed state)
 *
 * Respostas ficam em estado React — se a submissão falhar, o usuário não
 * perde o que já marcou (mesmo padrão de nr01/coleta/[token]/ColetaFormClient).
 */

import { useState, useTransition } from 'react'
import { submeterPulso } from './actions'
import { LIKERT_LABELS } from '@/lib/nr01/instrument'
import type { Nr01Question } from '@/types/nr01'

interface Props {
  token: string
  questions: Nr01Question[]
  weekNumber: number
  closesAtLabel: string
}

export default function PulsoFormClient({ token, questions, weekNumber, closesAtLabel }: Props) {
  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const total = questions.length
  const totalRespondidas = Object.keys(respostas).length

  function responder(qId: string, valor: number) {
    setRespostas((prev) => ({ ...prev, [qId]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (totalRespondidas < total) {
      setError(`Responda as ${total} perguntas.`)
      document.getElementById('erro-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await submeterPulso(token, respostas)

      if (!result.ok) {
        setError(result.error)
        document.getElementById('erro-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
        return
      }

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (submitted) {
    return (
      <div className="mx-auto max-w-xl rounded-xl border border-emerald-200 bg-emerald-50 p-8 text-center">
        <h1 className="text-xl font-semibold text-emerald-900">Pulso registrado</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Obrigado. Sua resposta é anônima e foi computada no monitoramento contínuo.
        </p>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <header className="space-y-2 text-center">
        <p className="text-xs uppercase tracking-wide text-orange-600">
          Pulso semanal NR-01 · semana {weekNumber}
        </p>
        <h1 className="text-2xl font-bold text-zinc-900">{total} perguntas · ~90 segundos</h1>
        <p className="text-sm text-zinc-600">
          Anônimo. Sem cadastro. Janela: até {closesAtLabel}.
        </p>
      </header>

      <form onSubmit={handleSubmit} className="space-y-5">
        {questions.map((q, i) => {
          const val = respostas[q.id]
          return (
            <div key={q.id} className="rounded-lg border border-zinc-200 bg-white p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-400">
                {i + 1} de {total} · {q.dimension_code}
              </p>
              <p className="mt-1.5 text-sm text-zinc-900">{q.text}</p>
              <div className="mt-3 flex flex-wrap gap-3">
                {LIKERT_LABELS.map((l) => (
                  <label key={l.value} className="flex items-center gap-1 text-xs text-zinc-700">
                    <input
                      type="radio"
                      name={`q_${q.id}`}
                      checked={val === l.value}
                      onChange={() => responder(q.id, l.value)}
                      className="h-3.5 w-3.5"
                    />
                    {l.value} · {l.label}
                  </label>
                ))}
              </div>
            </div>
          )
        })}

        <div className="space-y-3">
          {error && (
            <div id="erro-submit" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isPending}
              className="rounded-lg bg-orange-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? 'Enviando...' : 'Enviar pulso anônimo'}
            </button>
          </div>
        </div>
      </form>
    </div>
  )
}
