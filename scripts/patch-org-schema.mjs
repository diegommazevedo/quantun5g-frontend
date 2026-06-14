/**
 * Aplica migration org_accounts + setup Pasola.
 * node --env-file=.env.local scripts/patch-org-schema.mjs
 */

import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const migration = await readFile(
  join(root, 'supabase/migrations/20260615000000_org_accounts_members.sql'),
  'utf-8',
)

async function loadEnv() {
  const env = {}
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return env
}

const env = await loadEnv()
const dbUrl =
  env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(env.SUPABASE_DB_PASSWORD)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query(migration)
console.log('OK org schema aplicado')
await client.end()
