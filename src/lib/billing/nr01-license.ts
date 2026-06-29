/**
 * Licença NR-01 — assinatura ativa (gateway) ou fatura comercial paga (presencial).
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'

export interface Nr01LicenseStatus {
  licensed: boolean
  source: 'admin' | 'module_flag' | 'subscription' | 'commercial_invoice' | null
  subscriptionId: string | null
  invoiceId: string | null
}

export async function getNr01LicenseForUser(userId: string): Promise<Nr01LicenseStatus> {
  const admin = createServiceRoleClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, module_nr01')
    .eq('id', userId)
    .returns<{ role: UserRole; module_nr01: boolean }[]>()
    .maybeSingle()

  const role = profile?.role
  if (role === 'admin') {
    return { licensed: true, source: 'admin', subscriptionId: null, invoiceId: null }
  }

  // Subscription/fatura ANTES do module_flag — tier enforcement precisa do metadata (worker_max).
  const { data: subs } = await admin
    .from('active_subscriptions' as 'subscriptions')
    .select('id')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .limit(1)
    .returns<{ id: string }[]>()

  if (subs?.length) {
    return {
      licensed: true,
      source: 'subscription',
      subscriptionId: subs[0].id as string,
      invoiceId: null,
    }
  }

  const { data: inv } = await admin
    .from('commercial_invoices')
    .select('id, subscription_id')
    .eq('user_id', userId)
    .eq('product_id', 'nr01')
    .eq('status', 'paga')
    .order('paid_at', { ascending: false })
    .limit(1)
    .returns<{ id: string; subscription_id: string | null }[]>()
    .maybeSingle()

  if (inv?.id) {
    return {
      licensed: true,
      source: 'commercial_invoice',
      subscriptionId: (inv.subscription_id as string | null) ?? null,
      invoiceId: inv.id as string,
    }
  }

  if (profile?.module_nr01 === true) {
    return { licensed: true, source: 'module_flag', subscriptionId: null, invoiceId: null }
  }

  return { licensed: false, source: null, subscriptionId: null, invoiceId: null }
}

export async function userHasNr01License(userId: string): Promise<boolean> {
  const s = await getNr01LicenseForUser(userId)
  return s.licensed
}
