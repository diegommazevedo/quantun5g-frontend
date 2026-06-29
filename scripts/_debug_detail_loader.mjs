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

const gerenciaId = 'd88d61f8-19e2-4450-abb0-e43860fffa4b'
const orgId = '6292eca3-7eaa-4270-a5ad-807caa17afd9'

const { data: cos } = await admin.from('companies').select('id').eq('org_account_id', orgId)
const ids = (cos ?? []).map((c) => c.id)
const { data: assessments } = await admin
  .from('nr01_assessments')
  .select('id, name, company_id, consultant_id')
  .in('company_id', ids)
  .order('created_at', { ascending: false })

const select = `
      *,
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )
    `
const inner = select.replace(
  'companies:companies!nr01_assessments_company_id_fkey (',
  'companies:companies!nr01_assessments_company_id_fkey!inner (',
)

console.log('Profile gerencia:', (await admin.from('profiles').select('role').eq('id', gerenciaId).single()).data)

for (const a of assessments ?? []) {
  const rIn = await admin.from('nr01_assessments').select('id').eq('id', a.id).in('company_id', ids).maybeSingle()
  const rFullIn = await admin.from('nr01_assessments').select(select).eq('id', a.id).in('company_id', ids).maybeSingle()
  const rInner = await admin
    .from('nr01_assessments')
    .select(inner)
    .eq('id', a.id)
    .eq('companies.org_account_id', orgId)
    .maybeSingle()
  const rConsultant = await admin
    .from('nr01_assessments')
    .select('id')
    .eq('id', a.id)
    .eq('consultant_id', gerenciaId)
    .maybeSingle()

  console.log('\n', a.name, a.id.slice(0, 8))
  console.log('  IN id:', Boolean(rIn.data), rIn.error?.message)
  console.log('  IN full select:', Boolean(rFullIn.data), rFullIn.error?.message)
  if (rFullIn.error) console.log('   ', rFullIn.error)
  console.log('  inner join:', Boolean(rInner.data), rInner.error?.message)
  if (rInner.error) console.log('   ', rInner.error)
  console.log('  consultant=gerencia:', Boolean(rConsultant.data), '(would fail if role misread as consultant)')
}
