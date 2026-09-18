import Link from 'next/link'
import { importCrmCsv } from '../actions'

export default async function CopilotoImportPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; ok?: string }>
}) {
  const { error, ok } = await searchParams

  return (
    <div className="mx-auto max-w-2xl space-y-6 py-8">
      <div>
        <Link href="/copiloto" className="text-sm text-[var(--q-text-muted)] underline">
          ← Fila do dia
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-[var(--q-text)]">Importar carteira</h1>
        <p className="mt-1 text-sm text-[var(--q-text-muted)]">
          CSV com cabeçalho. Colunas suportadas: name, email, phone, contact_name, segment,
          last_purchase_at (YYYY-MM-DD), purchase_cycle_days, avg_ticket, last_contact_at, notes.
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {decodeURIComponent(error)}
        </div>
      )}
      {ok && (
        <div className="rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-900">
          {ok} conta(s) importada(s).{' '}
          <Link href="/copiloto" className="font-semibold underline">
            Ver fila
          </Link>
        </div>
      )}

      <form action={importCrmCsv} className="space-y-4">
        <textarea
          name="csv"
          required
          rows={12}
          placeholder={`name,email,phone,last_purchase_at,purchase_cycle_days,avg_ticket\nCliente Alpha,alpha@empresa.com,11999990000,2026-07-01,22,3500\nCliente Beta,beta@empresa.com,,2026-06-15,30,1200`}
          className="w-full rounded-lg border border-[var(--q-border)] bg-[var(--q-surface)] px-3 py-2 font-mono text-xs"
        />
        <button
          type="submit"
          className="rounded-lg bg-amber-700 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600"
        >
          Importar
        </button>
      </form>
    </div>
  )
}
