import { createClient as createAdminClient } from '@supabase/supabase-js'

export interface AdminCompanyOption {
  id: string
  name: string
  cnpj: string | null
  consultant_id: string
  org_account_id: string | null
}

export interface AdminConsultantOption {
  id: string
  name: string | null
  email: string | null
}

export interface ContratanteVinculos {
  orgId: string | null
  orgName: string
  consultantId: string
  companyIds: string[]
}

export interface GerenteVinculos {
  memberId: string | null
  orgAccountId: string | null
  orgName: string | null
  companyIds: string[]
}

export interface UserVinculosBundle {
  consultantCompanyIds: string[]
  contratante: ContratanteVinculos | null
  gerente: GerenteVinculos | null
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function loadAdminCompaniesAndConsultants(): Promise<{
  companies: AdminCompanyOption[]
  consultants: AdminConsultantOption[]
}> {
  const client = admin()
  const [{ data: companies }, { data: consultants }] = await Promise.all([
    client
      .from('companies')
      .select('id, name, cnpj, consultant_id, org_account_id')
      .order('name'),
    client
      .from('profiles')
      .select('id, name, email')
      .eq('role', 'consultant')
      .order('name'),
  ])
  return {
    companies: (companies ?? []) as AdminCompanyOption[],
    consultants: (consultants ?? []) as AdminConsultantOption[],
  }
}

export async function loadUserVinculosBundle(
  userId: string,
  role: string,
): Promise<UserVinculosBundle> {
  const client = admin()
  const bundle: UserVinculosBundle = {
    consultantCompanyIds: [],
    contratante: null,
    gerente: null,
  }

  if (role === 'consultant') {
    const { data } = await client.from('companies').select('id').eq('consultant_id', userId)
    bundle.consultantCompanyIds = ((data ?? []) as { id: string }[]).map((c) => c.id)
    return bundle
  }

  if (role === 'contratante' || role === 'leader') {
    const { data: org } = await client
      .from('org_accounts')
      .select('id, name, consultant_id')
      .eq('owner_user_id', userId)
      .maybeSingle()

    if (org) {
      const row = org as { id: string; name: string; consultant_id: string }
      const { data: cos } = await client
        .from('companies')
        .select('id')
        .eq('org_account_id', row.id)
      bundle.contratante = {
        orgId: row.id,
        orgName: row.name,
        consultantId: row.consultant_id,
        companyIds: ((cos ?? []) as { id: string }[]).map((c) => c.id),
      }
    } else {
      const { data: owned } = await client
        .from('companies')
        .select('id, consultant_id')
        .eq('consultant_id', userId)
        .limit(1)
      const fallbackConsultant =
        ((owned ?? []) as { consultant_id: string }[])[0]?.consultant_id ?? userId
      bundle.contratante = {
        orgId: null,
        orgName: '',
        consultantId: fallbackConsultant,
        companyIds: [],
      }
    }
    return bundle
  }

  if (role === 'gerente') {
    const { data: member } = await client
      .from('org_members')
      .select('id, org_account_id, org_accounts ( name )')
      .eq('user_id', userId)
      .maybeSingle()

    if (member) {
      const row = member as unknown as {
        id: string
        org_account_id: string
        org_accounts: { name: string } | { name: string }[] | null
      }
      const orgAccount = Array.isArray(row.org_accounts)
        ? (row.org_accounts[0] ?? null)
        : row.org_accounts
      const { data: links } = await client
        .from('org_member_companies')
        .select('company_id')
        .eq('member_id', row.id)
      bundle.gerente = {
        memberId: row.id,
        orgAccountId: row.org_account_id,
        orgName: orgAccount?.name ?? null,
        companyIds: ((links ?? []) as { company_id: string }[]).map((l) => l.company_id),
      }
    } else {
      bundle.gerente = {
        memberId: null,
        orgAccountId: null,
        orgName: null,
        companyIds: [],
      }
    }
  }

  return bundle
}

export async function loadAllUserVinculos(
  users: { id: string; role: string }[],
): Promise<Record<string, UserVinculosBundle>> {
  const client = admin()
  const out: Record<string, UserVinculosBundle> = {}

  const consultantIds = users.filter((u) => u.role === 'consultant').map((u) => u.id)
  if (consultantIds.length) {
    const { data: cos } = await client
      .from('companies')
      .select('id, consultant_id')
      .in('consultant_id', consultantIds)
    for (const u of users.filter((x) => x.role === 'consultant')) {
      out[u.id] = {
        consultantCompanyIds: ((cos ?? []) as { id: string; consultant_id: string }[])
          .filter((c) => c.consultant_id === u.id)
          .map((c) => c.id),
        contratante: null,
        gerente: null,
      }
    }
  }

  const contratanteIds = users
    .filter((u) => u.role === 'contratante' || u.role === 'leader')
    .map((u) => u.id)
  if (contratanteIds.length) {
    const { data: orgs } = await client
      .from('org_accounts')
      .select('id, name, owner_user_id, consultant_id')
      .in('owner_user_id', contratanteIds)
    for (const u of users.filter((x) => x.role === 'contratante' || x.role === 'leader')) {
      const org = ((orgs ?? []) as {
        id: string
        name: string
        owner_user_id: string
        consultant_id: string
      }[]).find((o) => o.owner_user_id === u.id)
      if (org) {
        const { data: cos } = await client.from('companies').select('id').eq('org_account_id', org.id)
        out[u.id] = {
          consultantCompanyIds: [],
          contratante: {
            orgId: org.id,
            orgName: org.name,
            consultantId: org.consultant_id,
            companyIds: ((cos ?? []) as { id: string }[]).map((c) => c.id),
          },
          gerente: null,
        }
      } else {
        out[u.id] = {
          consultantCompanyIds: [],
          contratante: {
            orgId: null,
            orgName: '',
            consultantId: consultantIds[0] ?? u.id,
            companyIds: [],
          },
          gerente: null,
        }
      }
    }
  }

  const gerenteIds = users.filter((u) => u.role === 'gerente').map((u) => u.id)
  if (gerenteIds.length) {
    const { data: members } = await client
      .from('org_members')
      .select('id, user_id, org_account_id, org_accounts ( name )')
      .in('user_id', gerenteIds)
    for (const u of users.filter((x) => x.role === 'gerente')) {
      const raw = ((members ?? []) as unknown as {
        id: string
        user_id: string
        org_account_id: string
        org_accounts: { name: string } | { name: string }[] | null
      }[]).find((m) => m.user_id === u.id)
      if (raw) {
        const orgAccount = Array.isArray(raw.org_accounts)
          ? (raw.org_accounts[0] ?? null)
          : raw.org_accounts
        const { data: links } = await client
          .from('org_member_companies')
          .select('company_id')
          .eq('member_id', raw.id)
        out[u.id] = {
          consultantCompanyIds: [],
          contratante: null,
          gerente: {
            memberId: raw.id,
            orgAccountId: raw.org_account_id,
            orgName: orgAccount?.name ?? null,
            companyIds: ((links ?? []) as { company_id: string }[]).map((l) => l.company_id),
          },
        }
      } else {
        out[u.id] = {
          consultantCompanyIds: [],
          contratante: null,
          gerente: {
            memberId: null,
            orgAccountId: null,
            orgName: null,
            companyIds: [],
          },
        }
      }
    }
  }

  return out
}
