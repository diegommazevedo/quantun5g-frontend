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

// All companies with null/short cnpj
const { data: badCnpj } = await admin
  .from('companies')
  .select('id, name, cnpj, org_account_id, consultant_id, created_at')
  .or('cnpj.is.null,cnpj.eq.')
  .order('created_at', { ascending: false })
  .limit(30)

console.log('\n=== EMPRESAS SEM CNPJ (null ou vazio) ===', badCnpj?.length)
for (const c of badCnpj ?? []) {
  console.log(c.name, '| org:', c.org_account_id?.slice(0, 8) ?? 'NULL', '| cnpj:', c.cnpj)
}

// IL leaders per Pasola company
const { data: cos } = await admin.from('companies').select('id, name, il_leader_name, il_leader_email').eq('org_account_id', orgId)
const ids = (cos ?? []).map((c) => c.id)
const { data: leaders } = await admin
  .from('company_contacts')
  .select('company_id, full_name, email, contact_role, is_active')
  .in('company_id', ids)
  .eq('contact_role', 'leader')

console.log('\n=== PASOLA — IL por empresa ===')
for (const c of cos ?? []) {
  const ls = (leaders ?? []).filter((l) => l.company_id === c.id && l.is_active)
  const hasIl = ls.length > 0 || Boolean(c.il_leader_name?.trim() && c.il_leader_email?.trim())
  console.log(c.name, '| IL contacts:', ls.length, '| legacy IL:', Boolean(c.il_leader_name), '| UI IL:', hasIl ? 'OK' : 'PENDENTE')
}

// Unified readiness
console.log('\n=== PASOLA — readiness unified (CNPJ+RT+IL) ===')
for (const c of cos ?? []) {
  const full = await admin.from('companies').select('*').eq('id', c.id).single()
  const co = full.data
  const cnpjOk = Boolean(co?.cnpj && co.cnpj.length === 14)
  const rtOk = Boolean(co?.technical_lead_name?.trim() && co?.technical_lead_crp?.trim())
  const ls = (leaders ?? []).filter((l) => l.company_id === c.id && l.is_active)
  const ilOk = ls.length > 0 || Boolean(co?.il_leader_name?.trim() && co?.il_leader_email?.trim())
  const ready = cnpjOk && rtOk && ilOk
  if (!ready) {
    console.log('INCOMPLETA:', c.name, { cnpj: cnpjOk ? 'OK' : 'PENDENTE', rt: rtOk ? 'OK' : 'PENDENTE', il: ilOk ? 'OK' : 'PENDENTE' })
  }
}
