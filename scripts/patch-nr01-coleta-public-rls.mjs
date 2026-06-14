/**
 * RLS: leitura pública de avaliações em COLETANDO (link /nr01/coleta/{token}).
 * node --env-file=.env.local scripts/patch-nr01-coleta-public-rls.mjs
 */

import pg from 'pg'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const sql = `
DROP POLICY IF EXISTS nr01_assessments_select_public_coleta ON nr01_assessments;
DROP POLICY IF EXISTS "nr01_assessments_select_public_coleta" ON nr01_assessments;
CREATE POLICY nr01_assessments_select_public_coleta ON nr01_assessments
  FOR SELECT USING (
    status = 'COLETANDO'
    AND nr01_assessment_open_for_collection(id)
  );
GRANT SELECT ON nr01_assessments TO anon;
NOTIFY pgrst, 'reload schema';
`

async function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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
const password = env.SUPABASE_DB_PASSWORD
const dbUrl =
  env.DATABASE_URL ||
  `postgresql://postgres:${encodeURIComponent(password)}@db.ikielkwgixbdzrwixtos.supabase.co:5432/postgres`

const client = new pg.Client({ connectionString: dbUrl, ssl: { rejectUnauthorized: false } })
await client.connect()
await client.query(sql)
console.log('OK nr01_assessments_select_public_coleta aplicada')
await client.end()
