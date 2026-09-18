'use client'

/**
 * Exportar PDF do relatório Pentagrama.
 * - Com diagnosticId: abre /print/relatorio/[id] (documento limpo, sem chrome)
 * - Sem diagnosticId / mode=inline: window.print() na página atual (visão líder)
 */

interface Props {
  diagnosticId?: string
  companyName: string
  diagnosticName: string
  /** Imprime a página atual (útil na visão do líder). */
  mode?: 'document' | 'inline'
}

export function PrintButton({
  diagnosticId,
  companyName,
  diagnosticName,
  mode = 'document',
}: Props) {
  function handlePrint() {
    if (mode === 'inline' || !diagnosticId) {
      const date = new Date()
        .toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
        .replace(/\//g, '-')
      const safeName = companyName
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-zA-Z0-9 ]/g, '')
        .trim()
        .replace(/\s+/g, '_')
      const fileName = `Pentagrama_${safeName}_${date}`
      const originalTitle = document.title
      document.title = fileName
      window.print()
      window.addEventListener(
        'afterprint',
        () => {
          document.title = originalTitle
        },
        { once: true },
      )
      return
    }

    const url = `/print/relatorio/${diagnosticId}`
    const w = window.open(url, '_blank', 'noopener,noreferrer')
    if (!w) window.location.href = url
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      title={`Exportar PDF — ${diagnosticName} (${companyName})`}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
    >
      ↓ Exportar PDF
    </button>
  )
}
