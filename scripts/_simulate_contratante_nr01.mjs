/**
 * Simula loadNr01AssessmentForPage para gerencia@pasola
 */
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
const assessmentId = '4904fd54-ac74-4a14-a11b-a585ded7a472'

// org context
const { data: org, error: orgErr } = await admin
  .from('org_accounts')
  .select('id, name, owner_user_id, consultant_id')
  .eq('owner_user_id', gerenciaId)

console.log('org_accounts for gerencia:', org?.length, orgErr?.message)
for (const o of org ?? []) console.log(' ', o.id, o.name, 'consultant:', o.consultant_id?.slice(0, 8))

const orgId = org?.[0]?.id
if (!orgId) process.exit(1)

const select = `
      *,
      companies:companies!nr01_assessments_company_id_fkey (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email
      )
`
const scopedSelect = select.replace(
  'companies:companies!nr01_assessments_company_id_fkey (',
  'companies:companies!nr01_assessments_company_id_fkey!inner (',
)

const { data, error } = await admin
  .from('nr01_assessments')
  .select(scopedSelect)
  .eq('id', assessmentId)
  .eq('companies.org_account_id', orgId)
  .maybeSingle()

console.log('\nloadNr01AssessmentForPage simulation:')
console.log('found:', Boolean(data), 'error:', error?.message)
if (error) console.log(error)

// Dashboard list simulation
const { data: cos } = await admin.from('companies').select('id').eq('org_account_id', orgId)
const ids = (cos ?? []).map((c) => c.id)
const { data: list } = await admin
  .from('nr01_assessments')
  .select('id, name')
  .in('company_id', ids)
console.log('\ndashboard list ids:', list?.map((a) => a.id.slice(0, 8)))

// Pentagrama: would RLS block contratante on diagnostic detail?
const { data: diagList } = await admin.from('diagnostics').select('id').in('company_id', ids)
console.log('\npentagrama diags in org companies:', diagList?.length ?? 0)

// Check gerencia profile via anon (simulate RLS) - skip, use service role check
const { data: prof } = await admin.from('profiles').select('role, module_nr01').eq('id', gerenciaId).single()
console.log('\ngerencia profile:', prof)
