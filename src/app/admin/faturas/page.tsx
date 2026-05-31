import Link from 'next/link'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { FaturasTable } from '@/components/billing/FaturasTable'
import type { CommercialInvoice } from '@/types/database'

export default async function AdminFaturasPage() {
  const admin = createServiceRoleAdmin()
  const { data, error } = await admin
    .from('commercial_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(200)

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-900">Faturas — administração</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Aprovar comprovante e marcar como <strong>paga</strong> provisiona assinatura (NR-01 e/ou
          Pentagrama) e libera módulos no perfil do cliente.
        </p>
        <p className="mt-2 text-xs text-zinc-500">
          Fluxo: <span className="font-medium">emitida</span> →{' '}
          <span className="font-medium">aprovada</span> →{' '}
          <span className="font-medium">paga</span>
        </p>
      </div>

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <FaturasTable invoices={(data ?? []) as CommercialInvoice[]} adminMode />

      <p className="text-xs text-zinc-500">
        Checkout online (Asaas) continua em{' '}
        <Link href="/checkout/nr01" className="text-blue-800 hover:underline">
          /checkout/nr01
        </Link>
        .
      </p>
    </div>
  )
}
