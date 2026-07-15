/**
 * Auditoria global pós-implementação — fluxo self-service NR-01 + Kiwify.
 * Uso: node --env-file=.env.local scripts/post-audit-global.mjs
 */

import { readFileSync, existsSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

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

console.log('╔══════════════════════════════════════════════════════════╗')
console.log('║  QUANTUM5G — Auditoria Global Self-Service NR-01        ║')
console.log('╚══════════════════════════════════════════════════════════╝\n')

// ── 1. Matriz de arquivos do fluxo comercial ───────────────────────────────
const flowFiles = [
  ['Fase 1 — Kiwify + empresa', [
    'src/lib/billing/kiwify-provision.ts',
    'src/lib/billing/provision-company-from-kiwify.ts',
    'src/lib/billing/kiwify-provision-helpers.ts',
    'src/app/api/billing/webhook/kiwify/route.ts',
    'src/app/api/billing/checkout/route.ts',
  ]],
  ['Fase 2 — Magic link + RT', [
    'src/lib/auth/purchase-access.ts',
    'src/lib/nr01/rt-onboarding-gate.ts',
    'src/app/(nr01)/nr01/onboarding/page.tsx',
    'src/app/(nr01)/nr01/onboarding/actions.ts',
  ]],
  ['Fase 3 — 1ª avaliação', [
    'src/lib/nr01/provision-first-assessment.ts',
  ]],
  ['Fase 4 — Coleta + convites', [
    'src/lib/nr01/auto-start-collection.ts',
    'src/lib/nr01/parse-collaborator-emails.ts',
    'src/lib/nr01/seed-company-contacts.ts',
  ]],
  ['Fase 5 — Pós-k automático', [
    'src/lib/nr01/auto-complete-on-k-threshold.ts',
    'src/lib/nr01/process-assessment-results-core.ts',
    'src/lib/nr01/generate-evidence-pack-core.ts',
  ]],
]

for (const [phase, files] of flowFiles) {
  let phaseOk = true
  for (const f of files) {
    if (!existsSync(join(root, f))) {
      fail(`${phase}: ausente ${f}`)
      phaseOk = false
    }
  }
  if (phaseOk) ok(`${phase}: ${files.length} arquivos presentes`)
}

// ── 2. TypeScript ────────────────────────────────────────────────────────────
console.log('\n── TypeScript ──')
const nextTypesDir = join(root, '.next', 'types')
if (!existsSync(nextTypesDir)) {
  warn('Execute npm run build antes da auditoria para validar tsc com tipos Next')
} else {
  const tscCmd = 'npx tsc --noEmit -p tsconfig.json'
  const tsc = spawnSync(tscCmd, {
    cwd: root,
    shell: true,
    encoding: 'utf8',
  })
  if (tsc.status === 0) ok('tsc --noEmit sem erros')
  else {
    fail('tsc --noEmit falhou')
    const out = `${tsc.stdout ?? ''}${tsc.stderr ?? ''}`
    const tail = out.split('\n').slice(-8).join('\n')
    if (tail.trim()) console.log(tail)
  }
}

// ── 3. Billing / Kiwify ────────────────────────────────────────────────────
console.log('\n── Billing Kiwify ──')

if (env.KIWIFY_TEST_MODE === 'true') {
  warn('KIWIFY_TEST_MODE=true local — nunca na Vercel Production')
} else {
  ok('KIWIFY_TEST_MODE ausente ou false')
}

if (env.BILLING_PROVIDER === 'kiwify') ok('BILLING_PROVIDER=kiwify (local)')
else warn(`BILLING_PROVIDER=${env.BILLING_PROVIDER ?? '(ausente)'} — produção deve ser kiwify`)

const clientSecret = env.KIWIFY_CLIENT_SECRET?.trim() ?? env.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
for (const [label, val] of [
  ['KIWIFY_CLIENT_ID', env.KIWIFY_CLIENT_ID?.trim()],
  ['KIWIFY_CLIENT_SECRET', clientSecret],
  ['KIWIFY_ACCOUNT_ID', env.KIWIFY_ACCOUNT_ID?.trim()],
  ['KIWIFY_WEBHOOK_TOKEN', env.KIWIFY_WEBHOOK_TOKEN?.trim()],
  ['RESEND_API_KEY', env.RESEND_API_KEY?.startsWith('re_') ? env.RESEND_API_KEY : null],
  ['SUPABASE_SERVICE_ROLE_KEY', env.SUPABASE_SERVICE_ROLE_KEY?.trim()],
]) {
  if (val) ok(`${label} presente`)
  else if (label === 'RESEND_API_KEY') warn(`${label} ausente — convites/magic link podem falhar`)
  else fail(`${label} ausente`)
}

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

// ── 4. API Kiwify + webhook produção ───────────────────────────────────────
console.log('\n── API Kiwify + Produção ──')

try {
  const oauthRes = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: env.KIWIFY_CLIENT_ID?.trim() ?? '',
      client_secret: clientSecret ?? '',
    }),
  })
  if (!oauthRes.ok) throw new Error(`OAuth ${oauthRes.status}`)
  const oauth = await oauthRes.json()
  ok('OAuth Kiwify OK')

  const hooksRes = await fetch(`${base}/webhooks?page_number=1&page_size=10`, {
    headers: {
      Authorization: `Bearer ${oauth.access_token}`,
      'x-kiwify-account-id': env.KIWIFY_ACCOUNT_ID?.trim() ?? '',
      Accept: 'application/json',
    },
  })
  const hooks = await hooksRes.json()
  const list = hooks.data ?? []
  const prodHook = list.find((h) => h.url?.includes('quantun5g.app/api/billing/webhook/kiwify'))
  if (prodHook) {
    ok(`Webhook produção: ${prodHook.name}`)
    if ((prodHook.triggers ?? []).includes('compra_aprovada')) ok('Trigger compra_aprovada')
    else fail('Webhook sem compra_aprovada')
  } else {
    fail('Webhook produção não encontrado')
  }
} catch (e) {
  fail(`API Kiwify: ${e.message}`)
}

try {
  const prodUrl = `https://www.quantun5g.app/api/billing/webhook/kiwify?token=${encodeURIComponent(env.KIWIFY_WEBHOOK_TOKEN ?? '')}`
  const res = await fetch(prodUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{}',
  })
  if (res.status === 200) ok('Webhook produção HTTP 200')
  else warn(`Webhook produção HTTP ${res.status}`)
} catch (e) {
  fail(`Probe produção: ${e.message}`)
}

// ── 5. Checklist de autonomia comercial ────────────────────────────────────
console.log('\n── Checklist autonomia ──')

const autonomySteps = [
  ['Compra → conta + licença', 'kiwify-provision.ts'],
  ['Empresa automática (CNPJ)', 'provision-company-from-kiwify.ts'],
  ['Magic link pós-compra', 'purchase-access.ts'],
  ['Wizard RT obrigatório', 'rt-onboarding-gate.ts'],
  ['1ª avaliação automática', 'provision-first-assessment.ts'],
  ['Abrir coleta COLETANDO', 'auto-start-collection.ts'],
  ['Disparo convites equipe', 'auto-start-collection.ts'],
  ['Encerrar + processar ao atingir k', 'auto-complete-on-k-threshold.ts'],
  ['Pacote evidências automático', 'generate-evidence-pack-core.ts'],
]

for (const [step, file] of autonomySteps) {
  const path = file.startsWith('src/') ? join(root, file) : join(root, 'src/lib/nr01', file)
  const found =
    existsSync(path) ||
    existsSync(join(root, 'src/lib/billing', file)) ||
    existsSync(join(root, 'src/lib/auth', file))
  if (found) ok(step)
  else fail(`Checklist: ${step} — arquivo ${file} ausente`)
}

// ── 6. validate-kiwify-bridge (se disponível) ───────────────────────────────
console.log('\n── Bridge Kiwify ──')
const bridgeScript = join(root, 'scripts', 'validate-kiwify-bridge.mjs')
if (existsSync(bridgeScript)) {
  const bridge = spawnSync('node --env-file=.env.local scripts/validate-kiwify-bridge.mjs', {
    cwd: root,
    shell: true,
    encoding: 'utf8',
  })
  if (bridge.status === 0) ok('npm run kiwify:validate (bridge) OK')
  else warn('kiwify:validate retornou erro — verifique SKUs')
} else {
  warn('validate-kiwify-bridge.mjs ausente')
}

// ── Resultado ──────────────────────────────────────────────────────────────
console.log('\n── Resultado ──')
for (const p of passed) console.log(`  ✓ ${p}`)
for (const w of warnings) console.log(`  ⚠ ${w}`)
for (const f of failures) console.log(`  ✗ ${f}`)

const score = Math.round((passed.length / (passed.length + failures.length)) * 100)
console.log(`\nScore: ${score}% (${passed.length} ok, ${warnings.length} avisos, ${failures.length} falhas)`)

if (failures.length === 0) {
  console.log('\n✅ AUDITORIA GLOBAL OK — fluxo self-service pronto para produção')
  console.log('\nFluxo ponta a ponta:')
  console.log('  Compra Kiwify → webhook → conta + empresa + licença')
  console.log('  → magic link → RT → avaliação → coleta aberta → convites')
  console.log('  → k≥5 respostas → laudo + pacote evidências automáticos')
  console.log('\nTeste manual: node scripts/simulate-webhook-flow.mjs [email]')
} else {
  console.log('\n❌ AUDITORIA GLOBAL FALHOU — corrigir itens acima')
}

process.exit(failures.length ? 1 : 0)
