import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export interface DispatchBatchSummary {
  id: string
  sent_count: number
  failed_count: number
  created_at: string
  items: Array<{
    email: string
    status: string
    error_message: string | null
  }>
}

export async function loadLastDispatchBatch(
  supabase: Supabase,
  module: 'pentagrama' | 'nr01',
  referenceId: string,
): Promise<DispatchBatchSummary | null> {
  const { data: batch } = await supabase
    .from('email_dispatch_batches')
    .select('id, sent_count, failed_count, created_at')
    .eq('module', module)
    .eq('reference_id', referenceId)
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  if (!batch) return null
  const b = batch as { id: string; sent_count: number; failed_count: number; created_at: string }

  const { data: items } = await supabase
    .from('email_dispatch_items')
    .select('email, status, error_message')
    .eq('batch_id', b.id)
    .order('created_at')

  return {
    ...b,
    items: (items ?? []) as DispatchBatchSummary['items'],
  }
}
