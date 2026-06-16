/**
 * Licença Pentagrama — assinatura ativa ou fatura comercial paga.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import type { UserRole } from '@/types/database'

export interface PentagramaLicenseStatus {
  licensed: boolean
  source:
    | 'admin'
    | 'module_flag'
    | 'subscription'
    | 'commercial_invoice'
    | 'nr01_bundle'
    | 'org_consultant'
    | null
  subscriptionId: string | null
  invoiceId: string | null
}

async function licenseFromBilling(
  admin: ReturnType<typeof createServiceRoleClient>,
  userId: string,
): Promise<PentagramaLicenseStatus> {
  const { data: subs } = await admin
    .from('active_subscriptions' as 'subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', 'pentagrama')
    .limit(1)
    .returns<{ id: string }[]>()

  if (subs?.length) {
    return {
      licensed: true,
      source: 'subscription',
      subscriptionId: subs[0].id,
      invoiceId: null,
    }
  }

  const { data: invPent } = await admin
    .from('commercial_invoices')
    .select('id, subscription_id')
    .eq('user_id', userId)
    .eq('product_id', 'pentagrama')
    .eq('status', 'paga')
    .order('paid_at', { ascending: false })
    .limit(1)
    .returns<{ id: string; subscription_id: string | null }[]>()
    .maybeSingle()

  if (invPent?.id) {
    return {
      licensed: true,
      source: 'commercial_invoice',
      subscriptionId: invPent.subscription_id,
      invoiceId: invPent.id,
    }
  }

  const { data: invBundle } = await admin
    .from('commercial_invoices')
    .select('id, subscription_id')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .eq('status', 'paga')
    .eq('include_pentagrama', true)
    .order('paid_at', { ascending: false })
    .limit(1)
    .returns<{ id: string; subscription_id: string | null }[]>()
    .maybeSingle()

  if (invBundle?.id) {
    return {
      licensed: true,
      source: 'nr01_bundle',
      subscriptionId: invBundle.subscription_id,
      invoiceId: invBundle.id,
    }
  }

  return { licensed: false, source: null, subscriptionId: null, invoiceId: null }
}

export async function getPentagramaLicenseForUser(userId: string): Promise<PentagramaLicenseStatus> {
  const admin = createServiceRoleClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, module_pentagrama')
    .eq('id', userId)
    .returns<{ role: UserRole; module_pentagrama: boolean }[]>()
    .maybeSingle()

  if (profile?.role === 'admin') {
    return { licensed: true, source: 'admin', subscriptionId: null, invoiceId: null }
  }

  if (profile?.module_pentagrama === true) {
    return { licensed: true, source: 'module_flag', subscriptionId: null, invoiceId: null }
  }

  if (isGerenteRole(profile?.role ?? '')) {
    const { data: memberRaw } = await admin
      .from('org_members')
      .select('module_pentagrama')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    const member = memberRaw as { module_pentagrama: boolean } | null
    if (member?.module_pentagrama === true) {
      return { licensed: true, source: 'module_flag', subscriptionId: null, invoiceId: null }
    }
  }

  const direct = await licenseFromBilling(admin, userId)
  if (direct.licensed) return direct

  if (isContratanteRole(profile?.role ?? '') || isGerenteRole(profile?.role ?? '')) {
    let consultantId: string | null = null
    if (isContratanteRole(profile?.role ?? '')) {
      const { data: orgRaw } = await admin
        .from('org_accounts')
        .select('consultant_id')
        .eq('owner_user_id', userId)
        .maybeSingle()
      consultantId = (orgRaw as { consultant_id: string } | null)?.consultant_id ?? null
    } else {
      const { data: memberRaw } = await admin
        .from('org_members')
        .select('org_accounts ( consultant_id )')
        .eq('user_id', userId)
        .eq('is_active', true)
        .maybeSingle()
      const member = memberRaw as {
        org_accounts: { consultant_id: string } | { consultant_id: string }[] | null
      } | null
      const org = member?.org_accounts
      consultantId = Array.isArray(org) ? org[0]?.consultant_id ?? null : org?.consultant_id ?? null
    }

    if (consultantId && consultantId !== userId) {
      const inherited = await licenseFromBilling(admin, consultantId)
      if (inherited.licensed) {
        return { ...inherited, source: 'org_consultant' }
      }
    }
  }

  return { licensed: false, source: null, subscriptionId: null, invoiceId: null }
}

export async function userHasPentagramaLicense(userId: string): Promise<boolean> {
  const s = await getPentagramaLicenseForUser(userId)
  return s.licensed
}
