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
  const leaders = contacts.filter((c) => c.contact_role === 'leader')
  if (leaders.length === 0) {
    return 'Cadastre ao menos um líder (IL Pentagrama).'
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
