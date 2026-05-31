import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommercialInvoiceForm } from '@/components/billing/CommercialInvoiceForm'
import type { UserRole } from '@/types/database'

export default async function ContratacaoPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, email')
    .eq('id', user.id)
    .returns<{ role: UserRole; email: string | null }[]>()
    .single()

  const role = profile?.role ?? 'leader'
  if (role === 'collaborator') redirect('/dashboard')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faturas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Minhas faturas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">Contratação porta a porta</h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          Emita fatura comercial para <strong>NR-01</strong>, <strong>Pentagrama de Ginger</strong> ou
          pacote NR-01 com complemento Pentagrama. O administrador confirma o pagamento presencial
          (emitida → aprovada → paga) e libera o módulo correspondente no perfil do cliente.
        </p>
      </div>
      <CommercialInvoiceForm role={role} userEmail={profile?.email ?? user.email ?? ''} />
    </div>
  )
}
