/**
 * PATCH /api/billing/commercial-invoice/[id]/status
 * emitida → aprovada → paga (somente admin)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { updateCommercialInvoiceStatus } from '@/lib/billing/commercial-invoice'
import type { CommercialInvoiceStatus, UserRole } from '@/types/database'

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function PATCH(
  req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
) {
  const { id } = await ctx.params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return bad('Não autenticado', 401)

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()

  const role = profile?.role
  if (!role || role !== 'admin') {
    return bad('Somente administrador pode alterar status da fatura', 403)
  }

  let body: { status?: CommercialInvoiceStatus; notes?: string }
  try {
    body = (await req.json()) as { status?: CommercialInvoiceStatus; notes?: string }
  } catch {
    return bad('JSON inválido')
  }

  const nextStatus = body.status
  if (!nextStatus || !['aprovada', 'paga', 'cancelada'].includes(nextStatus)) {
    return bad('status inválido (aprovada | paga | cancelada)')
  }

  try {
    const invoice = await updateCommercialInvoiceStatus({
      invoiceId: id,
      nextStatus,
      actorId: user.id,
      actorRole: role,
      notes: body.notes ?? null,
    })
    return NextResponse.json({ invoice })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao atualizar fatura'
    return bad(msg, 400)
  }
}
