/**
 * QUANTUM5G — GET /api/cron/nr01-pulses
 * Dispara micro-pulsos do dia (day_of_week = hoje, config enabled).
 */
import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { dispatchPulseForAssessment, todayIsoDayOfWeek } from '@/lib/nr01/dispatch-pulse'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret || req.headers.get('authorization') !== `Bearer ${secret}`) {
    return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
  }

  const admin = createServiceRoleAdmin()
  const dow = todayIsoDayOfWeek()

  const { data: configs, error } = await admin
    .from('nr01_pulse_config')
    .select('assessment_id, day_of_week, last_dispatched_at')
    .eq('enabled', true)
    .eq('day_of_week', dow)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  const results = []
  const today = new Date().toISOString().slice(0, 10)
  for (const cfg of configs ?? []) {
    const c = cfg as {
      assessment_id: string
      last_dispatched_at: string | null
    }
    // Evita disparo duplicado no mesmo dia
    if (c.last_dispatched_at?.startsWith(today)) {
      results.push({ assessmentId: c.assessment_id, skipped: 'already_today' })
      continue
    }
    results.push(await dispatchPulseForAssessment(admin, c.assessment_id))
  }

  return NextResponse.json({
    ok: true,
    day_of_week: dow,
    processed: results.length,
    results,
    ts: new Date().toISOString(),
  })
}
