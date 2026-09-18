'use client'

/**
 * QUANTUM5G — NR-01 · Formulário de coleta pública (client-managed state)
 */

import { useMemo, useState, useTransition } from 'react'
import { submeterRespostaNr01 } from './actions'
import { LIKERT_LABELS, type DimensionWithQuestions } from '@/lib/nr01/instrument-shared'
import { SurveyDepartmentGate } from '@/components/survey/SurveyDepartmentGate'

interface Props {
  token: string
  inviteToken?: string | null
  groups: DimensionWithQuestions[]
  kAnonymityMin: number
  departments: { id: string; name: string }[]
  lockedDepartmentId?: string | null
  lockedDepartmentLabel?: string | null
}

export default function ColetaFormClient({
  token,
  inviteToken = null,
  groups,
  departments,
  lockedDepartmentId = null,
  lockedDepartmentLabel = null,
}: Props) {
  const allQuestions = useMemo(() => groups.flatMap((g) => g.questions), [groups])
  const total = allQuestions.length

  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [departmentId, setDepartmentId] = useState(lockedDepartmentId ?? '')
  const [isPending, startTransition] = useTransition()
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const totalRespondidas = Object.keys(respostas).length

  function responder(qId: string, valor: number) {
    setRespostas((prev) => ({ ...prev, [qId]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (totalRespondidas < total) {
      setError(`Responda todas as questões. Faltam ${total - totalRespondidas}.`)
      document.getElementById('erro-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    if (!lockedDepartmentId && !departmentId) {
      setError('Selecione o seu departamento para continuar.')
      document.getElementById('erro-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setError(null)

    startTransition(async () => {
      const result = await submeterRespostaNr01(token, respostas, {
        inviteToken,
        departmentId: lockedDepartmentId || departmentId,
      })

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
        <h1 className="text-xl font-semibold text-emerald-900">Resposta registrada</h1>
        <p className="mt-2 text-sm text-emerald-800">
          Obrigado pela sua participação. Sua resposta é anônima e foi registrada com sucesso.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <SurveyDepartmentGate
        departments={departments}
        lockedDepartmentId={lockedDepartmentId}
        lockedDepartmentLabel={lockedDepartmentLabel}
        value={departmentId}
        onChange={setDepartmentId}
      />

      {groups.map((g) => (
        <section key={g.dimension.code} className="rounded-lg border border-zinc-200 bg-white p-4">
          <h2 className="text-sm font-semibold text-zinc-900">{g.dimension.name}</h2>
          <p className="mb-4 text-xs text-zinc-500">{g.dimension.description}</p>
          <div className="space-y-4">
            {g.questions.map((q) => {
              const val = respostas[q.id]
              return (
                <div key={q.id} className="border-t border-zinc-100 pt-3">
                  <p className="text-sm text-zinc-800">{q.text}</p>
                  <div className="mt-2 flex flex-wrap gap-3">
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
          </div>
        </section>
      ))}

      <div className="sticky bottom-4 space-y-3">
        {error && (
          <div
            id="erro-submit"
            className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"
          >
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-2 backdrop-blur">
          <span className="text-xs text-zinc-500">
            {totalRespondidas}/{total} respondidas
          </span>
          <button
            type="submit"
            disabled={isPending}
            className="rounded-lg bg-orange-600 px-6 py-3 text-sm font-semibold text-white shadow-md hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isPending ? 'Enviando...' : 'Enviar resposta anônima'}
          </button>
        </div>
      </div>
    </form>
  )
}
