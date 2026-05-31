import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface InviteDeliveryStats {
  total: number
  sent: number
  delivered: number
  opened: number
  bounced: number
  complained: number
  failed: number
  pending: number
}

export async function loadInviteDeliveryStats(
  supabase: Supabase,
  module: 'pentagrama' | 'nr01',
  referenceId: string,
): Promise<InviteDeliveryStats> {
  const { data } = await supabase
    .from('survey_invites')
    .select('email_status, email_opened_at, opened_at')
    .eq('module', module)
    .eq('reference_id', referenceId)

  const rows = (data ?? []) as Array<{
    email_status: string | null
    email_opened_at: string | null
    opened_at: string | null
  }>

  const stats: InviteDeliveryStats = {
    total: rows.length,
    sent: 0,
    delivered: 0,
    opened: 0,
    bounced: 0,
    complained: 0,
    failed: 0,
    pending: 0,
  }

  for (const r of rows) {
    const st = r.email_status ?? 'pending'
    if (st === 'sent') stats.sent += 1
    else if (st === 'delivered') stats.delivered += 1
    else if (st === 'bounced') stats.bounced += 1
    else if (st === 'complained') stats.complained += 1
    else if (st === 'failed') stats.failed += 1
    else stats.pending += 1
    if (r.email_opened_at || r.opened_at) stats.opened += 1
  }

  return stats
}
