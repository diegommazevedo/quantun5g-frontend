/**
 * Subset SQL quando pg_dump não está no PATH.
 * node --env-file=.env.local scripts/backup-db-subset.mjs <outDir>
 */

import { writeFileSync } from 'fs'
import pg from 'pg'

const outDir = process.argv[2]
const password = process.env.SUPABASE_DB_PASSWORD
const dbUrl =
  process.env.DATABASE_URL ||
  (password
    ? `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`
    : null)

if (!dbUrl || !outDir) {
  console.error('DATABASE_URL/SUPABASE_DB_PASSWORD e outDir obrigatórios')
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()

const tables = [
  'profiles',
  'companies',
  'commercial_invoices',
  'subscriptions',
  'diagnostics',
  'nr01_assessments',
  'hybrid_reports',
]

const lines = [`-- backup ${new Date().toISOString()}`, '']
for (const t of tables) {
  const reg = await client.query(`SELECT to_regclass('public.${t}') AS r`)
  if (!reg.rows[0]?.r) continue
  const cols = await client.query(
    `SELECT column_name FROM information_schema.columns WHERE table_schema='public' AND table_name=$1 ORDER BY ordinal_position`,
    [t],
  )
  const colList = cols.rows.map((r) => r.column_name).join(', ')
  const { rows } = await client.query(`SELECT * FROM public.${t}`)
  lines.push(`-- ${t}: ${rows.length} rows`)
  for (const row of rows) {
    const vals = cols.rows
      .map((c) => {
        const v = row[c.column_name]
        if (v === null) return 'NULL'
        if (typeof v === 'number') return String(v)
        if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE'
        if (v instanceof Date) return `'${v.toISOString()}'`
        if (typeof v === 'object') return `'${JSON.stringify(v).replace(/'/g, "''")}'`
        return `'${String(v).replace(/'/g, "''")}'`
      })
      .join(', ')
    lines.push(`INSERT INTO public.${t} (${colList}) VALUES (${vals});`)
  }
  lines.push('')
}

writeFileSync(`${outDir}/schema_tables.sql`, lines.join('\n'), 'utf8')
await client.end()
console.log('OK schema_tables.sql')
