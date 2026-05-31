import {
  NR01_SALES_PLANS,
  type Nr01SalesPlanId,
} from '@/constants/nr01-sales-plans'
import type { ProductPlan } from '@/types/database'

/** Fallback quando product_plans ainda não foi migrado no Supabase. */
export function nr01PlansAsProductPlans(): ProductPlan[] {
  const now = new Date(0).toISOString()
  return NR01_SALES_PLANS.filter((p) => p.checkoutEnabled).map((p) => ({
    id: p.id,
    product_id: 'nr01',
    name: p.name,
    collaborators_min: p.collaboratorsMin,
    collaborators_max: p.collaboratorsMax,
    price_cents: p.priceCents,
    modality: 'annual',
    assessments_per_period: p.assessmentsPerPeriod,
    active: true,
    created_at: now,
  }))
}

export function isNr01PlanId(id: string): id is Nr01SalesPlanId {
  return NR01_SALES_PLANS.some((p) => p.id === id)
}
