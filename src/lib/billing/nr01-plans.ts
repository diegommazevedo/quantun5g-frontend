import { nr01CatalogAsProductPlans } from '@/lib/billing/nr01-catalog'
import type { ProductPlan } from '@/types/database'

/** Planos NR-01 ativos — catálogo t01–t15 (COERENCIA-LP-SAAS). */
export function nr01PlansAsProductPlans(): ProductPlan[] {
  return nr01CatalogAsProductPlans()
}

export function isNr01PlanId(id: string): boolean {
  return id.startsWith('nr01_t') || id.startsWith('t0') || id.startsWith('t1')
}
