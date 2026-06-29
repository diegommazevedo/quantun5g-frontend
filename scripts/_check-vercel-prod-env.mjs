/**
 * Verifica variáveis críticas em produção via probes HTTP (sem expor segredos).
 */
import fs from 'fs'

function loadLocalEnv() {
  const raw = fs.readFileSync('.env.local', 'utf8')
  const out = {}
  for (const line of raw.split('\n')) {
    const m = line.match(/^([A-Z0-9_]+)=(.*)$/)
    if (m) out[m[1]] = m[2].trim()
  }
  return out
}

const local = loadLocalEnv()
const base = 'https://www.quantun5g.app'

async function probe(name, url, init = {}) {
  const res = await fetch(url, init)
  const text = await res.text().catch(() => '')
  return { name, status: res.status, body: text.slice(0, 120) }
}

const token = local.KIWIFY_WEBHOOK_TOKEN
const cronSecret = local.CRON_SECRET

const results = []

results.push(
  await probe(
    'webhook_token_local_match',
    `${base}/api/billing/webhook/kiwify?token=${encodeURIComponent(token ?? '')}`,
    { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' },
  ),
)

if (cronSecret) {
  results.push(
    await probe(
      'cron_with_local_secret',
      `${base}/api/cron/expire-subscriptions`,
      { headers: { Authorization: `Bearer ${cronSecret}` } },
    ),
  )
}

for (const r of results) {
  console.log(`${r.name}: HTTP ${r.status} — ${r.body}`)
}

console.log('\n--- Vercel env list (presença) ---')
console.log('BILLING_PROVIDER: ausente na listagem Vercel (default código = asaas)')
console.log('CRON_SECRET: ausente na listagem Vercel')
console.log('KIWIFY_TEST_MODE: ausente na listagem Vercel (OK se ausente)')
console.log('KIWIFY_WEBHOOK_TOKEN: presente na listagem Vercel (Encrypted)')
