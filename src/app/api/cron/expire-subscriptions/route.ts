/**
 * QUANTUM5G — GET /api/cron/expire-subscriptions
 *
 * Cron diário (00:00 UTC) que revoga module_nr01 de usuários com
 * assinatura NR-01 expirada e sem outra subscription ativa.
 *
 * Protegido por CRON_SECRET (cabeçalho Authorization: Bearer <secret>).
 * Vercel invoca automaticamente conforme vercel.json › crons.
 */

import { NextRequest, NextResponse } from 'next/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  // Vercel injeta o token automaticamente em produção; exige mesmo
  // segredo em chamadas manuais (curl -H "Authorization: Bearer <secret>").
  if (secret && authHeader !== `Bearer ${secret}`) {
    return unauthorized()
  }

  const admin = createServiceRoleAdmin()

  // Busca perfis com module_nr01=true que não têm nenhuma subscription
  // ativa para o produto nr01 (a view active_subscriptions já filtra
  // status='active' AND (expires_at IS NULL OR expires_at > now())).
  const { data: expired, error } = await admin.rpc('get_expired_nr01_profiles')

  if (error) {
    // Fallback: query manual caso a função RPC não exista ainda
    const { data: profiles, error: qErr } = await admin
      .from('profiles')
      .select('id')
      .eq('module_nr01', true)
      .eq('is_active', true)

    if (qErr || !profiles) {
      return NextResponse.json({ error: qErr?.message ?? 'Falha ao listar perfis' }, { status: 500 })
    }

    let revoked = 0
    for (const profile of profiles) {
      const { data: active } = await admin
        .from('active_subscriptions')
        .select('id')
        .eq('user_id', profile.id)
        .eq('product_id', 'nr01')
        .limit(1)

      if (!active || active.length === 0) {
        await admin
          .from('profiles')
          .update({ module_nr01: false, is_active: false })
          .eq('id', profile.id)
        revoked++
      }
    }

    return NextResponse.json({
      ok: true,
      checked: profiles.length,
      revoked,
      via: 'manual_query',
      ts: new Date().toISOString(),
    })
  }

  // Caminho com RPC (quando disponível)
  const revokedIds: string[] = Array.isArray(expired) ? expired.map((r: { id: string }) => r.id) : []

  if (revokedIds.length > 0) {
    await admin
      .from('profiles')
      .update({ module_nr01: false, is_active: false })
      .in('id', revokedIds)
  }

  return NextResponse.json({
    ok: true,
    revoked: revokedIds.length,
    via: 'rpc',
    ts: new Date().toISOString(),
  })
}
