import Link from 'next/link'
import { redirect } from 'next/navigation'
import { enrichCommercialInvoices } from '@/lib/billing/enrich-commercial-invoices'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { createClient } from '@/lib/supabase/server'
import { FaturasTable } from '@/components/billing/FaturasTable'
import { isContratanteRole } from '@/lib/org/roles'
import type { CommercialInvoice, UserRole } from '@/types/database'

interface Props {
  searchParams: Promise<{ error?: string }>
}

export default async function FaturasPage({ searchParams }: Props) {
  const { error: urlError } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()

  const role = profile?.role ?? 'consultant'
  const isContratante = isContratanteRole(role)

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
          <h1 className="text-2xl font-bold text-zinc-900">
            {isContratante ? 'Contrato do grupo' : 'Faturas comerciais'}
          </h1>
          <p className="mt-1 text-sm text-zinc-500">
            {isContratante
              ? 'Faturas do contrato Pasola. O consultor operador (RT) aparece na coluna de operação; o cliente contratante é o seu e-mail.'
              : 'Acompanhe faturas emitidas e status do pagamento presencial.'}
          </p>
        </div>
        {!isContratante && (
          <Link
            href="/contratacao"
            className="inline-flex shrink-0 items-center justify-center rounded-lg bg-blue-800 px-4 py-2.5 text-sm font-semibold text-white hover:bg-blue-900"
          >
            + Nova fatura
          </Link>
        )}
      </div>

      {urlError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {decodeURIComponent(urlError)}
        </div>
      )}

      {error && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error.message}
        </div>
      )}

      <FaturasTable rows={rows} contratanteView={isContratante} />
    </div>
  )
}
