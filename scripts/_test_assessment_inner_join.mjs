import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const envText = await readFile('.env.local', 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const userId = 'd88d61f8-19e2-4450-abb0-e43860fffa4b'
const assessmentId = '4904fd54-ac74-4a14-a11b-a585ded7a472'
const orgId = '6292eca3-7eaa-4270-a5ad-807caa17afd9'

const select = `*, companies!inner(id, name, org_account_id, total_collaborators, technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email)`

const { data, error } = await admin
  .from('nr01_assessments')
  .select(select)
  .eq('id', assessmentId)
  .eq('companies.org_account_id', orgId)
  .maybeSingle()

console.log('inner join:', Boolean(data), data?.name, error?.message ?? 'ok')
