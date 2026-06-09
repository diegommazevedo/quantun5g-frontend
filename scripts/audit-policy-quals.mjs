import pg from 'pg'

const password = process.env.SUPABASE_DB_PASSWORD
const dbUrl =
  process.env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
const r = await client.query(
  `SELECT policyname, cmd, qual::text, with_check::text FROM pg_policies WHERE tablename = 'companies'`,
)
for (const row of r.rows) {
  console.log('\n' + row.policyname, '(' + row.cmd + ')')
  if (row.qual) console.log('  USING:', row.qual)
  if (row.with_check) console.log('  CHECK:', row.with_check)
}
await client.end()
