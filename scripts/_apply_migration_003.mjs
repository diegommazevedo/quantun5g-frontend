import pg from 'pg'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const { Client } = pg
const __dirname = path.dirname(fileURLToPath(import.meta.url))
const migrationsDir = path.join(__dirname, '..', 'supabase', 'migrations')

const client = new Client({
  connectionString: 'postgresql://postgres:Bio@44502000@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres',
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 20000,
})

await client.connect()
console.log('Conectado ao banco.')

// 1. Verificar se consultant_id já é nullable em org_accounts
const check = await client.query(
  `SELECT is_nullable FROM information_schema.columns WHERE table_name='org_accounts' AND column_name='consultant_id'`
)
const isNullable = check.rows[0]?.is_nullable === 'YES'
console.log('org_accounts.consultant_id nullable?', isNullable)

if (!isNullable) {
  console.log('Aplicando migration 000001...')
  const sql001 = fs.readFileSync(path.join(migrationsDir, '20260628000001_org_accounts_consultant_nullable.sql'), 'utf8')
  await client.query(sql001)
  console.log('Migration 000001 OK.')
} else {
  console.log('Migration 000001 já aplicada (coluna já é nullable).')
}

// 2. Migration 000002 é vazia (apenas documenta decisão), skip.
console.log('Migration 000002: sem DDL, skip.')

await client.end()
console.log('Pronto.')
