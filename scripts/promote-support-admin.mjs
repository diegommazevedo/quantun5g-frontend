/**
 * Aplica 20260530600000_promote_support_profiles_admin.sql via service role.
 * Uso: node --env-file=.env.local scripts/promote-support-admin.mjs
 */

import { createClient } from '@supabase/supabase-js'

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!url || !key) {
  console.error('Faltam NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { autoRefreshToken: false, persistSession: false },
})

const emails = ['suporte@quantun5g.com', 'suporte@quantum5g.com']

const { data: before } = await supabase
  .from('profiles')
  .select('id, email, role, module_pentagrama, module_nr01')
  .in('email', emails)

console.log('Antes:', before ?? [])

const { data, error } = await supabase
  .from('profiles')
  .update({
    role: 'admin',
    module_pentagrama: true,
    module_nr01: true,
    is_active: true,
  })
  .in('email', emails)
  .neq('role', 'admin')
  .select('id, email, role, module_pentagrama, module_nr01')

if (error) {
  console.error('Erro:', error.message)
  process.exit(1)
}

console.log('Atualizados:', data?.length ?? 0, data ?? [])
process.exit(0)
