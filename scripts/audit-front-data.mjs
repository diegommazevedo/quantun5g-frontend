/**
 * Auditoria: schema, empresas recentes, faturas, perfis.
 * node --env-file=.env.local scripts/audit-front-data.mjs
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const admin = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

async function probe(label, fn) {
  const { data, error, count } = await fn()
  if (error) {
    console.log('✗', label, error.message)
    return null
  }
  return { data, count }
}

console.log('=== Supabase:', url, '===\n')

// Schema probes
const schemaChecks = [
  ['companies.account_user_id', () => admin.from('companies').select('account_user_id').limit(1)],
  ['companies.consultant_id', () => admin.from('companies').select('consultant_id').limit(1)],
  ['company_contacts', () => admin.from('company_contacts').select('id').limit(1)],
  ['commercial_invoices', () => admin.from('commercial_invoices').select('id').limit(1)],
  ['hybrid_reports', () => admin.from('hybrid_reports').select('id').limit(1)],
]

let schemaOk = true
for (const [label, fn] of schemaChecks) {
  const r = await probe(label, fn)
  if (!r) schemaOk = false
  else console.log('✓', label)
}

console.log('\n--- Empresas (últimas 10) ---')
const { data: companies, error: coErr } = await admin
  .from('companies')
  .select('id, name, cnpj, consultant_id, account_user_id, created_at')
  .order('created_at', { ascending: false })
  .limit(10)

if (coErr) console.log('ERRO:', coErr.message)
else if (!companies?.length) console.log('(nenhuma empresa no banco)')
else {
  for (const c of companies) {
    console.log(
      `${c.created_at?.slice(0, 19)} | ${c.name?.slice(0, 40)} | cnpj=${c.cnpj ?? '-'} | consultant=${c.consultant_id?.slice(0, 8)}… | account=${c.account_user_id?.slice(0, 8) ?? 'null'}…`,
    )
  }
}

console.log('\n--- Faturas comerciais (últimas 5) ---')
const { data: invs } = await admin
  .from('commercial_invoices')
  .select('invoice_number, status, user_id, created_at, metadata')
  .order('created_at', { ascending: false })
  .limit(5)

if (!invs?.length) console.log('(nenhuma fatura)')
else {
  for (const i of invs) {
    const slots = i.metadata?.company_cnpj_slots ?? '-'
    console.log(
      `${i.created_at?.slice(0, 19)} | ${i.invoice_number} | ${i.status} | user=${i.user_id?.slice(0, 8)}… | slots=${slots}`,
    )
  }
}

console.log('\n--- Consultores (profiles) ---')
const { data: profiles } = await admin
  .from('profiles')
  .select('email, role, module_nr01, module_pentagrama, created_at')
  .in('role', ['consultant', 'admin', 'leader'])
  .order('created_at', { ascending: false })
  .limit(8)

for (const p of profiles ?? []) {
  console.log(
    `${p.email} | ${p.role} | nr01=${p.module_nr01} pent=${p.module_pentagrama}`,
  )
}

console.log('\n--- Contagem total ---')
for (const t of ['companies', 'company_contacts', 'commercial_invoices', 'diagnostics', 'nr01_assessments']) {
  const { count, error } = await admin.from(t).select('id', { count: 'exact', head: true })
  console.log(`${t}:`, error ? `ERRO ${error.message}` : count)
}

if (!schemaOk) {
  console.log('\n⚠ Schema incompleto — execute supabase/apply-pending-remote.sql')
  process.exit(1)
}
