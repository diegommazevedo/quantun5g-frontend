import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'

export interface OrgAccount {
  id: string
  name: string
  owner_user_id: string
  consultant_id: string
}

export interface OrgActorContext {
  userId: string
  role: UserRole
  org: OrgAccount | null
  isContratante: boolean
  isGerente: boolean
}

export async function loadOrgActorContext(userId: string, role: UserRole): Promise<OrgActorContext> {
  const admin = createServiceRoleAdmin()
  let org: OrgAccount | null = null

  if (isContratanteRole(role)) {
    const { data } = await admin
      .from('org_accounts')
      .select('id, name, owner_user_id, consultant_id')
      .eq('owner_user_id', userId)
      .maybeSingle()
    org = (data as OrgAccount | null) ?? null
  } else if (isGerenteRole(role)) {
    const { data: member } = await admin
      .from('org_members')
      .select('org_account_id')
      .eq('user_id', userId)
      .eq('is_active', true)
      .maybeSingle()
    if (member?.org_account_id) {
      const { data } = await admin
        .from('org_accounts')
        .select('id, name, owner_user_id, consultant_id')
        .eq('id', member.org_account_id as string)
        .maybeSingle()
      org = (data as OrgAccount | null) ?? null
    }
  }

  return {
    userId,
    role,
    org,
    isContratante: isContratanteRole(role),
    isGerente: isGerenteRole(role),
  }
}

export async function requireContratanteOrRedirect(): Promise<OrgActorContext & { org: OrgAccount }> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()

  const role = profile?.role ?? 'consultant'
  if (!isContratanteRole(role)) redirect('/dashboard')

  const ctx = await loadOrgActorContext(user.id, role)
  if (!ctx.org) redirect('/dashboard?error=organizacao-nao-configurada')

  return { ...ctx, org: ctx.org }
}

export async function assertContratanteOwnsOrg(userId: string, orgId: string): Promise<boolean> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('org_accounts')
    .select('id')
    .eq('id', orgId)
    .eq('owner_user_id', userId)
    .maybeSingle()
  return Boolean(data?.id)
}
