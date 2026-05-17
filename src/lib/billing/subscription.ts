/**
 * QUANTUM5G — Helpers de subscription para gating de acesso.
 *
 * Usados em:
 *   - src/proxy.ts       → hasActiveSubscriptionForRequest()
 *   - src/app/page.tsx   → getUserActiveSubscriptions() (apex shell)
 *   - rotas API billing  → setActive(), setStatus()
 *
 * Política de gating: usuário precisa ter UMA linha em
 * `subscriptions` com status='active' para o productId pedido.
 * A view `active_subscriptions` já filtra status + expiração.
 */

import type { NextRequest } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import type { Database } from '@/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'
import {
  createServiceRoleClient,
  createServiceRoleAdmin,
} from '@/lib/supabase/service-role'
import type { ProductId } from '@/lib/products/registry'

export interface ActiveSubscription {
  id: string
  user_id: string
  product_id: ProductId
  plan_id: string
  subdomain: string
  expires_at: string | null
  assessments_remaining: number
  company_id: string | null
}

/**
 * Verifica se o usuário autenticado da request tem assinatura
 * ativa para o produto. Lê a view `active_subscriptions` via
 * client Supabase com cookies da request (RLS aplica).
 */
export async function hasActiveSubscriptionForRequest(
  request: NextRequest,
  productId: ProductId,
): Promise<boolean> {
  // Client read-only (não escreve cookies — evita conflito com updateSession)
  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll() {
          /* no-op */
        },
      },
    },
  )

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return false

  const { data, error } = await supabase
    .from('active_subscriptions')
    .select('id')
    .eq('user_id', user.id)
    .eq('product_id', productId)
    .limit(1)

  if (error) return false
  return Array.isArray(data) && data.length > 0
}

/**
 * Lista todas as assinaturas ativas de um usuário.
 * Para uso em Server Components (apex shell, dashboards).
 */
export async function getUserActiveSubscriptions(
  userId: string,
): Promise<ActiveSubscription[]> {
  // Service role: estamos chamando do server depois de já ter
  // validado o user; queremos todas as linhas sem depender de RLS
  // (o caller é responsável por passar o userId correto).
  const admin = createServiceRoleClient()

  const { data, error } = await admin
    .from('active_subscriptions')
    .select('id, user_id, product_id, plan_id, subdomain, expires_at, assessments_remaining, company_id')
    .eq('user_id', userId)

  if (error || !data) return []
  return data as unknown as ActiveSubscription[]
}

/**
 * Marca subscription como ativa (chamado pelo webhook do Asaas).
 * Calcula expires_at conforme modality do plano.
 */
export async function activateSubscription(params: {
  subscriptionId: string
  paidAt: Date
  modality: 'one_off' | 'annual' | 'monthly'
  assessmentsPerPeriod: number
}): Promise<void> {
  // Untyped: write em subscriptions (mesmo padrão do P020 agente).
  const admin = createServiceRoleAdmin()

  const expiresAt = computeExpiresAt(params.paidAt, params.modality)

  const { error } = await admin
    .from('subscriptions')
    .update({
      status: 'active',
      starts_at: params.paidAt.toISOString(),
      expires_at: expiresAt ? expiresAt.toISOString() : null,
      assessments_remaining: params.assessmentsPerPeriod,
    })
    .eq('id', params.subscriptionId)

  if (error) throw new Error(`Falha ao ativar subscription: ${error.message}`)
}

export async function setSubscriptionStatus(
  subscriptionId: string,
  status: 'pending' | 'active' | 'expired' | 'cancelled' | 'failed',
): Promise<void> {
  const admin = createServiceRoleAdmin()
  const { error } = await admin
    .from('subscriptions')
    .update({ status })
    .eq('id', subscriptionId)
  if (error) throw new Error(`Falha ao atualizar status: ${error.message}`)
}

function computeExpiresAt(
  paidAt: Date,
  modality: 'one_off' | 'annual' | 'monthly',
): Date | null {
  const d = new Date(paidAt)
  switch (modality) {
    case 'annual':
      d.setFullYear(d.getFullYear() + 1)
      return d
    case 'monthly':
      d.setMonth(d.getMonth() + 1)
      return d
    case 'one_off':
      // one_off não expira (consome via assessments_remaining)
      return null
  }
}
