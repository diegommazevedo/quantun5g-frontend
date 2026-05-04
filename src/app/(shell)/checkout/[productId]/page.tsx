/**
 * QUANTUM5G — Checkout multi-produto (P021)
 * Rota: /checkout/[productId]
 *
 * Server component que:
 *  - Valida o productId via registry
 *  - Lista os planos ativos do produto (do banco)
 *  - Renderiza o formulário de checkout (client) com os dados do user
 */

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProductById } from '@/lib/products/registry'
import type { ProductPlan } from '@/types/database'
import { CheckoutForm } from './checkout-form'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ productId: string }>
  searchParams: Promise<{ plan?: string }>
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { productId } = await params
  const { plan: planQuery } = await searchParams

  const product = getProductById(productId)
  if (!product) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/checkout/${productId}`)

  const { data: plansData } = await supabase
    .from('product_plans')
    .select('*')
    .eq('product_id', productId)
    .eq('active', true)
    .order('price_cents', { ascending: true })

  const plans = (plansData ?? []) as ProductPlan[]

  if (plans.length === 0) {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-xl font-semibold text-slate-900">
            {product.name}
          </h1>
          <p className="mt-4 text-sm text-slate-600">
            Não há planos disponíveis no momento. Entre em contato para
            uma proposta personalizada.
          </p>
        </div>
      </main>
    )
  }

  const initialPlanId =
    planQuery && plans.some(p => p.id === planQuery) ? planQuery : plans[0].id

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">
            Assinar {product.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">{product.description}</p>
        </header>

        <CheckoutForm
          productId={productId}
          plans={plans}
          initialPlanId={initialPlanId}
          userEmail={user.email ?? ''}
        />
      </div>
    </main>
  )
}
