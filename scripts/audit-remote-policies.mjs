import pg from 'pg'

const password = process.env.SUPABASE_DB_PASSWORD
const dbUrl =
  process.env.DATABASE_URL ||
  (password
    ? `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`
    : null)

if (!dbUrl) {
  console.error('Defina DATABASE_URL ou SUPABASE_DB_PASSWORD')
  process.exit(1)
}

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()

const policies = await client.query(
  `SELECT policyname, cmd FROM pg_policies WHERE tablename = 'companies' ORDER BY policyname`,
)
console.log('Policies em companies:')
for (const row of policies.rows) console.log(`  - ${row.policyname} (${row.cmd})`)

const recent = await client.query(
  `SELECT created_at, name, consultant_id::text, account_user_id::text
   FROM companies WHERE created_at > '2026-06-01T00:00:00Z' ORDER BY created_at DESC`,
)
console.log('\nEmpresas criadas após 01/06/2026:', recent.rows.length)
for (const r of recent.rows) console.log(`  ${r.created_at.toISOString().slice(0, 19)} ${r.name}`)

await client.end()
