import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

export interface OrgCompanyRow {
  id: string
  name: string
  cnpj: string | null
  trade_name: string | null
}

export interface OrgGerenteRow {
  memberId: string
  userId: string
  name: string | null
  email: string | null
  isActive: boolean
  modulePentagrama: boolean
  moduleNr01: boolean
  companyIds: string[]
  companyNames: string[]
}

export async function loadOrgCompanies(orgId: string): Promise<OrgCompanyRow[]> {
  const admin = createServiceRoleAdmin()
  const { data } = await admin
    .from('companies')
    .select('id, name, cnpj, trade_name')
    .eq('org_account_id', orgId)
    .order('name')
  return (data ?? []) as OrgCompanyRow[]
}

export async function loadOrgGerentes(orgId: string): Promise<OrgGerenteRow[]> {
  const admin = createServiceRoleAdmin()
  const { data: members } = await admin
    .from('org_members')
    .select(`
      id,
      user_id,
      is_active,
      module_pentagrama,
      module_nr01,
      profiles ( name, email, role )
    `)
    .eq('org_account_id', orgId)
    .order('created_at')

  const rows: OrgGerenteRow[] = []
  for (const m of members ?? []) {
    const raw = m as unknown as {
      id: string
      user_id: string
      is_active: boolean
      module_pentagrama: boolean
      module_nr01: boolean
      profiles:
        | { name: string | null; email: string | null; role: string }
        | { name: string | null; email: string | null; role: string }[]
        | null
    }
    const profile = Array.isArray(raw.profiles) ? (raw.profiles[0] ?? null) : raw.profiles
    const { data: links } = await admin
      .from('org_member_companies')
      .select('company_id, companies ( name )')
      .eq('member_id', raw.id)

    const companyIds: string[] = []
    const companyNames: string[] = []
    for (const l of links ?? []) {
      const link = l as unknown as {
        company_id: string
        companies: { name: string } | { name: string }[] | null
      }
      const company = Array.isArray(link.companies) ? (link.companies[0] ?? null) : link.companies
      companyIds.push(link.company_id)
      if (company?.name) companyNames.push(company.name)
    }

    rows.push({
      memberId: raw.id,
      userId: raw.user_id,
      name: profile?.name ?? null,
      email: profile?.email ?? null,
      isActive: raw.is_active,
      modulePentagrama: raw.module_pentagrama,
      moduleNr01: raw.module_nr01,
      companyIds,
      companyNames,
    })
  }
  return rows
}

export async function loadCompanyIdsForGerente(userId: string): Promise<string[]> {
  const admin = createServiceRoleAdmin()
  const { data: member } = await admin
    .from('org_members')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle()
  if (!member?.id) return []

  const { data: links } = await admin
    .from('org_member_companies')
    .select('company_id')
    .eq('member_id', member.id as string)

  return ((links ?? []) as { company_id: string }[]).map((l) => l.company_id)
}

export async function loadCompanyIdsForContratante(userId: string): Promise<string[]> {
  const admin = createServiceRoleAdmin()
  const { data: org } = await admin
    .from('org_accounts')
    .select('id')
    .eq('owner_user_id', userId)
    .maybeSingle()
  if (!org?.id) return []

  const { data: cos } = await admin.from('companies').select('id').eq('org_account_id', org.id as string)
  return ((cos ?? []) as { id: string }[]).map((c) => c.id)
}

/** Admin: resumo org + empresas por usuário */
export async function loadOrgSummaryByUserIds(
  userIds: string[],
): Promise<Record<string, { orgName: string | null; orgRole: string; companyCount: number }>> {
  const out: Record<string, { orgName: string | null; orgRole: string; companyCount: number }> = {}
  if (!userIds.length) return out

  const admin = createServiceRoleAdmin()

  const { data: owned } = await admin
    .from('org_accounts')
    .select('owner_user_id, name, id')
    .in('owner_user_id', userIds)

  for (const o of owned ?? []) {
    const row = o as { owner_user_id: string; name: string; id: string }
    const { count } = await admin
      .from('companies')
      .select('id', { count: 'exact', head: true })
      .eq('org_account_id', row.id)
    out[row.owner_user_id] = {
      orgName: row.name,
      orgRole: 'contratante',
      companyCount: count ?? 0,
    }
  }

  const { data: members } = await admin
    .from('org_members')
    .select('id, user_id, org_accounts ( name )')
    .in('user_id', userIds)

  for (const m of members ?? []) {
    const raw = m as unknown as {
      id: string
      user_id: string
      org_accounts: { name: string } | { name: string }[] | null
    }
    const orgAccount = Array.isArray(raw.org_accounts) ? (raw.org_accounts[0] ?? null) : raw.org_accounts
    if (out[raw.user_id]) continue
    const { count } = await admin
      .from('org_member_companies')
      .select('company_id', { count: 'exact', head: true })
      .eq('member_id', raw.id)
    out[raw.user_id] = {
      orgName: orgAccount?.name ?? null,
      orgRole: 'gerente',
      companyCount: count ?? 0,
    }
  }

  return out
}
