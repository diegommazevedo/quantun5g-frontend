'use server'

import { redirect } from 'next/navigation'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { collectRadarSignals } from '@/lib/radar/collect'
import { getPageActor } from '@/lib/org/page-actor'

export async function refreshRadarSignals() {
  await getPageActor()
  const admin = createServiceRoleAdmin()
  await collectRadarSignals(admin)
  redirect('/radar?refreshed=1')
}
