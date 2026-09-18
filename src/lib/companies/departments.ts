/**
 * Catálogo de departamentos por empresa + resolução híbrida na pesquisa.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import {
  DEPARTMENT_NONE_KEY,
  departmentLabel,
  normalizeDepartment,
  type DepartmentCount,
} from '@/lib/companies/contacts'
import type { CompanyContact } from '@/types/database'

export interface CompanyDepartment {
  id: string
  company_id: string
  name: string
  name_normalized: string
  is_active: boolean
  sort_order: number
  created_at: string
  updated_at: string
}

export function normalizeDepartmentName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

export async function listCompanyDepartments(
  companyId: string,
  opts?: { includeInactive?: boolean },
): Promise<CompanyDepartment[]> {
  const admin = createServiceRoleAdmin()
  let q = admin
    .from('company_departments')
    .select('*')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: true })
    .order('name', { ascending: true })

  if (!opts?.includeInactive) {
    q = q.eq('is_active', true)
  }

  const { data } = await q
  return (data ?? []) as CompanyDepartment[]
}

/** Departamentos do catálogo com contagem de contatos (por department_id ou texto legado). */
export function listCatalogDepartmentsWithCounts(
  departments: Pick<CompanyDepartment, 'id' | 'name' | 'is_active'>[],
  contacts: Pick<CompanyContact, 'department' | 'department_id'>[],
): (DepartmentCount & { id: string | null })[] {
  const active = departments.filter((d) => d.is_active)
  const byId = new Map<string, number>()
  const byLegacy = new Map<string, number>()
  let none = 0

  for (const c of contacts) {
    if (c.department_id) {
      byId.set(c.department_id, (byId.get(c.department_id) ?? 0) + 1)
      continue
    }
    const key = normalizeDepartment(c.department)
    if (key === DEPARTMENT_NONE_KEY) {
      none += 1
      continue
    }
    byLegacy.set(key, (byLegacy.get(key) ?? 0) + 1)
  }

  const rows: (DepartmentCount & { id: string | null })[] = active.map((d) => ({
    id: d.id,
    key: d.id,
    label: d.name,
    count: byId.get(d.id) ?? byLegacy.get(normalizeDepartment(d.name)) ?? 0,
  }))

  // Contatos com texto legado sem match no catálogo
  for (const [key, count] of byLegacy) {
    const matched = active.some((d) => normalizeDepartment(d.name) === key)
    if (!matched) {
      rows.push({ id: null, key, label: departmentLabel(key), count })
    }
  }

  if (none > 0) {
    rows.push({
      id: null,
      key: DEPARTMENT_NONE_KEY,
      label: departmentLabel(DEPARTMENT_NONE_KEY),
      count: none,
    })
  }

  return rows.sort((a, b) => {
    if (a.key === DEPARTMENT_NONE_KEY) return 1
    if (b.key === DEPARTMENT_NONE_KEY) return -1
    return a.label.localeCompare(b.label, 'pt-BR')
  })
}

export async function ensureCompanyDepartment(
  companyId: string,
  nameRaw: string,
): Promise<CompanyDepartment | null> {
  const name = nameRaw.trim().replace(/\s+/g, ' ')
  if (!name) return null
  const nameNormalized = normalizeDepartmentName(name)
  const admin = createServiceRoleAdmin()

  const { data: existing } = await admin
    .from('company_departments')
    .select('*')
    .eq('company_id', companyId)
    .eq('name_normalized', nameNormalized)
    .maybeSingle()

  if (existing) {
    const row = existing as CompanyDepartment
    if (!row.is_active) {
      await admin
        .from('company_departments')
        .update({ is_active: true, name, updated_at: new Date().toISOString() } as never)
        .eq('id', row.id)
      return { ...row, is_active: true, name }
    }
    return row
  }

  const { data: maxSort } = await admin
    .from('company_departments')
    .select('sort_order')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()

  const sortOrder = ((maxSort as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const { data: created, error } = await admin
    .from('company_departments')
    .insert({
      company_id: companyId,
      name,
      name_normalized: nameNormalized,
      sort_order: sortOrder,
      is_active: true,
    } as never)
    .select('*')
    .single()

  if (error || !created) {
    console.error('[ensureCompanyDepartment]', error?.message)
    return null
  }
  return created as CompanyDepartment
}

export interface ResolvedSurveyDepartment {
  departmentId: string | null
  departmentLabel: string | null
  locked: boolean
  source: 'invite' | 'catalog' | 'none'
}

/**
 * Resolve dept do invite (contact) sem expor contact_id ao cliente.
 * Nunca retorna dados de identidade — só department_id + label.
 */
export async function resolveDepartmentFromInviteToken(
  inviteToken: string | null | undefined,
  companyId: string,
): Promise<ResolvedSurveyDepartment> {
  const raw = inviteToken?.trim()
  const UUID_RE =
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
  if (!raw || !UUID_RE.test(raw)) {
    return { departmentId: null, departmentLabel: null, locked: false, source: 'none' }
  }

  const admin = createServiceRoleAdmin()
  const { data: invite } = await admin
    .from('survey_invites')
    .select(
      `
      id, company_id, department_id,
      company_contacts:company_contacts!survey_invites_contact_id_fkey (
        department_id, department
      )
    `,
    )
    .eq('token', raw)
    .eq('company_id', companyId)
    .maybeSingle()

  if (!invite) {
    return { departmentId: null, departmentLabel: null, locked: false, source: 'none' }
  }

  const row = invite as {
    department_id: string | null
    company_contacts:
      | { department_id: string | null; department: string | null }
      | { department_id: string | null; department: string | null }[]
      | null
  }

  const contact = Array.isArray(row.company_contacts)
    ? row.company_contacts[0]
    : row.company_contacts

  let departmentId = row.department_id ?? contact?.department_id ?? null
  let departmentLabel: string | null = contact?.department?.trim() || null

  if (departmentId) {
    const { data: dept } = await admin
      .from('company_departments')
      .select('id, name, is_active')
      .eq('id', departmentId)
      .eq('company_id', companyId)
      .maybeSingle()
    if (dept && (dept as CompanyDepartment).is_active) {
      return {
        departmentId: (dept as CompanyDepartment).id,
        departmentLabel: (dept as CompanyDepartment).name,
        locked: true,
        source: 'invite',
      }
    }
    departmentId = null
  }

  if (departmentLabel) {
    const ensured = await ensureCompanyDepartment(companyId, departmentLabel)
    if (ensured) {
      return {
        departmentId: ensured.id,
        departmentLabel: ensured.name,
        locked: true,
        source: 'invite',
      }
    }
  }

  return { departmentId: null, departmentLabel: null, locked: false, source: 'none' }
}

/**
 * Valida department_id do client; com invite, o servidor prevalece.
 * Não persiste invite_id/contact_id — só retorna snapshot para a resposta.
 */
export async function resolveDepartmentForSurveySubmit(params: {
  companyId: string
  inviteToken?: string | null
  clientDepartmentId?: string | null
}): Promise<{ ok: true; departmentId: string; departmentLabel: string } | { ok: false; error: string }> {
  const fromInvite = await resolveDepartmentFromInviteToken(params.inviteToken, params.companyId)
  if (fromInvite.locked && fromInvite.departmentId && fromInvite.departmentLabel) {
    return {
      ok: true,
      departmentId: fromInvite.departmentId,
      departmentLabel: fromInvite.departmentLabel,
    }
  }

  const clientId = params.clientDepartmentId?.trim()
  if (!clientId) {
    return { ok: false, error: 'Selecione o seu departamento para continuar.' }
  }

  const admin = createServiceRoleAdmin()
  const { data: dept } = await admin
    .from('company_departments')
    .select('id, name, is_active')
    .eq('id', clientId)
    .eq('company_id', params.companyId)
    .eq('is_active', true)
    .maybeSingle()

  if (!dept) {
    return { ok: false, error: 'Departamento inválido. Atualize a página e tente novamente.' }
  }

  const d = dept as CompanyDepartment
  return { ok: true, departmentId: d.id, departmentLabel: d.name }
}
