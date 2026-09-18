import type { CompanyContact, CompanyContactRole } from '@/types/database'

export type ContactInput = {
  full_name: string
  email: string
  contact_role: CompanyContactRole
  job_title?: string | null
  department?: string | null
}

export function parseContactsJson(raw: string | null): ContactInput[] {
  if (!raw?.trim()) return []
  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => {
        const o = item as Record<string, unknown>
        const role = o.contact_role === 'collaborator' ? 'collaborator' : 'leader'
        return {
          full_name: String(o.full_name ?? o.name ?? '').trim(),
          email: String(o.email ?? '').trim().toLowerCase(),
          contact_role: role as CompanyContactRole,
          job_title: (o.job_title as string)?.trim() || null,
          department: (o.department as string)?.trim() || null,
        }
      })
      .filter((c) => c.full_name && c.email.includes('@'))
  } catch {
    return []
  }
}

export function validateContacts(contacts: ContactInput[]): string | null {
  if (contacts.length === 0) {
    return 'Cadastre ao menos um contato na equipe.'
  }
  const emails = new Set<string>()
  for (const c of contacts) {
    if (emails.has(c.email)) return `E-mail duplicado: ${c.email}`
    emails.add(c.email)
  }
  return null
}

export function countByRole(contacts: CompanyContact[]) {
  return {
    leaders: contacts.filter((c) => c.contact_role === 'leader' && c.is_active).length,
    collaborators: contacts.filter((c) => c.contact_role === 'collaborator' && c.is_active).length,
    total: contacts.filter((c) => c.is_active).length,
  }
}

/** Chave estável para departamento vazio / não informado. */
export const DEPARTMENT_NONE_KEY = '__none__' as const

export function normalizeDepartment(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? ''
  return trimmed.length > 0 ? trimmed : DEPARTMENT_NONE_KEY
}

export function departmentLabel(key: string): string {
  return key === DEPARTMENT_NONE_KEY ? 'Sem departamento' : key
}

export interface DepartmentCount {
  key: string
  label: string
  count: number
}

/** Departamentos distintos com contagem, ordenados (Sem departamento por último). */
export function listDepartmentsWithCounts(
  contacts: Pick<CompanyContact, 'department'>[],
): DepartmentCount[] {
  const counts = new Map<string, number>()
  for (const c of contacts) {
    const key = normalizeDepartment(c.department)
    counts.set(key, (counts.get(key) ?? 0) + 1)
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, label: departmentLabel(key), count }))
    .sort((a, b) => {
      if (a.key === DEPARTMENT_NONE_KEY) return 1
      if (b.key === DEPARTMENT_NONE_KEY) return -1
      return a.label.localeCompare(b.label, 'pt-BR')
    })
}

/** Matching: department_id (UUID) ou texto legado / __none__. */
export function filterContactsByDepartments<
  T extends Pick<CompanyContact, 'department' | 'department_id'>,
>(contacts: T[], selectedKeys: string[]): T[] {
  const allowed = new Set(
    selectedKeys.map((k) => String(k).trim()).filter((k) => k.length > 0),
  )
  if (allowed.size === 0) return []
  return contacts.filter((c) => {
    if (c.department_id && allowed.has(c.department_id)) return true
    return allowed.has(normalizeDepartment(c.department))
  })
}

/**
 * Whitelist: aceita chaves do catálogo (id) ou labels/texto legado presentes nos contatos.
 */
export function sanitizeSelectedDepartments(
  contacts: Pick<CompanyContact, 'department' | 'department_id'>[],
  selectedKeys: string[],
  catalogIds?: string[],
): string[] {
  const allowed = new Set(listDepartmentsWithCounts(contacts).map((d) => d.key))
  for (const c of contacts) {
    if (c.department_id) allowed.add(c.department_id)
  }
  for (const id of catalogIds ?? []) {
    if (id) allowed.add(id)
  }
  const out = new Set<string>()
  for (const raw of selectedKeys) {
    const key = String(raw).trim()
    if (!key) continue
    if (allowed.has(key)) out.add(key)
  }
  return [...out]
}

