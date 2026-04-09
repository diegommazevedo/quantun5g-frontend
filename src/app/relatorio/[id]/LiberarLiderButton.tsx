'use client'

/**
 * QUANTUM5G — LiberarLiderButton
 * Botão "Liberar para líder" — visível apenas para consultant/admin.
 * Chama a Server Action liberarParaLider e exibe feedback inline.
 */

import { useState, useTransition } from 'react'
import { liberarParaLider }        from './actions'

interface Props {
  diagnosticId: string
  leaderEmail:  string
}

export function LiberarLiderButton({ diagnosticId, leaderEmail }: Props) {
  const [isPending, startTransition] = useTransition()
  const [state, setState] = useState<'idle' | 'success' | 'error'>('idle')
  const [errorMsg, setErrorMsg] = useState('')

  function handleClick() {
    startTransition(async () => {
      const result = await liberarParaLider(diagnosticId)
      if (result.success) {
        setState('success')
      } else {
        setState('error')
        setErrorMsg(result.error ?? 'Erro desconhecido')
      }
    })
  }

  if (state === 'success') {
    return (
      <div className="flex items-center gap-2 rounded-lg bg-green-50 border border-green-200 px-3.5 py-2 text-sm text-green-800">
        <span>✅</span>
        <span>Link enviado para <strong>{leaderEmail}</strong></span>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="flex items-center gap-2">
        <div className="rounded-lg bg-red-50 border border-red-200 px-3.5 py-2 text-sm text-red-800">
          ❌ {errorMsg}
        </div>
        <button
          onClick={() => setState('idle')}
          className="text-xs text-zinc-400 hover:text-zinc-700"
        >
          Tentar novamente
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={handleClick}
      disabled={isPending}
      className="rounded-lg border border-violet-300 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-800 hover:bg-violet-100 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {isPending ? 'Enviando...' : '📩 Liberar para líder'}
    </button>
  )
}
