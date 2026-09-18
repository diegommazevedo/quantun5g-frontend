'use client'

import { useEffect } from 'react'

/** Dispara o diálogo de impressão após o documento carregar (SVG estático). */
export function AutoPrint({ fileName }: { fileName: string }) {
  useEffect(() => {
    const original = document.title
    document.title = fileName

    let printed = false
    const printNow = () => {
      if (printed) return
      printed = true
      window.print()
    }

    // SVG estático: imprime assim que o layout estabiliza.
    const t = window.setTimeout(printNow, 350)

    const onAfter = () => {
      document.title = original
    }
    window.addEventListener('afterprint', onAfter)

    return () => {
      window.clearTimeout(t)
      window.removeEventListener('afterprint', onAfter)
      document.title = original
    }
  }, [fileName])

  return (
    <div className="no-print fixed bottom-4 right-4 z-50 flex gap-2">
      <button
        type="button"
        onClick={() => window.print()}
        className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg"
      >
        Salvar PDF
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="rounded-lg border border-zinc-300 bg-white px-4 py-2 text-sm font-medium text-zinc-700 shadow-lg"
      >
        Fechar
      </button>
    </div>
  )
}
