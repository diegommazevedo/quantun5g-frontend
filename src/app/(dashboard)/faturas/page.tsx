import Link from 'next/link'
import { redirect } from 'next/navigation'
import { enrichCommercialInvoices } from '@/lib/billing/enrich-commercial-invoices'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import { FaturasTable } from '@/components/billing/FaturasTable'
import type { CommercialInvoice } from '@/types/database'

export default async function FaturasPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data, error } = await supabase
    .from('commercial_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  const admin = createServiceRoleAdmin()
  const rows = await enrichCommercialInvoices(admin, (data ?? []) as CommercialInvoice[])

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-zinc-900">Faturas comerciais</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Acompanhe faturas emitidas e status do pagamento presencial.
          </p>
        </div>
        <Link
          href="/contratacao"
          className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
        >
          + Nova fatura
        </Link>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <FaturasTable rows={rows} />
    </div>
  )
}
