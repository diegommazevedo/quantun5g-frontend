/**
 * Pasola: estado CNPJ e cadastro de cada empresa da org
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

const orgId = '6292eca3-7eaa-4270-a5ad-807caa17afd9'

const { data: cos } = await admin
  .from('companies')
  .select(`
    id, name, cnpj, trade_name, org_account_id,
    technical_lead_name, technical_lead_crp,
    il_leader_name, il_leader_email,
    created_at
  `)
  .eq('org_account_id', orgId)
  .order('name')

console.log('\n=== PASOLA — CNPJ por empresa ===\n')
for (const c of cos ?? []) {
  const raw = c.cnpj
  const digits = raw ? raw.replace(/\D/g, '') : ''
  const uiHasCnpj = Boolean(raw && raw.length === 14)
  const valid = digits.length === 14
  const rt = Boolean(c.technical_lead_name?.trim() && c.technical_lead_crp?.trim())
  console.log('---', c.name)
  console.log('  cnpj raw:', JSON.stringify(raw), '| len:', raw?.length ?? 0)
  console.log('  digits:', digits.length, '| UI hasCnpj(14):', uiHasCnpj, '| valid digits:', valid)
  console.log('  RT:', rt ? 'OK' : 'PENDENTE')
  console.log('  created:', c.created_at?.slice(0, 10))
}

// Also companies linked to Pasola consultant but WITHOUT org
const { data: orphan } = await admin
  .from('companies')
  .select('id, name, cnpj, org_account_id')
  .eq('consultant_id', 'a7126584-5a26-407f-87b4-cab0323f4009')
  .is('org_account_id', null)

console.log('\n=== Jovane SEM org_account_id ===', orphan?.length ?? 0)
for (const c of orphan ?? []) {
  console.log(' ', c.name, '| cnpj:', c.cnpj?.slice(0, 20) ?? 'NULL')
}
