import { NextResponse } from 'next/server'
import {
  collaboratorsToTier,
  getOfferByTier,
  tierRangeLabel,
} from '@/constants/lp-nr01-offers'

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as { collaborators?: unknown }
    const raw = body.collaborators
    const n = typeof raw === 'number' ? raw : typeof raw === 'string' ? Number(raw) : NaN
    if (!Number.isFinite(n) || n < 1) {
      return NextResponse.json({ error: 'Número de colaboradores inválido.' }, { status: 400 })
    }

    const tier = collaboratorsToTier(n)
    const offer = getOfferByTier(tier)

    return NextResponse.json({
      tier,
      planId: offer.planId,
      price: offer.price,
      period: offer.period,
      summary: offer.summary,
      headline: offer.headline,
      audienceRange: offer.audienceRange,
      range: tierRangeLabel(tier),
    })
  } catch {
    return NextResponse.json({ error: 'Payload inválido.' }, { status: 400 })
  }
}
