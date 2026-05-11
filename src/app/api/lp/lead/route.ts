import { createHmac } from 'crypto'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { inferTierFromHeadcount } from '@/lib/leads/tier-suggester'
import { createServiceRoleClient } from '@/lib/supabase/service-role'

function hashClientIp(ip: string, secret: string): string {
  return createHmac('sha256', secret).update(ip.trim(), 'utf8').digest('hex')
}

function getRequestIp(req: Request): string {
  const xff = req.headers.get('x-forwarded-for')
  if (xff) {
    const first = xff.split(',')[0]?.trim()
    if (first) return first
  }
  const xri = req.headers.get('x-real-ip')?.trim()
  if (xri) return xri
  return '0.0.0.0'
}

const leadBodySchema = z
  .object({
    email: z.string().email(),
    phone: z.string().max(80).optional().nullable(),
    company_name: z.string().min(2).optional(),
    company: z.string().min(2).optional(),
    name: z.string().optional(),
    collaborators_count: z.coerce.number().int().positive().optional(),
    collaborators: z.union([z.string(), z.number()]).optional(),
    consent_lgpd: z.boolean().optional(),
    source: z.string().max(64).default('lp_main'),
    message: z.string().max(4000).optional(),
    utm_source: z.string().max(200).optional(),
    utm_medium: z.string().max(200).optional(),
    utm_campaign: z.string().max(200).optional(),
    utm_content: z.string().max(200).optional(),
  })
  .superRefine((data, ctx) => {
    const company = data.company_name ?? data.company
    if (!company || company.trim().length < 2) {
      ctx.addIssue({
        code: 'custom',
        message: 'Indique a empresa.',
        path: ['company_name'],
      })
    }
    const explicit = data.consent_lgpd === true
    const legacyLp =
      data.source === 'lp_nr01' &&
      typeof data.name === 'string' &&
      data.name.trim().length >= 2
    if (!explicit && !legacyLp) {
      ctx.addIssue({
        code: 'custom',
        message: 'Consentimento LGPD obrigatório.',
        path: ['consent_lgpd'],
      })
    }
  })

function parseHeadcount(data: z.infer<typeof leadBodySchema>): number | null {
  if (data.collaborators_count != null && Number.isFinite(data.collaborators_count)) {
    return data.collaborators_count
  }
  if (typeof data.collaborators === 'number' && Number.isFinite(data.collaborators)) {
    return Math.round(data.collaborators)
  }
  if (typeof data.collaborators === 'string') {
    const m = data.collaborators.match(/\d+/)
    if (m) {
      const n = parseInt(m[0], 10)
      return Number.isFinite(n) ? n : null
    }
  }
  return null
}

export async function POST(req: Request) {
  try {
    const secret = process.env.LEAD_HMAC_SECRET
    if (!secret || secret.length < 16) {
      console.error('[lp/lead] LEAD_HMAC_SECRET ausente ou curto demais')
      return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
    }

    let json: unknown
    try {
      json = await req.json()
    } catch {
      return NextResponse.json({ error: 'Pedido inválido.' }, { status: 400 })
    }

    const parsed = leadBodySchema.safeParse(json)
    if (!parsed.success) {
      const first = parsed.error.flatten().fieldErrors
      const msg =
        (first.email?.[0] as string | undefined) ||
        (first.company_name?.[0] as string | undefined) ||
        (first.consent_lgpd?.[0] as string | undefined) ||
        'Dados inválidos.'
      return NextResponse.json({ error: msg }, { status: 400 })
    }

    const data = parsed.data
    if (data.consent_lgpd !== true) {
      const legacyOk =
        data.source === 'lp_nr01' &&
        typeof data.name === 'string' &&
        data.name.trim().length >= 2
      if (!legacyOk) {
        return NextResponse.json({ error: 'Consentimento LGPD obrigatório.' }, { status: 400 })
      }
    }

    const companyName = (data.company_name ?? data.company)!.trim()
    const email = data.email.trim().toLowerCase()
    const headcount = parseHeadcount(data)
    const suggestedTier = headcount != null && headcount > 0 ? inferTierFromHeadcount(headcount) : null

    const ip = getRequestIp(req)
    const ipHash = hashClientIp(ip, secret)
    const consentAt = new Date().toISOString()

    const row = {
      email,
      phone: data.phone?.trim() || null,
      company_name: companyName,
      collaborators_count: headcount,
      suggested_tier: suggestedTier,
      source: data.source,
      utm_source: data.utm_source ?? null,
      utm_medium: data.utm_medium ?? null,
      utm_campaign: data.utm_campaign ?? null,
      utm_content: data.utm_content ?? null,
      ip_hash: ipHash,
      consent_lgpd: true,
      consent_at: consentAt,
    }

    const supabase = createServiceRoleClient()
    const { error } = await supabase.from('nr01_leads').insert(row as never)

    if (error) {
      console.error('[lp/lead] insert failed', error.message)
      return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      tier: suggestedTier,
    })
  } catch (e) {
    console.error('[lp/lead] unexpected', e)
    return NextResponse.json({ ok: false, error: 'internal' }, { status: 500 })
  }
}
