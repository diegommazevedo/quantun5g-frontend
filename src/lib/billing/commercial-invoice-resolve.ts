/**
 * Resolve destinatário e consultor para fatura comercial (porta a porta).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import {
  inviteLeaderByEmail,
  resolveUserIdByEmail,
  userNotFoundMessage,
} from '@/lib/auth/resolve-user-by-email'
import type { UserRole } from '@/types/database'

export async function resolveCommercialInvoiceTargets(params: {
  actorId: string
  actorRole: UserRole
  targetUserId?: string | null
  targetUserEmail?: string | null
  companyId?: string | null
  /** Admin pode forçar consultor responsável */
  consultantId?: string | null
  /** Staff: envia convite Supabase se o e-mail ainda não existir */
  autoInvite?: boolean
  clientName?: string | null
}): Promise<{
  userId: string
  consultantId: string
  companyId: string | null
  inviteSent: boolean
  emailSent: boolean
}> {
  const admin = createServiceRoleAdmin()

  if (params.actorRole === 'leader') {
    let consultantId: string | null = null
    let companyId = params.companyId ?? null

    if (companyId) {
      const { data: co } = await admin
        .from('companies')
        .select('consultant_id, account_user_id')
        .eq('id', companyId)
        .maybeSingle()
      if (co?.account_user_id && co.account_user_id !== params.actorId) {
        throw new Error('Empresa não vinculada a este usuário')
      }
      consultantId = co?.consultant_id as string | null
    } else {
      const { data: co } = await admin
        .from('companies')
        .select('id, consultant_id')
        .eq('account_user_id', params.actorId)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (co?.id) {
        companyId = co.id as string
        consultantId = co.consultant_id as string
      }
    }

    if (!consultantId) {
      throw new Error('Cadastre uma empresa com consultor responsável antes de emitir a fatura.')
    }

    return {
      userId: params.actorId,
      consultantId,
      companyId,
      inviteSent: false,
      emailSent: false,
    }
  }

  let inviteSent = false
  let emailSent = false
  let userId = params.targetUserId?.trim() || null
  if (!userId && params.targetUserEmail?.trim()) {
    userId = await resolveUserIdByEmail(params.targetUserEmail)
  }
  if (
    !userId &&
    params.targetUserEmail?.trim() &&
    params.autoInvite !== false &&
    (params.actorRole === 'admin' || params.actorRole === 'consultant')
  ) {
    const invited = await inviteLeaderByEmail({
      email: params.targetUserEmail,
      name: params.clientName,
    })
    userId = invited.userId
    inviteSent = invited.invited
    emailSent = invited.emailSent
  }
  if (!userId) {
    if (params.targetUserEmail?.trim()) {
      throw new Error(userNotFoundMessage(params.targetUserEmail))
    }
    throw new Error('Informe o e-mail do cliente (líder) para emitir a fatura.')
  }

  let consultantId = params.actorId
  let companyId = params.companyId ?? null

  if (params.actorRole === 'consultant') {
    if (companyId) {
      const { data: co } = await admin
        .from('companies')
        .select('consultant_id')
        .eq('id', companyId)
        .eq('consultant_id', params.actorId)
        .maybeSingle()
      if (!co) throw new Error('Empresa não pertence a este consultor')
    }
  } else if (params.actorRole === 'admin') {
    if (params.consultantId) consultantId = params.consultantId
    else if (companyId) {
      const { data: co } = await admin
        .from('companies')
        .select('consultant_id')
        .eq('id', companyId)
        .maybeSingle()
      if (co?.consultant_id) consultantId = co.consultant_id as string
    }
  }

  return { userId, consultantId, companyId, inviteSent, emailSent }
}
