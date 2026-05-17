/**
 * QUANTUM5G — GET /api/billing/subscription (P021)
 * Lista assinaturas do usuário autenticado (todas as linhas, não só ativas).
 */

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Não autenticado' }, { status: 401 })
  }

  const { data, error } = await supabase
    .from('subscriptions')
    .select(`
      id,
      product_id,
      plan_id,
      status,
      starts_at,
      expires_at,
      assessments_remaining,
      created_at
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ subscriptions: data ?? [] })
}
