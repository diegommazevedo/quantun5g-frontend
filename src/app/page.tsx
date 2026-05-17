/**
 * QUANTUM5G — Apex Shell (quantun5g.app)
 *
 * Rota raiz da arquitetura dual (P021).
 *  - Sem login → redireciona para /institucional (landing pública).
 *  - Com login → mostra dashboard de produtos: cards Pentagrama e NR-01,
 *    com link direto para o produto se houver assinatura ativa, ou CTA
 *    para checkout se não houver.
 *
 * Em produção, esta página é servida no apex `quantun5g.app`. Os
 * subdomínios `pentagrama.quantun5g.app` e `nr01.quantun5g.app`
 * usam o mesmo app (single Vercel deployment) e o proxy faz o
 * gating por assinatura.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { listProducts, type Product } from '@/lib/products/registry'
import { getUserActiveSubscriptions } from '@/lib/billing/subscription'

export const metadata = {
  title: 'Quantum5G · Plataforma',
  description: 'Plataforma Quantum5G — Pentagrama de Ginger e NR-01 em um só ecossistema.',
}

export const dynamic = 'force-dynamic'

const APP_DOMAIN = 'quantun5g.app'

export default async function ApexShell() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/institucional')

  const subscriptions = await getUserActiveSubscriptions(user.id)
  const subscribedIds = new Set(subscriptions.map(s => s.product_id))
  const products = listProducts()

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-4xl">
        <header className="mb-10">
          <h1 className="text-2xl font-bold text-slate-900">
            Bem-vindo{user.email ? `, ${user.email}` : ''}
          </h1>
          <p className="mt-2 text-sm text-slate-600">
            Selecione o produto para acessar.
          </p>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          {products.map(product => (
            <ProductCard
              key={product.id}
              product={product}
              isSubscribed={subscribedIds.has(product.id)}
            />
          ))}
        </div>

        <footer className="mt-12 text-center text-xs text-slate-400">
          Quantum5G · {new Date().getFullYear()}
        </footer>
      </div>
    </main>
  )
}

function ProductCard({
  product,
  isSubscribed,
}: {
  product: Product
  isSubscribed: boolean
}) {
  const productUrl =
    process.env.NODE_ENV === 'production'
      ? product.appPath.startsWith('http')
        ? product.appPath
        : `https://${product.subdomain}.${APP_DOMAIN}${product.appPath}`
      : `${product.appPath}?subdomain=${product.subdomain}`

  return (
    <article className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="text-lg font-semibold text-slate-900">{product.name}</h2>
      <p className="mt-1 text-sm text-slate-600">{product.description}</p>

      <div className="mt-4">
        {isSubscribed ? (
          <Link
            href={productUrl}
            className="inline-flex items-center justify-center rounded-md bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            Acessar {product.name}
          </Link>
        ) : (
          <Link
            href={`/checkout/${product.id}`}
            className="inline-flex items-center justify-center rounded-md border border-slate-900 px-4 py-2 text-sm font-medium text-slate-900 hover:bg-slate-100"
          >
            Assinar produto
          </Link>
        )}
      </div>
    </article>
  )
}
