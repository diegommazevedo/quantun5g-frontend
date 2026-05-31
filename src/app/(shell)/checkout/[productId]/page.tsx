/**
 * QUANTUM5G — Checkout multi-produto (P021 + catálogo t01–t16)
 */

import { notFound, redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { getActivePlansForProduct, getProductForCheckout } from '@/lib/billing/catalog'
import {
  isPentagramaAddon,
  parseTierPlanId,
  resolveTierFromHeadcount,
  type Nr01BillingMode,
  type Nr01TierId,
} from '@/lib/billing/nr01-catalog'
import { CheckoutForm } from './checkout-form'

export const dynamic = 'force-dynamic'

interface Props {
  params: Promise<{ productId: string }>
  searchParams: Promise<{
    plan?: string
    tier?: string
    headcount?: string
    billing?: string
    ginger?: string
    addon?: string
  }>
}

function buildCheckoutPath(productId: string, q: Record<string, string | undefined>): string {
  const params = new URLSearchParams()
  for (const [k, v] of Object.entries(q)) {
    if (v) params.set(k, v)
  }
  const qs = params.toString()
  return `/checkout/${productId}${qs ? `?${qs}` : ''}`
}

export default async function CheckoutPage({ params, searchParams }: Props) {
  const { productId } = await params
  const sp = await searchParams

  const product = await getProductForCheckout(productId)
  if (!product) notFound()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const dest = buildCheckoutPath(productId, sp)
    redirect(`/login?redirect=${encodeURIComponent(dest)}`)
  }

  const plans = await getActivePlansForProduct(productId)

  if (plans.length === 0 && productId !== 'nr01') {
    return (
      <main className="min-h-screen bg-slate-50 px-4 py-12">
        <div className="mx-auto max-w-2xl text-center">
          <h1 className="text-xl font-semibold text-slate-900">{product.name}</h1>
          <p className="mt-4 text-sm text-slate-600">
            Não há planos disponíveis para contratação online neste momento.
          </p>
          <Link
            href="mailto:contato@quantun5g.com?subject=Proposta%20Quantum5G%20NR-01"
            className="mt-6 inline-flex rounded-md border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Pedir proposta
          </Link>
        </div>
      </main>
    )
  }

  const headcount = sp.headcount ? Math.max(1, parseInt(sp.headcount, 10) || 50) : 50
  const tierFromQuery = (sp.tier ?? parseTierPlanId(sp.plan ?? '') ?? resolveTierFromHeadcount(headcount)) as Nr01TierId
  const billingMode: Nr01BillingMode =
    sp.billing === 'anual_vista' ? 'anual_vista' : 'anual_parcelado'
  const includePentagrama =
    sp.ginger === '1' || sp.ginger === 'true' || isPentagramaAddon(sp.addon)

  const initialPlanId =
    sp.plan && plans.some((p) => p.id === sp.plan)
      ? sp.plan
      : plans.find((p) => p.id === `nr01_${tierFromQuery}`)?.id ?? plans[0]?.id ?? `nr01_${tierFromQuery}`

  const planLocked = Boolean(sp.plan || sp.tier)
  const gingerLocked = includePentagrama && Boolean(sp.addon || sp.ginger)

  const vendasOrigin =
    process.env.NEXT_PUBLIC_VENDAS_ORIGIN?.replace(/\/$/, '') ?? 'https://www.novaleinr01.com.br'

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-2xl">
        <header className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wide text-blue-800">Assinatura anual</p>
          <h1 className="text-2xl font-bold text-slate-900">Contratar {product.name}</h1>
          <p className="mt-2 text-sm text-slate-600">
            Mesmo pacote em todas as faixas · 12× no cartão ou à vista (−10%) · complemento Pentagrama opcional.
          </p>
        </header>

        <CheckoutForm
          productId={productId}
          plans={plans}
          initialPlanId={initialPlanId}
          initialTierId={productId === 'nr01' ? tierFromQuery : null}
          initialHeadcount={productId === 'nr01' ? headcount : null}
          initialBillingMode={productId === 'nr01' ? billingMode : undefined}
          initialIncludePentagrama={productId === 'nr01' ? includePentagrama : undefined}
          planLocked={planLocked}
          gingerLocked={gingerLocked}
          vendasOrigin={vendasOrigin}
          userEmail={user.email ?? ''}
        />
      </div>
    </main>
  )
}
