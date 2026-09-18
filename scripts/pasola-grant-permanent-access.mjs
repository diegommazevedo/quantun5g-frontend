/**
 * Concede acesso PERMANENTE aos módulos NR-01 + Pentagrama para
 * gerencia@pasola.com.br (Contratante — Grupo Pasola).
 *
 * Causa raiz do bug: a fatura INV-2026-00005 (paga) foi inserida
 * diretamente no banco por um script anterior, sem passar pelo fluxo real
 * de provisionamento (updateCommercialInvoiceStatus → provisionFromPaidInvoice).
 * Isso nunca criou linhas em `subscriptions`. profiles.module_nr01 foi
 * setado manualmente algumas vezes (ver scripts/setup-pasola-org.mjs), mas
 * o cron diário /api/cron/expire-subscriptions revoga module_nr01 sempre
 * que não encontra nenhuma linha em `active_subscriptions` para o usuário —
 * por isso o módulo "voltava" a ficar bloqueado.
 *
 * Este script cria as duas subscriptions (nr01 + pentagrama) como
 * status='active' e expires_at=NULL (nunca expira), vinculadas à fatura já
 * paga, e garante os module flags no profile. Isso é permanente e sobrevive
 * ao cron (ele só revoga quando NÃO há subscription ativa).
 *
 * node --env-file=.env.local scripts/pasola-grant-permanent-access.mjs
 * Dry-run: node --env-file=.env.local scripts/pasola-grant-permanent-access.mjs --dry-run
 */

import { randomUUID } from 'node:crypto'
import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')
const EMAIL = 'gerencia@pasola.com.br'
const INVOICE_ID = '421cee6a-1108-47d8-9bf9-833ec802302e'

async function loadEnv() {
  const text = await readFile('.env.local', 'utf8')
  return Object.fromEntries(
    text.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
  )
}

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: profile, error: profileErr } = await admin
    .from('profiles')
    .select('id, email, role, module_nr01, module_pentagrama, is_active')
    .eq('email', EMAIL)
    .single()
  if (profileErr || !profile) throw new Error(`Perfil não encontrado: ${profileErr?.message ?? EMAIL}`)
  const userId = profile.id
  console.log('=== ANTES ===')
  console.log(profile)

  const { data: invoice, error: invErr } = await admin
    .from('commercial_invoices')
    .select('*')
    .eq('id', INVOICE_ID)
    .eq('user_id', userId)
    .single()
  if (invErr || !invoice) throw new Error(`Fatura não encontrada: ${invErr?.message ?? INVOICE_ID}`)
  if (invoice.status !== 'paga') throw new Error(`Fatura ${invoice.invoice_number} não está paga (status=${invoice.status})`)

  const { data: existingSubs } = await admin
    .from('subscriptions')
    .select('id, product_id, status, expires_at')
    .eq('user_id', userId)
  console.log('\n=== SUBSCRIPTIONS EXISTENTES ===', existingSubs?.length ?? 0, existingSubs)

  const paidAt = new Date().toISOString()
  const results = {}

  for (const productId of ['nr01', 'pentagrama']) {
    const already = (existingSubs ?? []).find((s) => s.product_id === productId && s.status === 'active')
    if (already) {
      console.log(`\n[${productId}] já tem subscription ativa (${already.id}) — pulando criação, só garanto expires_at=NULL.`)
      results[productId] = already.id
      if (!DRY) {
        const { error } = await admin
          .from('subscriptions')
          .update({ expires_at: null, status: 'active' })
          .eq('id', already.id)
        if (error) throw error
      }
      continue
    }

    const planId = productId === 'nr01' ? 'nr01_t10' : 'pent_operacional'
    const subId = randomUUID()
    const insert = {
      id: subId,
      user_id: userId,
      product_id: productId,
      plan_id: planId,
      company_id: invoice.company_id,
      status: 'active',
      starts_at: paidAt,
      expires_at: null, // permanente — nunca expira, sobrevive ao cron
      assessments_remaining: productId === 'nr01' ? 99 : 1,
      metadata: {
        gateway: 'commercial_invoice',
        commercial_invoice_id: invoice.id,
        commercial_invoice_number: invoice.invoice_number,
        tier_id: productId === 'nr01' ? 't10' : undefined,
        entitlements:
          productId === 'nr01'
            ? ['core_nr01', 'email_broadcast', 'pdca', 'evidence_pack', 'support_email', 'pentagrama_ginger']
            : undefined,
        grant_reason: 'permanent_manual_unlock_2026-07-30',
        provisioned_at: paidAt,
      },
    }
    console.log(`\n[${productId}] criaria subscription:`, DRY ? insert : '(inserindo...)')
    if (!DRY) {
      const { error } = await admin.from('subscriptions').insert(insert)
      if (error) throw error
    }
    results[productId] = subId
  }

  if (!DRY) {
    if (!invoice.subscription_id && results.nr01) {
      const { error } = await admin
        .from('commercial_invoices')
        .update({ subscription_id: results.nr01 })
        .eq('id', invoice.id)
      if (error) throw error
      console.log('\nFatura vinculada à subscription nr01:', results.nr01)
    }

    const { error: pErr } = await admin
      .from('profiles')
      .update({ module_nr01: true, module_pentagrama: true, is_active: true })
      .eq('id', userId)
    if (pErr) throw pErr
  }

  const { data: after } = await admin
    .from('profiles')
    .select('id, email, role, module_nr01, module_pentagrama, is_active')
    .eq('id', userId)
    .single()
  console.log('\n=== DEPOIS (profile) ===')
  console.log(after)

  const { data: activeView } = await admin
    .from('active_subscriptions')
    .select('*')
    .eq('user_id', userId)
  console.log('\n=== DEPOIS (active_subscriptions) ===', activeView?.length ?? 0)
  console.log(activeView)
}

main().catch((e) => {
  console.error('ERRO:', e.message ?? e)
  process.exit(1)
})
