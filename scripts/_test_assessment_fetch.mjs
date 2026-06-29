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
const select = `*,
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )`

const { data: org } = await admin.from('org_accounts').select('id').eq('owner_user_id', userId).maybeSingle()
const { data: cos } = await admin.from('companies').select('id').eq('org_account_id', org.id)
const ids = (cos ?? []).map((c) => c.id)

const r1 = await admin.from('nr01_assessments').select(select).eq('id', assessmentId).in('company_id', ids).maybeSingle()
console.log('with in():', Boolean(r1.data), r1.error?.message ?? 'ok')

const r2 = await admin.from('nr01_assessments').select(select).eq('id', assessmentId).maybeSingle()
console.log('without in():', Boolean(r2.data), r2.error?.message ?? 'ok')

const { data: profile } = await admin.from('profiles').select('role').eq('id', userId).single()
console.log('profile role:', profile?.role)
