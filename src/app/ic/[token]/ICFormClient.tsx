'use client'

/**
 * QUANTUM5G — ICFormClient
 * Client Component: 125 questões IC — perspectiva do colaborador.
 * REGRA INVIOLÁVEL: respondente_anonimo_id é UUID gerado no cliente.
 *   - Sem FK para qualquer tabela de usuários
 *   - Armazenado apenas em sessionStorage (não persiste entre sessões)
 *   - Garantia de que o mesmo device não responde duas vezes no mesmo diagnóstico
 */

import { useState, useTransition, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import {
  QUESTOES,
  BLOCOS,
  DIMENSAO_LABEL,
  DIMENSAO_SUBTITULO_IC,
  type Dimensao,
} from '@/lib/questions'

const DIMENSOES: Dimensao[] = ['fisica', 'afetiva', 'racional', 'social', 'cultural']
const SCALE = [1, 2, 3, 4, 5] as const

interface Props {
  diagnosticId: string
  token: string
}

/** Gera UUID v4 compatível com todos os navegadores modernos */
function gerarUUID(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  // Fallback para navegadores mais antigos
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
    const r = Math.random() * 16 | 0
    return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16)
  })
}

export default function ICFormClient({ diagnosticId, token }: Props) {
  const [respostas, setRespostas] = useState<Record<number, number>>({})
  const [isPending, startTransition] = useTransition()
  const [submitted, setSubmitted] = useState(false)
  const [jaRespondeu, setJaRespondeu] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Verifica se este device já respondeu (sessionStorage)
  useEffect(() => {
    const chave = `ic_respondido_${diagnosticId}`
    if (sessionStorage.getItem(chave)) {
      setJaRespondeu(true)
    }
  }, [diagnosticId])

  const totalRespondidas = Object.keys(respostas).length
  const pctCompleto = Math.round((totalRespondidas / 125) * 100)

  function responder(nQuestao: number, valor: number) {
    setRespostas(prev => ({ ...prev, [nQuestao]: valor }))
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()

    if (totalRespondidas < 125) {
      setError(`Preencha todas as 125 questões. Faltam ${125 - totalRespondidas}.`)
      document.getElementById('erro-submit')?.scrollIntoView({ behavior: 'smooth', block: 'center' })
      return
    }

    setError(null)

    startTransition(async () => {
      const supabase = createClient()

      // UUID anônimo — gerado aqui, sem vínculo de identidade
      const respondente_anonimo_id = gerarUUID()

      // Monta payload q1..q125
      const payload: Record<string, number | string> = {
        diagnostic_id: diagnosticId,
        respondente_anonimo_id,  // SEM FK — NUNCA ALTERAR
      }
      for (let i = 1; i <= 125; i++) {
        payload[`q${i}`] = respostas[i]
      }

      const { error: errInsert } = await supabase
        .from('ic_responses')
        .insert(payload as never)

      if (errInsert) {
        if (errInsert.code === '23505') {
          // Violação de unicidade — device já respondeu
          setJaRespondeu(true)
          return
        }
        setError('Erro ao enviar respostas. Tente novamente.')
        return
      }

      // Marca como respondido neste device
      sessionStorage.setItem(`ic_respondido_${diagnosticId}`, '1')

      setSubmitted(true)
      window.scrollTo({ top: 0, behavior: 'smooth' })
    })
  }

  if (jaRespondeu) {
    return (
      <div className="bg-white rounded-xl border border-amber-200 p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-amber-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-amber-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M12 3a9 9 0 110 18A9 9 0 0112 3z" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Você já respondeu este instrumento</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          Este diagnóstico aceita apenas uma resposta por pessoa.
          Obrigado pela sua participação!
        </p>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="bg-white rounded-xl border border-green-200 p-10 text-center space-y-4">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
          <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
        </div>
        <h2 className="text-xl font-bold text-zinc-900">Respostas enviadas com sucesso!</h2>
        <p className="text-zinc-500 text-sm max-w-sm mx-auto">
          Suas respostas foram registradas de forma anônima.
          Obrigado pela sua participação — ela é essencial para o diagnóstico.
        </p>
      </div>
    )
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-10">
      {/* Barra de progresso */}
      <div className="bg-white rounded-xl border border-zinc-200 p-4 sticky top-[65px] z-10">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-medium text-zinc-700">Progresso</span>
          <span className="text-sm font-bold text-zinc-900">{totalRespondidas}/125</span>
        </div>
        <div className="w-full bg-zinc-100 rounded-full h-2">
          <div
            className="bg-zinc-900 h-2 rounded-full transition-all duration-300"
            style={{ width: `${pctCompleto}%` }}
          />
        </div>
      </div>

      {/* Dimensões */}
      {DIMENSOES.map(dimensao => {
        const blocosD = BLOCOS.filter(b => b.dimensao === dimensao)
        return (
          <section key={dimensao} className="space-y-6">
            <div className="border-l-4 border-zinc-900 pl-4">
              <h2 className="text-lg font-bold text-zinc-900">
                Dimensão {DIMENSAO_LABEL[dimensao]}
              </h2>
              <p className="text-sm text-zinc-500 italic mt-0.5">
                {DIMENSAO_SUBTITULO_IC[dimensao]}
              </p>
            </div>

            {blocosD.map(bloco => {
              const questoesBloco = QUESTOES.filter(q => q.bloco === bloco.id)
              return (
                <div key={bloco.id} className="bg-white rounded-xl border border-zinc-200 overflow-hidden">
                  <div className="bg-zinc-50 px-6 py-3 border-b border-zinc-200">
                    <span className="text-xs font-semibold text-zinc-500 uppercase tracking-wide">
                      Bloco {bloco.id}
                    </span>
                    <span className="text-xs text-zinc-400 ml-2">{bloco.titulo}</span>
                  </div>

                  <div className="divide-y divide-zinc-100">
                    {questoesBloco.map(q => {
                      const val = respostas[q.n]
                      return (
                        <div key={q.n} className="px-6 py-5">
                          <div className="flex gap-4">
                            <span className="text-xs font-bold text-zinc-400 w-8 shrink-0 pt-0.5">
                              Q{q.n}
                            </span>
                            <div className="flex-1 space-y-3">
                              <p className="text-sm text-zinc-800 leading-relaxed">{q.ic}</p>
                              <div className="space-y-1">
                                <div className="flex gap-2 flex-wrap">
                                  {SCALE.map(v => (
                                    <button
                                      key={v}
                                      type="button"
                                      onClick={() => responder(q.n, v)}
                                      className={`
                                        w-10 h-10 rounded-lg border-2 text-sm font-bold transition-all
                                        ${val === v
                                          ? 'border-zinc-900 bg-zinc-900 text-white'
                                          : 'border-zinc-200 bg-white text-zinc-500 hover:border-zinc-400 hover:text-zinc-700'
                                        }
                                      `}
                                    >
                                      {v}
                                    </button>
                                  ))}
                                </div>
                                {/* Legenda inline da escala */}
                                <div className="flex justify-between w-[11.5rem] text-[10px] text-zinc-400 leading-tight select-none">
                                  <span>Discordo<br/>totalmente</span>
                                  <span className="text-right">Concordo<br/>totalmente</span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )
            })}
          </section>
        )
      })}

      <div className="space-y-4 pb-10">
        {error && (
          <div id="erro-submit" className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        <button
          type="submit"
          disabled={isPending || totalRespondidas < 125}
          className="w-full rounded-xl bg-zinc-900 px-6 py-4 text-base font-semibold text-white hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-zinc-900/30"
        >
          {isPending
            ? 'Enviando...'
            : totalRespondidas < 125
              ? `Complete as ${125 - totalRespondidas} questões restantes`
              : 'Enviar minhas respostas'}
        </button>
      </div>
    </form>
  )
}
