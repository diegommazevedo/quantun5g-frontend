/**
 * QUANTUM5G — Paywall por produto (P021)
 * Rota: /paywall/[productId]
 *
 * Renderizado quando o usuário está logado mas tenta acessar uma
 * rota privada de produto sem assinatura ativa. Mostra os planos
 * disponíveis e CTA para checkout.
 */

import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { getProductById } from '@/lib/products/registry'
import type { ProductPlan } from '@/types/database'

export const dynamic = 'force-dynamic'

const BRL = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })

interface Props {
  params: Promise<{ productId: string }>
}

export default async function PaywallPage({ params }: Props) {
  const { productId } = await params
  const product = getProductById(productId)
  if (!product) notFound()

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?redirect=/paywall/${productId}`)

  const { data: plansData } = await supabase
    .from('product_plans')
    .select('*')
    .eq('product_id', productId)
    .eq('active', true)
    .order('price_cents', { ascending: true })

  const plans = (plansData ?? []) as ProductPlan[]

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-3xl">
        <header className="mb-8 text-center">
          <h1 className="text-2xl font-bold text-slate-900">
            Acesso a {product.name}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Você está logado, mas ainda não tem uma assinatura ativa para
            este produto. Escolha um plano para começar.
          </p>
        </header>

        {plans.length === 0 ? (
          <p className="text-center text-sm text-slate-600">
            Não há planos disponíveis no momento. Entre em contato para
            uma proposta personalizada.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {plans.map(plan => (
              <article
                key={plan.id}
                className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm"
              >
                <h2 className="text-lg font-semibold text-slate-900">
                  {plan.name}
                </h2>
                <p className="mt-1 text-xs text-slate-500">
                  {plan.collaborators_min}–{plan.collaborators_max ?? '∞'} colaboradores
                </p>
                <p className="mt-4 text-2xl font-bold text-slate-900">
                  {BRL.format(plan.price_cents / 100)}
                  <span className="ml-1 text-sm font-normal text-slate-500">
                    {plan.modality === 'one_off' ? '· único' : plan.modality === 'annual' ? '/ ano' : '/ mês'}
                  </span>
                </p>
                <p className="mt-2 text-xs text-slate-500">
                  {plan.assessments_per_period} avaliação(ões) por período
                </p>
                <Link
                  href={`/checkout/${productId}?plan=${plan.id}`}
                  className="mt-4 inline-flex w-full items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
                >
                  Assinar {plan.name}
                </Link>
              </article>
            ))}
          </div>
        )}

        <p className="mt-8 text-center text-xs text-slate-400">
          <Link href="/" className="underline hover:text-slate-600">
            Voltar ao painel
          </Link>
        </p>
      </div>
    </main>
  )
}
