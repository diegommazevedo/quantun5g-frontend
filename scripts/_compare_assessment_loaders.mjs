import { readFile } from 'node:fs/promises'
import { createClient } from '@supabase/supabase-js'

const envText = await readFile('.env.local', 'utf8')
const env = Object.fromEntries(
  envText.split('\n').filter((l) => l.includes('=') && !l.trim().startsWith('#')).map((l) => {
    const i = l.indexOf('=')
    return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
  }),
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)

const orgId = '6292eca3-7eaa-4270-a5ad-807caa17afd9'
const gerenciaId = 'd88d61f8-19e2-4450-abb0-e43860fffa4b'

const { data: org } = await admin.from('org_accounts').select('id').eq('owner_user_id', gerenciaId).single()
const { data: cos } = await admin.from('companies').select('id').eq('org_account_id', org.id)
const ids = cos.map((c) => c.id)

const { data: assessments } = await admin.from('nr01_assessments').select('id, name, company_id').in('company_id', ids)

const select = `
      *,
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )
    `

function innerSelect(s) {
  return s.replace(
    'companies:companies!nr01_assessments_company_id_fkey (',
    'companies:companies!nr01_assessments_company_id_fkey!inner (',
  )
}

console.log('Assessments in org:', assessments?.length)
for (const a of assessments ?? []) {
  const r1 = await admin.from('nr01_assessments').select('id').eq('id', a.id).in('company_id', ids).maybeSingle()
  const r2 = await admin
    .from('nr01_assessments')
    .select(innerSelect(select))
    .eq('id', a.id)
    .eq('companies.org_account_id', orgId)
    .maybeSingle()
  console.log('\n', a.name, a.id.slice(0, 8))
  console.log('  IN company_ids:', Boolean(r1.data), r1.error?.message)
  console.log('  inner join org:', Boolean(r2.data), r2.error?.message)
  if (r2.error) console.log('  error details:', r2.error)
}
