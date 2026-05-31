/**
 * Catálogo de checkout — lê products/plans via service role com fallback ao registry.
 * Evita 404 quando a migration P021 ainda não foi aplicada ou RLS bloqueia leitura anónima.
 */

import { getProductById } from '@/lib/products/registry'
import { nr01PlansAsProductPlans } from '@/lib/billing/nr01-plans'
import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { Product, ProductPlan } from '@/types/database'

function productFromRegistry(productId: string): Product | null {
  const reg = getProductById(productId)
  if (!reg) return null
  return {
    id: reg.id,
    name: reg.name,
    subdomain: reg.subdomain,
    description: reg.description,
    active: true,
    created_at: new Date(0).toISOString(),
  }
}

export async function getProductForCheckout(productId: string): Promise<Product | null> {
  const fromRegistry = productFromRegistry(productId)
  if (!fromRegistry) return null

  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('active', true)
      .maybeSingle()

    if (!error && data) return data as Product
  } catch (err) {
    console.warn('[catalog] products lookup failed, using registry:', err)
  }

  return fromRegistry
}

export async function getActivePlansForProduct(productId: string): Promise<ProductPlan[]> {
  // NR-01: fonte de verdade em código (página de vendas v2). Evita exibir preços
  // desatualizados quando a migration ainda não foi aplicada no Supabase.
  if (productId === 'nr01') return nr01PlansAsProductPlans()

  try {
    const admin = createServiceRoleClient()
    const { data, error } = await admin
      .from('product_plans')
      .select('*')
      .eq('product_id', productId)
      .eq('active', true)
      .order('price_cents', { ascending: true })

    if (!error && data?.length) return data as ProductPlan[]
  } catch (err) {
    console.warn('[catalog] product_plans lookup failed:', err)
  }

  return []
}
