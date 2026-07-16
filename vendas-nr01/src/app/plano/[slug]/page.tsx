import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { PlanLanding } from '@/components/PlanLanding'
import { getPlanBySlug, PLAN_SLUGS } from '@/constants/plan-slugs'

const ACCENT = '#B8945A'

type Props = {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ addon?: string }>
}

function parseAddon(raw: string | undefined): boolean {
  if (!raw) return false
  const v = raw.toLowerCase()
  return v === '1' || v === 'true' || v === 'sim' || v === 'jovane_rt'
}

export function generateStaticParams() {
  return PLAN_SLUGS.map((slug) => ({ slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params
  const plan = getPlanBySlug(slug)
  if (!plan) return { title: 'Plano não encontrado' }

  const title = `Plano ${plan.name} NR-01 — ${plan.priceLabel}/ano | Quantum5G`
  const description = `${plan.audienceBadge}. ${plan.summary}`

  return {
    title,
    description,
    openGraph: { title, description, type: 'website', locale: 'pt_BR' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function PlanoPage({ params, searchParams }: Props) {
  const { slug } = await params
  const { addon: addonQuery } = await searchParams
  const plan = getPlanBySlug(slug)

  if (!plan || !plan.checkoutEnabled) notFound()

  const initialAddon = parseAddon(addonQuery)

  return (
    <div className="min-h-screen px-4 py-10 sm:py-14">
      <p className="mb-6 text-center text-sm">
        <Link href="/" className="underline underline-offset-2 opacity-80" style={{ color: ACCENT }}>
          ← Ver todos os planos
        </Link>
      </p>
      <PlanLanding plan={plan} initialAddon={initialAddon} />
    </div>
  )
}
