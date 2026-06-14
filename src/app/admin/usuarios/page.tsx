import { createClient as createAdminClient } from '@supabase/supabase-js'
import { UsuariosClient, type UsuarioRow } from './UsuariosClient'
import { loadOrgSummaryByUserIds } from '@/lib/org/queries'
import {
  loadAdminCompaniesAndConsultants,
  loadAllUserVinculos,
} from '@/lib/admin/user-vinculos'
import { loadActivationStatusByUserIds } from '@/lib/admin/user-activation-status'

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
  const [{ companies, consultants }, orgSummary, vinculos, activationStatus, { data: orgAccounts }] =
    await Promise.all([
    loadAdminCompaniesAndConsultants(),
    loadOrgSummaryByUserIds(usuarios.map((u) => u.id)),
    loadAllUserVinculos(usuarios.map((u) => ({ id: u.id, role: u.role }))),
    loadActivationStatusByUserIds(usuarios.map((u) => ({ id: u.id, is_active: u.is_active }))),
    admin.from('org_accounts').select('id, name, owner_user_id, consultant_id').order('name'),
  ])

  return (
    <div className="max-w-5xl">
      <UsuariosClient
        usuarios={usuarios}
        orgSummary={orgSummary}
        companies={companies}
        consultants={consultants}
        orgAccounts={(orgAccounts ?? []) as { id: string; name: string; owner_user_id: string; consultant_id: string }[]}
        vinculos={vinculos}
        activationStatus={activationStatus}
      />
    </div>
  )
}
