/**
 * POST /api/billing/commercial-invoice — emitir fatura (presencial)
 * GET  — listar faturas visíveis (RLS)
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createCommercialInvoice } from '@/lib/billing/commercial-invoice'
import { resolveCommercialInvoiceTargets } from '@/lib/billing/commercial-invoice-resolve'
import { validateCnpj } from '@/lib/companies/cnpj'
import { upsertCompanyByCnpj } from '@/lib/companies/upsert-by-cnpj'
import { parseCompanyCnpjSlots } from '@/lib/licensing/company-cnpj-slots'
import { parseTierPlanId, type Nr01BillingMode, type Nr01TierId } from '@/lib/billing/nr01-catalog'
import type { PentagramaPlanId } from '@/lib/billing/pentagrama-catalog'
import { resolvePentagramaPlanFromHeadcount } from '@/lib/billing/pentagrama-catalog'
import { isPlatformStaff } from '@/lib/auth/roles'
import type { UserRole } from '@/types/database'

function bad(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status })
}

export async function GET() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return bad('Não autenticado', 401)

  const { data, error } = await supabase
    .from('commercial_invoices')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) return bad(error.message, 500)
  return NextResponse.json({ invoices: data ?? [] })
}

interface CreateBody {
  modules?: { nr01?: boolean; pentagrama?: boolean }
  tierId?: Nr01TierId
  planId?: string
  pentagramaPlanId?: PentagramaPlanId
  billingMode?: Nr01BillingMode
  includePentagrama?: boolean
  headcountDeclared?: number
  notes?: string
  companyId?: string
  targetUserId?: string
  targetUserEmail?: string
  targetUserName?: string
  clientCnpj?: string
  clientWhatsapp?: string
  companyCnpjSlots?: number
  consultantId?: string
  autoInvite?: boolean
}

export async function POST(req: NextRequest) {
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

  const role = profile?.role ?? 'leader'
  if (!['admin', 'consultant', 'leader'].includes(role)) {
    return bad('Perfil sem permissão para emitir faturas', 403)
  }

  let body: CreateBody
  try {
    body = (await req.json()) as CreateBody
  } catch {
    return bad('JSON inválido')
  }

  const modules = {
    nr01: body.modules?.nr01 === true,
    pentagrama: body.modules?.pentagrama === true,
  }
  if (!modules.nr01 && !modules.pentagrama) {
    return bad('Selecione ao menos um módulo')
  }

  const cnpjRaw = body.clientCnpj?.trim() ?? ''
  const cnpjErr = validateCnpj(cnpjRaw)
  if (cnpjErr) return bad(cnpjErr)

  const headcountDeclared =
    typeof body.headcountDeclared === 'number' ? Math.round(body.headcountDeclared) : null

  let tierId: Nr01TierId | undefined
  let pentagramaPlanId: PentagramaPlanId | undefined

  if (modules.nr01) {
    tierId =
      body.tierId ??
      (body.planId ? parseTierPlanId(body.planId) ?? undefined : undefined) ??
      undefined
    if (!tierId) return bad('Faixa NR-01 é obrigatória')
  }

  if (modules.pentagrama) {
    pentagramaPlanId =
      body.pentagramaPlanId ??
      (headcountDeclared ? resolvePentagramaPlanFromHeadcount(headcountDeclared) : undefined)
    if (!pentagramaPlanId) return bad('Plano Pentagrama é obrigatório')
  }

  const billingMode: Nr01BillingMode =
    body.billingMode === 'anual_vista' ? 'anual_vista' : 'anual_parcelado'

  const includePentagrama =
    modules.nr01 && !modules.pentagrama && body.includePentagrama === true

  const companyCnpjSlots = parseCompanyCnpjSlots(body.companyCnpjSlots)

  try {
    const targets = await resolveCommercialInvoiceTargets({
      actorId: user.id,
      actorRole: role,
      targetUserId: body.targetUserId,
      targetUserEmail: isPlatformStaff(role) ? body.targetUserEmail : user.email ?? undefined,
      companyId: body.companyId ?? null,
      consultantId: role === 'admin' ? body.consultantId ?? null : null,
      autoInvite: body.autoInvite !== false,
      clientName: body.targetUserName ?? null,
    })

    const companyId = await upsertCompanyByCnpj({
      consultantId: targets.consultantId,
      cnpj: cnpjRaw,
      legalName: body.targetUserName ?? null,
      leaderUserId: targets.userId,
      whatsapp: body.clientWhatsapp ?? null,
      companyCnpjSlots,
    })

    const invoice = await createCommercialInvoice({
      userId: targets.userId,
      companyId,
      consultantId: targets.consultantId,
      createdBy: user.id,
      modules,
      tierId,
      pentagramaPlanId,
      billingMode,
      includePentagrama,
      headcountDeclared,
      notes: body.notes ?? null,
      clientCnpj: cnpjRaw,
      clientWhatsapp: body.clientWhatsapp ?? null,
      clientCompanyName: body.targetUserName ?? null,
      companyCnpjSlots,
    })

    return NextResponse.json({
      invoice,
      inviteSent: targets.inviteSent,
      emailSent: targets.inviteSent,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Erro ao criar fatura'
    return bad(msg, 400)
  }
}
