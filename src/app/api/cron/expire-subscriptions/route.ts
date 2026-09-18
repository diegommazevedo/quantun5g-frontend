/**
 * QUANTUM5G — GET /api/cron/expire-subscriptions
 *
 * Cron diário mantido por compatibilidade operacional.
 * Módulos Pentagrama e NR-01 não são mais revogados: todos os usuários
 * cadastrados mantêm acesso a ambos.
 *
 * Protegido por CRON_SECRET (cabeçalho Authorization: Bearer <secret>).
 */

import { NextRequest, NextResponse } from 'next/server'

export const dynamic = 'force-dynamic'

function unauthorized() {
  return NextResponse.json({ error: 'Não autorizado' }, { status: 401 })
}

export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET
  const authHeader = req.headers.get('authorization')

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return unauthorized()
  }

  return NextResponse.json({
    ok: true,
    revoked: 0,
    skipped: true,
    reason: 'modulos_liberados_para_todos_usuarios',
    ts: new Date().toISOString(),
  })
}
