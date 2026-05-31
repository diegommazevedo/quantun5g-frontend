/**
 * Sincroniza variáveis de produção Resend/webhook a partir de .env.local.
 * Uso: node scripts/sync-vercel-production-env.mjs
 */

import { readFileSync } from 'node:fs'
import { spawnSync } from 'node:child_process'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')

function parseEnv(path) {
  const out = {}
  for (const line of readFileSync(path, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i < 0) continue
    let v = t.slice(i + 1).trim()
    if (
      (v.startsWith('"') && v.endsWith('"')) ||
      (v.startsWith("'") && v.endsWith("'"))
    ) {
      v = v.slice(1, -1)
    }
    out[t.slice(0, i).trim()] = v
  }
  return out
}

const local = parseEnv(join(root, '.env.local'))

/** Produção: URL pública; demais chaves vêm do .env.local local. */
const KEYS = [
  'NEXT_PUBLIC_APP_URL',
  'ASAAS_API_KEY',
  'ASAAS_API_BASE',
  'ASAAS_WEBHOOK_TOKEN',
  'BILLING_PROVIDER',
  'KIWIFY_CLIENT_ID',
  'KIWIFY_CLIENT_SECRET',
  'KIWIFY_CLIENT_SECRET_API_KEY',
  'KIWIFY_ACCOUNT_ID',
  'KIWIFY_WEBHOOK_TOKEN',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'QUANTUM_EMAIL_FROM',
  'PENTAGRAMA_EMAIL_FROM',
  'NR01_EMAIL_FROM',
  'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
  'NEXT_PUBLIC_JOVANE_CRP',
]

const OVERRIDES = {
  NEXT_PUBLIC_APP_URL: 'https://www.quantun5g.app',
}

const SENSITIVE = new Set([
  'ASAAS_API_KEY',
  'ASAAS_WEBHOOK_TOKEN',
  'KIWIFY_CLIENT_SECRET',
  'KIWIFY_CLIENT_SECRET_API_KEY',
  'KIWIFY_WEBHOOK_TOKEN',
  'RESEND_API_KEY',
  'RESEND_WEBHOOK_SECRET',
  'LEAD_HMAC_SECRET',
  'SUPABASE_SERVICE_ROLE_KEY',
])

console.log('Quantum5G — sync env → Vercel Production\n')

for (const key of KEYS) {
  let value = OVERRIDES[key] ?? local[key]?.trim()
  if (!value && key === 'KIWIFY_CLIENT_SECRET') {
    value = local.KIWIFY_CLIENT_SECRET_API_KEY?.trim()
  }
  if (!value) {
    console.warn(`⚠ skip ${key} (ausente)`)
    continue
  }

  const args = ['vercel', 'env', 'add', key, 'production', '--force', '--yes']
  if (SENSITIVE.has(key)) args.push('--sensitive')

  const cmd = process.platform === 'win32' ? 'npx.cmd' : 'npx'
  const result = spawnSync(cmd, args, {
    cwd: root,
    input: value,
    stdio: ['pipe', 'pipe', 'pipe'],
    shell: process.platform === 'win32',
  })

  if (result.status !== 0) {
    const msg = result.stderr?.toString() || result.stdout?.toString() || 'falha'
    console.error(`✗ ${key}: ${msg.trim()}`)
    process.exitCode = 1
    continue
  }

  console.log(`✓ ${key}`)
}

console.log('\nConcluído. Rode redeploy: npx vercel deploy --prod --yes')
