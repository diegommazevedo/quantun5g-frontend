/**
 * Aplica supabase/apply-pending-remote.sql via conexão Postgres direta.
 *
 * Pré-requisito em .env.local:
 *   DATABASE_URL=postgresql://postgres:SENHA@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres
 *
 * Uso: node --env-file=.env.local scripts/apply-pending-migrations.mjs
 */

import { readFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'
import pg from 'pg'

const { Client } = pg
const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const sqlPath = join(root, 'supabase', 'apply-pending-remote.sql')

const url = process.env.DATABASE_URL
if (!url) {
  console.error('Defina DATABASE_URL no .env.local (Settings → Database → connection string).')
  process.exit(1)
}

const sql = readFileSync(sqlPath, 'utf8')
const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } })

try {
  await client.connect()
  console.log('Conectado. Aplicando catch-up...')
  await client.query(sql)
  console.log('OK — schema atualizado. NOTIFY pgrst enviado.')

  const checks = [
    "SELECT column_name FROM information_schema.columns WHERE table_name='companies' AND column_name='cnpj'",
    "SELECT to_regclass('public.company_contacts') AS company_contacts",
    "SELECT column_name FROM information_schema.columns WHERE table_name='profiles' AND column_name='module_nr01'",
  ]
  for (const q of checks) {
    const { rows } = await client.query(q)
    console.log(q.split("'")[1] ?? q, '→', rows[0] ?? rows)
  }
} catch (err) {
  console.error('Falha:', err.message)
  process.exit(1)
} finally {
  await client.end()
}
