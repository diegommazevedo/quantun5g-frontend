/**
 * Aplica policy de SELECT para líder ver empresas por account_user_id.
 * node --env-file=.env.local scripts/patch-leader-companies-rls.mjs
 */

import pg from 'pg'

const password = process.env.SUPABASE_DB_PASSWORD
const dbUrl =
  process.env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const sql = `
DROP POLICY IF EXISTS companies_select_leader ON companies;
CREATE POLICY companies_select_leader ON companies
  FOR SELECT USING (
    auth_role() = 'leader'
    AND account_user_id = auth.uid()
  );
NOTIFY pgrst, 'reload schema';
`

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query(sql)
console.log('OK companies_select_leader aplicada')
await client.end()
