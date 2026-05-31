/**
 * Licença Pentagrama — assinatura ativa ou fatura comercial paga.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'

export interface PentagramaLicenseStatus {
  licensed: boolean
  source: 'admin' | 'module_flag' | 'subscription' | 'commercial_invoice' | 'nr01_bundle' | null
  subscriptionId: string | null
  invoiceId: string | null
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

export async function userHasPentagramaLicense(userId: string): Promise<boolean> {
  const s = await getPentagramaLicenseForUser(userId)
  return s.licensed
}
