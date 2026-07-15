/**
 * Auditoria pré-deploy — billing Kiwify + provisionamento.
 * Uso: node --env-file=.env.local scripts/pre-deploy-kiwify-audit.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const failures = []
const warnings = []
const passed = []

function fail(msg) {
  failures.push(msg)
}
function warn(msg) {
  warnings.push(msg)
}
function ok(msg) {
  passed.push(msg)
}

function loadEnv() {
  const path = join(root, '.env.local')
  if (!existsSync(path)) return {}
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    out[t.slice(0, i).trim()] = t.slice(i + 1).trim()
  }
  return out
}

const env = loadEnv()
const base = (env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')

console.log('==> Pré-deploy audit — Kiwify billing\n')

// 1. Segurança: test mode bloqueado em produção
if (env.KIWIFY_TEST_MODE === 'true') {
  warn('KIWIFY_TEST_MODE=true no .env.local — OK para dev, NUNCA na Vercel Production')
} else {
  ok('KIWIFY_TEST_MODE ausente ou false localmente')
}

// 2. Billing provider
if (env.BILLING_PROVIDER === 'kiwify') {
  ok('BILLING_PROVIDER=kiwify configurado localmente')
} else {
  warn(`BILLING_PROVIDER=${env.BILLING_PROVIDER ?? '(ausente)'} — produção deve ser kiwify`)
}

// 3. Credenciais obrigatórias
const clientSecret = env.KIWIFY_CLIENT_SECRET?.trim() ?? env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
if (env.KIWIFY_CLIENT_ID?.trim()) ok('KIWIFY_CLIENT_ID presente')
else fail('KIWIFY_CLIENT_ID ausente')
if (clientSecret) ok('KIWIFY_CLIENT_SECRET presente')
else fail('KIWIFY_CLIENT_SECRET ausente')
if (env.KIWIFY_ACCOUNT_ID?.trim()) ok('KIWIFY_ACCOUNT_ID presente')
else fail('KIWIFY_ACCOUNT_ID ausente')
if (env.KIWIFY_WEBHOOK_TOKEN?.trim()) ok('KIWIFY_WEBHOOK_TOKEN presente')
else fail('KIWIFY_WEBHOOK_TOKEN ausente')

// 4. Product map
const mapPath = join(root, 'config', 'kiwify-nr01-product-map.json')
if (existsSync(mapPath)) {
  const map = JSON.parse(readFileSync(mapPath, 'utf8'))
  const entries = map.entries ?? []
  const ready = entries.filter((e) => e.checkout_url?.trim() && e.kiwify_product_id?.trim()).length
  if (ready >= 30) ok(`Product map: ${ready}/${entries.length} SKUs`)
  else fail(`Product map incompleto: ${ready}/${entries.length}`)
} else {
  fail('config/kiwify-nr01-product-map.json ausente')
}

// 5. Arquivos críticos
const requiredFiles = [
  'src/lib/billing/kiwify-provision.ts',
  'src/lib/billing/provision-company-from-kiwify.ts',
  'src/lib/billing/kiwify-provision-helpers.ts',
  'src/app/api/billing/webhook/kiwify/route.ts',
]
for (const f of requiredFiles) {
  if (existsSync(join(root, f))) ok(`Arquivo: ${f}`)
  else fail(`Arquivo ausente: ${f}`)
}

// 6. OAuth + webhooks API
try {
  const clientId = env.KIWIFY_CLIENT_ID?.trim()
  const clientSecret =
    env.KIWIFY_CLIENT_SECRET?.trim() ?? env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
  const accountId = env.KIWIFY_ACCOUNT_ID?.trim()

  const oauthRes = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: clientId, client_secret: clientSecret }),
  })
  if (!oauthRes.ok) throw new Error(`OAuth ${oauthRes.status}`)
  const oauth = await oauthRes.json()
  const token = oauth.access_token
  ok('OAuth Kiwify OK')

  const hooksRes = await fetch(`${base}/webhooks?page_number=1&page_size=10`, {
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': accountId,
      Accept: 'application/json',
    },
  })
  const hooks = await hooksRes.json()
  const list = hooks.data ?? []
  const prodHook = list.find((h) => h.url?.includes('quantun5g.app/api/billing/webhook/kiwify'))
  if (prodHook) {
    ok(`Webhook produção registrado: ${prodHook.name}`)
    const hasApproved = (prodHook.triggers ?? []).includes('compra_aprovada')
    if (hasApproved) ok('Trigger compra_aprovada configurado')
    else fail('Webhook sem trigger compra_aprovada')
  } else {
    fail('Webhook produção não encontrado na API Kiwify')
  }
} catch (e) {
  fail(`API Kiwify: ${e.message}`)
}

// 7. Probe produção
try {
  const prodUrl = `https://www.quantun5g.app/api/billing/webhook/kiwify?token=${encodeURIComponent(env.KIWIFY_WEBHOOK_TOKEN ?? '')}`
  const res = await fetch(prodUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (res.status === 200) ok('Webhook produção responde HTTP 200')
  else warn(`Webhook produção HTTP ${res.status}`)
} catch (e) {
  fail(`Probe produção falhou: ${e.message}`)
}

// 8. Resend (convites)
if (env.RESEND_API_KEY?.startsWith('re_')) ok('RESEND_API_KEY configurado')
else warn('RESEND_API_KEY ausente — convites podem falhar em produção')

console.log('\n── Resultado ──')
for (const p of passed) console.log(`  ✓ ${p}`)
for (const w of warnings) console.log(`  ⚠ ${w}`)
for (const f of failures) console.log(`  ✗ ${f}`)

console.log(`\n${failures.length === 0 ? '✅ AUDIT OK — pronto para deploy' : '❌ AUDIT FALHOU — corrigir antes do deploy'}`)
process.exit(failures.length ? 1 : 0)
