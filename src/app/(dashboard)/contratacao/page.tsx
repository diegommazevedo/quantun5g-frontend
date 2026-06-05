import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { CommercialInvoiceForm } from '@/components/billing/CommercialInvoiceForm'
import { isLicensingV2, parseCommercialPlan } from '@/lib/licensing/model'
import type { UserRole } from '@/types/database'

interface Props {
  searchParams: Promise<{ plan?: string }>
}

export default async function ContratacaoPage({ searchParams }: Props) {
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

  const { plan: planRaw } = await searchParams
  const plan = parseCommercialPlan(planRaw)
  const v2 = isLicensingV2()
  const selfLicense = v2 && (role === 'consultant' || role === 'leader')

  return (
    <div className="space-y-6">
      <div>
        <Link href="/faturas" className="text-sm text-zinc-500 hover:text-zinc-900">
          ← Minhas faturas
        </Link>
        <h1 className="mt-2 text-2xl font-bold text-zinc-900">
          {selfLicense ? 'Contratar licença' : 'Contratação porta a porta'}
        </h1>
        <p className="mt-1 max-w-2xl text-sm text-zinc-600">
          {selfLicense ? (
            <>
              Plano <strong>{plan === 'b2b' ? 'B2B (multi-CNPJ)' : 'B2C (1 CNPJ)'}</strong> — fatura
              em seu nome. Após pagamento confirmado, cadastre empresas em{' '}
              <Link href="/empresas" className="font-medium text-zinc-900 underline">
                Empresas
              </Link>
              .
            </>
          ) : (
            <>
              Emita fatura comercial para <strong>NR-01</strong>, <strong>Pentagrama de Ginger</strong>{' '}
              ou pacote combinado. O administrador confirma o pagamento presencial (emitida → aprovada →
              paga) e libera os módulos.
            </>
          )}
        </p>
        {v2 && role === 'admin' ? (
          <div className="mt-3 flex gap-2 text-sm">
            <Link
              href="/contratacao?plan=b2c"
              className={`rounded-lg border px-3 py-1.5 ${plan === 'b2c' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'}`}
            >
              B2C
            </Link>
            <Link
              href="/contratacao?plan=b2b"
              className={`rounded-lg border px-3 py-1.5 ${plan === 'b2b' ? 'border-zinc-900 bg-zinc-900 text-white' : 'border-zinc-200'}`}
            >
              B2B
            </Link>
          </div>
        ) : null}
      </div>
      <CommercialInvoiceForm
        role={role}
        userEmail={profile?.email ?? user.email ?? ''}
        plan={plan}
        licensingV2={v2}
      />
    </div>
  )
}
