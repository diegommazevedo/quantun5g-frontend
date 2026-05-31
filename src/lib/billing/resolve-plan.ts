import { getActivePlansForProduct } from '@/lib/billing/catalog'
import { nr01PlansAsProductPlans } from '@/lib/billing/nr01-plans'
import type { ProductPlan } from '@/types/database'

/** Plano ativo por id — DB com fallback ao registry NR-01. */
export async function resolveActivePlan(
  productId: string,
  planId: string,
): Promise<ProductPlan | null> {
  const plans = await getActivePlansForProduct(productId)
  const found = plans.find((p) => p.id === planId)
  if (found) return found

  if (productId === 'nr01') {
    return nr01PlansAsProductPlans().find((p) => p.id === planId) ?? null
  }
  return null
}
