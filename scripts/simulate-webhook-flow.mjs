/**
 * QUANTUM5G — Simulador de webhook Kiwify ponta a ponta
 *
 * Testa o fluxo completo:
 *   compra_aprovada → invitePlatformUser → subscription ativa → module_nr01=true
 *
 * Requer o servidor Next.js rodando em localhost:3000
 * Usage: node scripts/simulate-webhook-flow.mjs [email_teste]
 */
import { readFileSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { createClient } from '@supabase/supabase-js'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

// ── Configuração ──────────────────────────────────────────────────────────────
const env = Object.fromEntries(
  readFileSync(join(root, '.env.local'), 'utf8')
    .split('\n')
    .filter(l => l.includes('=') && !l.startsWith('#'))
    .map(l => { const [k, ...v] = l.split('='); return [k.trim(), v.join('=').trim()] })
)

const APP_URL     = 'http://localhost:3000'
const WEBHOOK_URL = `${APP_URL}/api/billing/webhook/kiwify?token=${env.KIWIFY_WEBHOOK_TOKEN}`
const TEST_EMAIL  = process.argv[2] ?? `test+${Date.now()}@quantum5gtest.com`
const TEST_NAME   = 'Cliente Teste NR01'

// Produto t01 do mapa (o mais barato)
const T01_PRODUCT_ID = '2a82ed80-5d26-11f1-80a8-b56772044fb0'
const T01_ORDER_ID   = `test-order-${Date.now()}`

const supabase = createClient(
  env.NEXT_PUBLIC_SUPABASE_URL,
  env.SUPABASE_SERVICE_ROLE_KEY,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

function log(emoji, msg, data = '') {
  console.log(`${emoji} ${msg}`, data ? JSON.stringify(data, null, 2) : '')
}

// ── Payload do webhook Kiwify (formato real compra_aprovada) ──────────────────
function buildWebhookPayload() {
  return {
    webhook_event_type: 'compra_aprovada',
    token: env.KIWIFY_WEBHOOK_TOKEN,
    order: {
      order_id: T01_ORDER_ID,
      order_status: 'paid',
      product: {
        product_id: T01_PRODUCT_ID,
        product_name: 'Quantum5G NR-01 · 0–5 trabalhadores',
      },
      customer: {
        email: TEST_EMAIL,
        name: TEST_NAME,
      },
      payment: {
        charge_amount: 2460.00,
      },
    },
    TrackingParameters: {
      utm_source: 'quantum5g',
      utm_medium: 'checkout',
      utm_campaign: 'nr01',
      // Sem utm_content — testa o caminho sem subscriptionRef (email lookup)
    },
    approved_date: new Date().toISOString(),
    net_amount: 2460.00,
  }
}

// ── Verifica servidor ─────────────────────────────────────────────────────────
async function checkServer() {
  try {
    const r = await fetch(`${APP_URL}/api/billing/webhook/kiwify`, { method: 'GET' })
    return r.status !== 404  // qualquer resposta serve (200, 405, etc.)
  } catch {
    return false
  }
}

// ── Consulta estado do banco ──────────────────────────────────────────────────
async function checkDbState(email) {
  const { data: profile } = await supabase
    .from('profiles')
    .select('id, email, name, role, module_nr01, module_pentagrama, is_active')
    .eq('email', email)
    .maybeSingle()

  if (!profile) return { profile: null, subscriptions: [] }

  const { data: subs } = await supabase
    .from('subscriptions')
    .select('id, product_id, plan_id, status, starts_at, expires_at, assessments_remaining, metadata')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: payments } = await supabase
    .from('payments')
    .select('id, asaas_payment_id, amount_cents, status, paid_at')
    .eq('subscription_id', subs?.[0]?.id ?? '')
    .limit(3)

  return { profile, subscriptions: subs ?? [], payments: payments ?? [] }
}

// ── Limpa dados de teste anteriores ──────────────────────────────────────────
async function cleanup(email) {
  const { data: profile } = await supabase.from('profiles').select('id').eq('email', email).maybeSingle()
  if (!profile?.id) return

  await supabase.from('payments').delete().in(
    'subscription_id',
    (await supabase.from('subscriptions').select('id').eq('user_id', profile.id)).data?.map(s => s.id) ?? []
  )
  await supabase.from('subscriptions').delete().eq('user_id', profile.id)
  await supabase.auth.admin?.deleteUser?.(profile.id).catch(() => {})
  await supabase.from('profiles').delete().eq('id', profile.id)
  log('🧹', `Dados anteriores de ${email} limpos`)
}

// ── MAIN ──────────────────────────────────────────────────────────────────────
console.log('\n╔══════════════════════════════════════════════════════╗')
console.log('║  QUANTUM5G — Simulador Webhook Kiwify End-to-End    ║')
console.log('╚══════════════════════════════════════════════════════╝\n')
console.log('Email de teste:', TEST_EMAIL)
console.log('Produto:       ', T01_PRODUCT_ID, '(t01 anual_parcelado)')
console.log('Order ID:      ', T01_ORDER_ID)
console.log('Webhook URL:   ', WEBHOOK_URL)
console.log('')

// 1. Verifica servidor
log('🔍', 'Verificando servidor Next.js em', APP_URL)
const serverOk = await checkServer()
if (!serverOk) {
  log('❌', 'Servidor não está rodando! Execute: npm run dev')
  log('💡', 'Depois rode novamente: node scripts/simulate-webhook-flow.mjs', TEST_EMAIL)
  process.exit(1)
}
log('✅', 'Servidor OK')

// 2. Limpa dados anteriores
await cleanup(TEST_EMAIL)

// 3. Estado antes
log('\n📊', 'Estado ANTES do webhook:')
const before = await checkDbState(TEST_EMAIL)
console.log('  Profile:', before.profile ?? 'não existe')
console.log('  Subscriptions:', before.subscriptions.length)

// 4. Dispara webhook
const payload = buildWebhookPayload()
log('\n🚀', 'Disparando webhook compra_aprovada...')
console.log('  Payload resumido:', {
  trigger: payload.webhook_event_type,
  order_id: payload.order.order_id,
  product_id: payload.order.product.product_id,
  email: payload.order.customer.email,
  charge_amount: payload.order.payment.charge_amount,
})

const webhookStart = Date.now()
const response = await fetch(WEBHOOK_URL, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify(payload),
})
const elapsed = Date.now() - webhookStart
const responseBody = await response.json().catch(() => response.text())
log(`${response.ok ? '✅' : '❌'}`, `Webhook respondeu em ${elapsed}ms — HTTP ${response.status}:`, responseBody)

// 5. Aguarda processamento (async DB writes)
await new Promise(r => setTimeout(r, 2000))

// 6. Estado depois
log('\n📊', 'Estado DEPOIS do webhook:')
const after = await checkDbState(TEST_EMAIL)

if (after.profile) {
  console.log('\n  ── Profile ──────────────────────────────────')
  console.log(`  email          : ${after.profile.email}`)
  console.log(`  name           : ${after.profile.name}`)
  console.log(`  role           : ${after.profile.role}`)
  console.log(`  module_nr01    : ${after.profile.module_nr01}   ${after.profile.module_nr01 ? '✅' : '❌'}`)
  console.log(`  module_penta   : ${after.profile.module_pentagrama}   ${after.profile.module_pentagrama ? '✅' : '❌'}`)
  console.log(`  is_active      : ${after.profile.is_active}    ${after.profile.is_active ? '✅' : '❌'}`)
} else {
  console.log('  ❌ Profile não criado')
}

if (after.subscriptions.length > 0) {
  const sub = after.subscriptions[0]
  console.log('\n  ── Subscription ─────────────────────────────')
  console.log(`  id             : ${sub.id}`)
  console.log(`  product_id     : ${sub.product_id}`)
  console.log(`  plan_id        : ${sub.plan_id}`)
  console.log(`  status         : ${sub.status}   ${sub.status === 'active' ? '✅' : '❌'}`)
  console.log(`  starts_at      : ${sub.starts_at}`)
  console.log(`  expires_at     : ${sub.expires_at}`)
  console.log(`  assessments    : ${sub.assessments_remaining}`)
  console.log(`  gateway        : ${sub.metadata?.gateway}`)
} else {
  console.log('\n  ❌ Nenhuma subscription criada')
}

if (after.payments.length > 0) {
  const pay = after.payments[0]
  console.log('\n  ── Payment ───────────────────────────────────')
  console.log(`  asaas_id       : ${pay.asaas_payment_id}`)
  console.log(`  amount         : R$${(pay.amount_cents/100).toFixed(2)}`)
  console.log(`  status         : ${pay.status}`)
}

// 7. Resultado final
const success =
  after.profile?.module_nr01 === true &&
  after.subscriptions[0]?.status === 'active' &&
  after.profile?.role === 'contratante'

console.log('\n╔══════════════════════════════════════════════════════╗')
if (success) {
  console.log('║  ✅ FLUXO COMPLETO — SISTEMA PRONTO PARA PRODUÇÃO   ║')
} else {
  console.log('║  ❌ FLUXO FALHOU — VERIFIQUE OS DETALHES ACIMA      ║')
}
console.log('╚══════════════════════════════════════════════════════╝\n')

if (success) {
  console.log('🎯 Próximo passo (requer interação humana):')
  console.log(`   1. Abra o email ${TEST_EMAIL} (ou verifique o Resend dashboard)`)
  console.log('   2. Clique no link "Ativar acesso"')
  console.log('   3. Defina uma senha')
  console.log('   4. Confirme o redirect para /nr01/dashboard')
  console.log('')
  console.log('   Ou acesse diretamente: http://localhost:3000/login')
}
