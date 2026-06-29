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

const { data: all } = await admin
  .from('companies')
  .select('id, name, cnpj, org_account_id, consultant_id')
  .or('name.ilike.%pasola%,name.ilike.%SMAP%,name.ilike.%Imigrante%')
  .order('name')

console.log('Empresas nome Pasola/SMAP/Imigrante:', all?.length)
for (const c of all ?? []) {
  const digits = (c.cnpj ?? '').replace(/\D/g, '')
  const cnpjUi = Boolean(c.cnpj && c.cnpj.length === 14)
  console.log(
    c.name,
    '| org:', c.org_account_id?.slice(0, 8) ?? 'SEM ORG',
    '| cnpj len:', c.cnpj?.length ?? 0,
    '| ui:', cnpjUi ? 'OK' : 'PENDENTE UI',
    '| digits:', digits.length,
  )
}
