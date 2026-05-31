/**
 * db push → pentaClaude (ikielkwgixbdzrwixtos)
 * Usa SUPABASE_DB_PASSWORD do .env.local (senha com @ funciona via URL encode).
 */

import { readFileSync, existsSync, mkdirSync, writeFileSync } from 'fs'
import { spawnSync } from 'child_process'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const envPath = join(root, '.env.local')
const projectRef = 'ikielkwgixbdzrwixtos'

function loadEnvLocal() {
  if (!existsSync(envPath)) return
  for (const line of readFileSync(envPath, 'utf8').split('\n')) {
    const t = line.trim()
    if (!t || t.startsWith('#')) continue
    const i = t.indexOf('=')
    if (i <= 0) continue
    const key = t.slice(0, i).trim()
    let val = t.slice(i + 1).trim()
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
      val = val.slice(1, -1)
    }
    if (!process.env[key]) process.env[key] = val
  }
}

loadEnvLocal()

const password = process.env.SUPABASE_DB_PASSWORD
if (!password) {
  console.error('Falta SUPABASE_DB_PASSWORD no .env.local')
  process.exit(1)
}

process.env.DATABASE_URL =
  process.env.DATABASE_URL ??
  `postgresql://postgres:${encodeURIComponent(password)}@db.${projectRef}.supabase.co:5432/postgres`

console.log(`==> Aplicando schema catch-up (${projectRef})`)
const apply = spawnSync('node', ['scripts/apply-pending-migrations.mjs'], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: true,
})

if (apply.status !== 0) process.exit(apply.status ?? 1)

console.log('==> supabase db push (migrations incrementais)')
const tempDir = join(root, 'supabase', '.temp')
mkdirSync(tempDir, { recursive: true })
writeFileSync(join(tempDir, 'project-ref'), `${projectRef}\n`)

const dbUrl = process.env.DATABASE_URL
const push = spawnSync('supabase', ['db', 'push', '--yes', '--db-url', dbUrl], {
  cwd: root,
  env: process.env,
  stdio: 'inherit',
  shell: true,
})

if (push.status !== 0) {
  console.warn('db push retornou erro (catch-up principal já aplicado). Continuando verificação...')
}

console.log('==> verificando schema...')
const verify = spawnSync('node', ['--env-file=.env.local', 'scripts/verify-db-schema.mjs'], {
  cwd: root,
  stdio: 'inherit',
  shell: true,
})

process.exit(verify.status ?? 0)
