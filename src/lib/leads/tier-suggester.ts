import { resolveTierFromHeadcount } from '@/lib/billing/nr01-catalog'

/** Tier sugerido a partir do headcount (catálogo t01–t16). */
export function inferTierFromHeadcount(collaborators: number): string {
  return resolveTierFromHeadcount(collaborators)
}
