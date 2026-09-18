/**
 * Licença NR-01 — política atual: todo usuário autenticado com perfil ativo
 * acessa o módulo (flags/assinatura mantidos só para billing/tier).
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'

export interface Nr01LicenseStatus {
  licensed: boolean
  source: 'admin' | 'module_flag' | 'subscription' | 'commercial_invoice' | 'authenticated' | null
  subscriptionId: string | null
  invoiceId: string | null
}

export async function getNr01LicenseForUser(userId: string): Promise<Nr01LicenseStatus> {
  const admin = createServiceRoleClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('role, module_nr01, is_active')
    .eq('id', userId)
    .returns<{ role: UserRole; module_nr01: boolean; is_active: boolean }[]>()
    .maybeSingle()

  if (!profile || profile.is_active === false) {
    return { licensed: false, source: null, subscriptionId: null, invoiceId: null }
  }

  // Preferir source real para tier/billing quando existir.
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

  if (profile.role === 'admin') {
    return { licensed: true, source: 'admin', subscriptionId: null, invoiceId: null }
  }

  if (profile.module_nr01 === true) {
    return { licensed: true, source: 'module_flag', subscriptionId: null, invoiceId: null }
  }

  // Acesso liberado para qualquer perfil ativo (política da plataforma).
  return { licensed: true, source: 'authenticated', subscriptionId: null, invoiceId: null }
}

export async function userHasNr01License(userId: string): Promise<boolean> {
  const s = await getNr01LicenseForUser(userId)
  return s.licensed
}
