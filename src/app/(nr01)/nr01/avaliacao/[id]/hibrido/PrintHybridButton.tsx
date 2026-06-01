'use client'

export function PrintHybridButton({ companyName }: { companyName: string }) {
  function handlePrint() {
    const date = new Date().toLocaleDateString('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).replace(/\//g, '-')
    const safe = companyName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9 ]/g, '')
      .trim()
      .replace(/\s+/g, '_')
    const prev = document.title
    document.title = `Hibrido_${safe}_${date}`
    window.print()
    window.addEventListener('afterprint', () => { document.title = prev }, { once: true })
  }

  return (
    <button
      type="button"
      onClick={handlePrint}
      className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50"
    >
      Imprimir / PDF
    </button>
  )
}
