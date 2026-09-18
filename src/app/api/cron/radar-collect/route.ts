/**
 * QUANTUM5G — GET /api/cron/radar-collect
 * Materializa sinais do Radar Empresarial.
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { collectRadarSignals } from '@/lib/radar/collect'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createServiceRoleAdmin()
  const result = await collectRadarSignals(admin)

  return NextResponse.json({
    ok: true,
    ...result,
    ts: new Date().toISOString(),
  })
}
