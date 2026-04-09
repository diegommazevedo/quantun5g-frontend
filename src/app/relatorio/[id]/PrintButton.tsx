'use client'

/**
 * QUANTUM5G — PrintButton
 * Exporta o relatório como PDF via window.print().
 * - Define document.title = "Pentagrama_[empresa]_[data]" antes de imprimir
 *   → o browser usa esse título como nome padrão do arquivo PDF
 * - Restaura o título original no evento afterprint
 */

interface Props {
  companyName:    string
  diagnosticName: string
}

export function PrintButton({ companyName, diagnosticName }: Props) {
  function handlePrint() {
    // Monta nome do arquivo: Pentagrama_NomeEmpresa_DD-MM-YYYY
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    }).replace(/\//g, '-')

    const safeName = companyName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')   // remove acentos
      .replace(/[^a-zA-Z0-9 ]/g, '')     // remove especiais
      .trim()
      .replace(/\s+/g, '_')              // espaços → _

    const fileName = `Pentagrama_${safeName}_${date}`
    const originalTitle = document.title

    document.title = fileName
    window.print()

    // Restaura o título depois que o diálogo de impressão fechar
    window.addEventListener('afterprint', () => {
      document.title = originalTitle
    }, { once: true })
  }

  return (
    <button
      onClick={handlePrint}
      title={`Exportar PDF — ${diagnosticName}`}
      className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 transition-colors"
    >
      ↓ Exportar PDF
    </button>
  )
}
