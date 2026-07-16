import type { PlanId } from '@/constants/plans'
import { SALES_PLANS } from '@/constants/plans'

/** Slug curto para URLs de campanha (WhatsApp, redes, anúncios). */
export const PLAN_SLUGS = ['essencial', 'operacional', 'estruturado'] as const
export type PlanSlug = (typeof PLAN_SLUGS)[number]

const SLUG_TO_ID: Record<PlanSlug, PlanId> = {
  essencial: 'nr01_essencial',
  operacional: 'nr01_operacional',
  estruturado: 'nr01_estruturado',
}

export function slugToPlanId(slug: string): PlanId | null {
  if (slug in SLUG_TO_ID) return SLUG_TO_ID[slug as PlanSlug]
  return null
}

export function getPlanBySlug(slug: string) {
  const id = slugToPlanId(slug)
  if (!id) return null
  return SALES_PLANS.find((p) => p.id === id) ?? null
}

/** URLs públicas por plano (base = origem do site de vendas). */
export function planShareUrls(vendasOrigin: string) {
  const base = vendasOrigin.replace(/\/$/, '')
  return PLAN_SLUGS.reduce(
    (acc, slug) => {
      acc[slug] = {
        page: `${base}/plano/${slug}`,
        withAddon: `${base}/plano/${slug}?addon=1`,
      }
      return acc
    },
    {} as Record<PlanSlug, { page: string; withAddon: string }>,
  )
}
