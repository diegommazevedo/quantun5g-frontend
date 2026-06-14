import { createClient as createAdminClient } from '@supabase/supabase-js'
import { UsuariosClient, type UsuarioRow } from './UsuariosClient'
import { loadOrgSummaryByUserIds } from '@/lib/org/queries'

export const dynamic = 'force-dynamic'

export default async function UsuariosAdminPage() {
  const admin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )

  const { data } = await admin
    .from('profiles')
    .select('id, name, email, role, is_active, module_pentagrama, module_nr01, created_at')
    .order('created_at', { ascending: false })

  const usuarios = (data ?? []) as UsuarioRow[]
  const orgSummary = await loadOrgSummaryByUserIds(usuarios.map((u) => u.id))

  return (
    <div className="max-w-5xl">
      <UsuariosClient usuarios={usuarios} orgSummary={orgSummary} />
    </div>
  )
}
