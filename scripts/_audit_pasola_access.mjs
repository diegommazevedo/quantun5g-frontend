/**
 * Auditoria Pasola vs suporte — dados e caminhos de acesso
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
const orgId = '6292eca3-7eaa-4270-a5ad-807caa17afd9'
const assessmentId = '4904fd54-ac74-4a14-a11b-a585ded7a472'

// Find suporte users
const { data: suporteProfiles } = await admin
  .from('profiles')
  .select('id, email, role, name')
  .or('email.ilike.%suporte%,email.ilike.%quantun5g%,role.eq.admin')
  .order('email')

console.log('\n=== USUÁRIOS SUPORTE/ADMIN ===')
for (const p of suporteProfiles ?? []) {
  console.log(p.role, p.email, p.id)
}

const { data: gerencia } = await admin.from('profiles').select('*').eq('id', gerenciaId).single()
console.log('\n=== GERENCIA ===')
console.log({ role: gerencia?.role, email: gerencia?.email, module_nr01: gerencia?.module_nr01, module_pentagrama: gerencia?.module_pentagrama })

// Companies org
const { data: orgCos } = await admin.from('companies').select('id, name, org_account_id, consultant_id, account_user_id').eq('org_account_id', orgId)
console.log('\n=== EMPRESAS ORG PASOLA ===', orgCos?.length)
for (const c of orgCos ?? []) {
  console.log(c.name, 'consultant:', c.consultant_id?.slice(0, 8), 'org:', c.org_account_id?.slice(0, 8) ?? 'NULL')
}

// NR01 assessments for org companies
const companyIds = (orgCos ?? []).map((c) => c.id)
const { data: assessments } = await admin
  .from('nr01_assessments')
  .select('id, name, company_id, consultant_id, status, created_at')
  .in('company_id', companyIds.length ? companyIds : ['00000000-0000-0000-0000-000000000000'])
  .order('created_at', { ascending: false })

console.log('\n=== NR01 AVALIAÇÕES ORG PASOLA ===', assessments?.length)
for (const a of assessments ?? []) {
  const co = orgCos?.find((c) => c.id === a.company_id)
  console.log(a.id.slice(0, 8), a.name, 'status:', a.status, 'consultant:', a.consultant_id?.slice(0, 8), 'company org:', co?.org_account_id?.slice(0, 8) ?? 'MISSING')
}

// Pentagrama diagnostics for org companies
const { data: diags } = await admin
  .from('diagnostics')
  .select('id, name, company_id, consultant_id, status')
  .in('company_id', companyIds.length ? companyIds : ['00000000-0000-0000-0000-000000000000'])
  .order('created_at', { ascending: false })
  .limit(10)

console.log('\n=== PENTAGRAMA DIAGNÓSTICOS ORG PASOLA ===', diags?.length)
for (const d of diags ?? []) {
  console.log(d.id.slice(0, 8), d.name, 'status:', d.status, 'consultant:', d.consultant_id?.slice(0, 8))
}

// Test exact production query for assessment detail
const select = `*,
      companies:companies!nr01_assessments_company_id_fkey!inner (
        id, name, total_collaborators,
        technical_lead_name, technical_lead_crp, technical_lead_profession, technical_lead_email,
        org_account_id
      )`

const { data: detail, error: detailErr } = await admin
  .from('nr01_assessments')
  .select(select)
  .eq('id', assessmentId)
  .eq('companies.org_account_id', orgId)
  .maybeSingle()

console.log('\n=== QUERY DETALHE (inner join org) ===')
console.log('found:', Boolean(detail), 'err:', detailErr?.message)
if (detailErr) console.log('details:', detailErr)

// Companies WITHOUT org_account_id linked to pasola consultant
const { data: orphanCos } = await admin
  .from('companies')
  .select('id, name, org_account_id, consultant_id')
  .is('org_account_id', null)
  .in('consultant_id', [...new Set((orgCos ?? []).map((c) => c.consultant_id))])

console.log('\n=== EMPRESAS MESMO CONSULTOR SEM ORG ===', orphanCos?.length)

// Assessments on companies with NULL org
const { data: orphanAssess } = await admin
  .from('nr01_assessments')
  .select('id, name, company_id, companies(name, org_account_id)')
  .in('company_id', companyIds)
console.log('\n=== ASSESSMENTS COM COMPANY JOIN ===')
for (const a of orphanAssess ?? []) {
  const co = a.companies
  console.log(a.id.slice(0, 8), a.name, 'org:', co?.org_account_id?.slice(0, 8) ?? 'NULL')
}
