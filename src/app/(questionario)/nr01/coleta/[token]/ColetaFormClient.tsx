'use client'

/**
 * QUANTUM5G — NR-01 · Formulário de coleta pública (client-managed state)
 *
 * As respostas ficam em estado React (não em <form> nativo). Isso garante que,
 * se a submissão falhar (rede, RLS, throttle, coleta encerrada etc.), o usuário
 * NUNCA perde o que já preencheu: não há navegação/redirect, apenas uma
 * mensagem de erro inline, e o usuário pode tentar enviar novamente.
 *
 * Mesmo padrão usado com sucesso no IC/IL do Pentagrama
 * (ver src/app/ic/[token]/ICFormClient.tsx).
 */

import { useMemo, useState, useTransition } from 'react'
import { submeterRespostaNr01, type Nr01Contexto } from './actions'
import { LIKERT_LABELS, type DimensionWithQuestions } from '@/lib/nr01/instrument'

interface Props {
  token: string
  groups: DimensionWithQuestions[]
  kAnonymityMin: number
}

const CONTEXTO_INICIAL: Nr01Contexto = {
  setor: '',
  funcao: '',
  vinculo: '',
  tempoCasa: '',
  isLeader: false,
  open1: '',
  open2: '',
  open3: '',
  open4: '',
}

export default function ColetaFormClient({ token, groups }: Props) {
  const allQuestions = useMemo(() => groups.flatMap((g) => g.questions), [groups])
  const total = allQuestions.length

  const [respostas, setRespostas] = useState<Record<string, number>>({})
  const [contexto, setContexto] = useState<Nr01Contexto>(CONTEXTO_INICIAL)
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

    setError(null)

    startTransition(async () => {
      const result = await submeterRespostaNr01(token, contexto, respostas)

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
          Obrigado pela sua participação. Sua resposta é anônima e foi registrada
          com sucesso.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4">
        <legend className="px-2 text-xs uppercase tracking-wide text-zinc-500">
          Dados de contexto (opcionais)
        </legend>
        <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
          <input
            value={contexto.setor}
            onChange={(e) => setContexto((c) => ({ ...c, setor: e.target.value }))}
            placeholder="Setor"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <input
            value={contexto.funcao}
            onChange={(e) => setContexto((c) => ({ ...c, funcao: e.target.value }))}
            placeholder="Função"
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          />
          <select
            value={contexto.vinculo}
            onChange={(e) => setContexto((c) => ({ ...c, vinculo: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Tipo de vínculo</option>
            <option value="efetivo">Efetivo</option>
            <option value="temporario">Temporário</option>
            <option value="terceirizado">Terceirizado</option>
            <option value="outro">Outro</option>
          </select>
          <select
            value={contexto.tempoCasa}
            onChange={(e) => setContexto((c) => ({ ...c, tempoCasa: e.target.value }))}
            className="rounded-lg border border-zinc-300 px-3 py-2 text-sm"
          >
            <option value="">Tempo de empresa</option>
            <option value="ate_6_meses">Até 6 meses</option>
            <option value="6_meses_1_ano">6 meses a 1 ano</option>
            <option value="1_3_anos">1 a 3 anos</option>
            <option value="3_5_anos">3 a 5 anos</option>
            <option value="mais_5_anos">Mais de 5 anos</option>
          </select>
          <label className="flex items-center gap-2 text-sm text-zinc-700">
            <input
              type="checkbox"
              checked={contexto.isLeader}
              onChange={(e) => setContexto((c) => ({ ...c, isLeader: e.target.checked }))}
            />
            Sou liderança
          </label>
        </div>
      </fieldset>

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

      <fieldset className="rounded-lg border border-zinc-200 bg-white p-4">
        <legend className="px-2 text-xs uppercase tracking-wide text-zinc-500">
          Bloco 12 — Perguntas abertas (opcionais)
        </legend>
        <div className="mt-3 space-y-3">
          <label className="block text-xs text-zinc-700">
            <span className="mb-1 block">
              Qual é hoje o principal fator de desgaste no seu trabalho?
            </span>
            <textarea
              value={contexto.open1}
              onChange={(e) => setContexto((c) => ({ ...c, open1: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-700">
            <span className="mb-1 block">
              O que mais contribui positivamente para o seu trabalho?
            </span>
            <textarea
              value={contexto.open2}
              onChange={(e) => setContexto((c) => ({ ...c, open2: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-700">
            <span className="mb-1 block">
              O que precisa mudar com urgência no ambiente de trabalho?
            </span>
            <textarea
              value={contexto.open3}
              onChange={(e) => setContexto((c) => ({ ...c, open3: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
          <label className="block text-xs text-zinc-700">
            <span className="mb-1 block">Deseja acrescentar algo?</span>
            <textarea
              value={contexto.open4}
              onChange={(e) => setContexto((c) => ({ ...c, open4: e.target.value }))}
              rows={2}
              className="w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm"
            />
          </label>
        </div>
      </fieldset>

      <div className="sticky bottom-4 space-y-3">
        {error && (
          <div id="erro-submit" className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        <div className="flex items-center justify-between gap-3 rounded-xl bg-white/80 p-2 backdrop-blur">
          <span className="text-xs text-zinc-500">{totalRespondidas}/{total} respondidas</span>
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
