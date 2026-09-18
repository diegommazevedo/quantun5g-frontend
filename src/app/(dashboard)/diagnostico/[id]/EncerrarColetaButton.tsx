'use client'

/**
 * QUANTUM5G — EncerrarColetaButton
 * Botão + modal de confirmação para encerrar a coleta IC e calcular o diagnóstico.
 *
 * Regras:
 * - Visível apenas quando status = coleta aberta (pai)
 * - Desabilitado + tooltip se nIC = 0
 * - IL obrigatório só se há liderança vinculada à rodada (Decisão 003)
 * - Sem líder: cálculo IC-only (motor já trata IL null)
 * - Modal mostra N respostas + aviso de baixa amostragem se N < 3
 * - Ao confirmar → encerrarECalcular → /relatorio/[id]
 */

import { useState, useTransition } from 'react'
import { encerrarECalcular } from './actions'

interface Props {
  diagnosticId: string
  nIC: number
  hasIL: boolean
  /** true quando a rodada tem líder IL (nome/e-mail) — aí IL é obrigatório */
  requiresIL: boolean
  linkIL: string
}

export function EncerrarColetaButton({
  diagnosticId,
  nIC,
  hasIL,
  requiresIL,
  linkIL,
}: Props) {
  const [modalAberto, setModalAberto] = useState(false)
  const [erro, setErro] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()

  const semRespostas = nIC === 0
  const baixaAmostragem = nIC > 0 && nIC < 3
  const bloqueadoPorIL = requiresIL && !hasIL
  const icOnly = !requiresIL

  function abrirModal() {
    setErro(null)
    setModalAberto(true)
  }

  function fecharModal() {
    if (isPending) return
    setModalAberto(false)
    setErro(null)
  }

  function confirmar() {
    startTransition(async () => {
      const result = await encerrarECalcular(diagnosticId)
      if (result?.error) {
        setErro(result.error)
      }
    })
  }

  return (
    <>
      <div className="relative group w-full">
        <button
          type="button"
          onClick={abrirModal}
          disabled={semRespostas}
          className="mt-2 w-full rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white
            hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          Encerrar coleta e calcular diagnóstico
        </button>

        {semRespostas && (
          <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover:block z-20
            whitespace-nowrap rounded-lg bg-zinc-800 px-3 py-1.5 text-xs text-white shadow-lg pointer-events-none">
            Aguardando ao menos 1 resposta de colaborador
            <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-zinc-800" />
          </div>
        )}
      </div>

      {modalAberto && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
          onClick={(e) => {
            if (e.target === e.currentTarget) fecharModal()
          }}
        >
          <div className="w-full max-w-md rounded-2xl bg-white shadow-2xl overflow-hidden">
            <div className="px-6 pt-6 pb-4 border-b border-zinc-100">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-zinc-900">Encerrar coleta</h2>
                  <p className="text-sm text-zinc-500 mt-0.5">
                    Esta ação não pode ser desfeita.
                  </p>
                </div>
                <button
                  onClick={fecharModal}
                  disabled={isPending}
                  className="text-zinc-400 hover:text-zinc-600 transition-colors p-1 -mr-1 disabled:opacity-40"
                >
                  <svg className="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
                    <path
                      fillRule="evenodd"
                      d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                      clipRule="evenodd"
                    />
                  </svg>
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-4">
              <div className="rounded-xl border border-zinc-200 bg-zinc-50 px-4 py-3.5 flex items-center justify-between">
                <div>
                  <p className="text-xs text-zinc-500 uppercase tracking-wide font-medium">
                    Respostas IC recebidas
                  </p>
                  <p className="text-3xl font-black text-zinc-900 mt-0.5">{nIC}</p>
                </div>
                <div
                  className={`w-12 h-12 rounded-full flex items-center justify-center text-2xl
                  ${nIC >= 5 ? 'bg-green-100' : nIC >= 3 ? 'bg-amber-100' : 'bg-red-100'}`}
                >
                  {nIC >= 5 ? '✅' : nIC >= 3 ? '⚠️' : '🔴'}
                </div>
              </div>

              {bloqueadoPorIL && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  <p className="font-semibold mb-0.5">IL da liderança ainda não respondido</p>
                  <p className="text-xs leading-relaxed">
                    Esta rodada tem liderança vinculada. O cálculo exige o Instrumento de
                    Liderança (IL) antes de encerrar. Compartilhe o link IL e aguarde a
                    resposta.
                  </p>
                  <a
                    href={linkIL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-2 inline-block text-xs font-semibold text-red-900 underline"
                  >
                    Abrir link IL →
                  </a>
                </div>
              )}

              {icOnly && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                  <p className="font-semibold mb-0.5">Rodada sem liderança IL</p>
                  <p className="text-xs leading-relaxed">
                    Nenhum líder foi vinculado a este diagnóstico. O cálculo usará apenas o
                    IC (laudos pelo nível do campo vivido). Para incluir IL numa próxima
                    rodada, cadastre o líder na equipe da empresa.
                  </p>
                </div>
              )}

              {baixaAmostragem && !bloqueadoPorIL && (
                <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
                  <p className="font-semibold mb-0.5">⚠ Baixa amostragem — N &lt; 3</p>
                  <p className="text-xs leading-relaxed">
                    {icOnly ? (
                      <>
                        Com menos de 3 respondentes, interprete o resultado com cautela.
                        Sem IL, o score segue 100% IC.
                      </>
                    ) : (
                      <>
                        Com menos de 3 respondentes, os pesos serão ajustados automaticamente:{' '}
                        <strong>IL × 60% / IC × 40%</strong> (em vez de IC × 60%). O diagnóstico
                        será calculado, mas os resultados devem ser interpretados com cautela.
                      </>
                    )}
                  </p>
                </div>
              )}

              {nIC >= 5 && !bloqueadoPorIL && !icOnly && (
                <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-800">
                  <p className="text-xs leading-relaxed">
                    Amostra adequada. O score combinado usará <strong>IC × 60% + IL × 40%</strong>.
                  </p>
                </div>
              )}

              {erro && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
                  <p className="text-sm text-red-700">{erro}</p>
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button
                type="button"
                onClick={fecharModal}
                disabled={isPending}
                className="flex-1 rounded-lg border border-zinc-300 bg-white px-4 py-2.5 text-sm font-medium
                  text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmar}
                disabled={isPending || bloqueadoPorIL}
                className="flex-1 rounded-lg bg-zinc-900 px-4 py-2.5 text-sm font-semibold text-white
                  hover:bg-zinc-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors
                  flex items-center justify-center gap-2"
              >
                {isPending ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none">
                      <circle
                        className="opacity-25"
                        cx="12"
                        cy="12"
                        r="10"
                        stroke="currentColor"
                        strokeWidth="4"
                      />
                      <path
                        className="opacity-75"
                        fill="currentColor"
                        d="M4 12a8 8 0 018-8v8H4z"
                      />
                    </svg>
                    Calculando…
                  </>
                ) : (
                  'Confirmar encerramento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
