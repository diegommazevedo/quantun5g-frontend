/**
 * Liderança IL (LID) — cadastro por empresa (1 ou N), vínculo no diagnóstico.
 */

export interface IlLeaderSource {
  il_leader_name?: string | null
  il_leader_email?: string | null
}

export interface CompanyIlLeaderRow {
  id?: string
  name: string
  email: string
  sort_order?: number
}

export function companyHasIlLeader(
  company: IlLeaderSource,
  leaders?: CompanyIlLeaderRow[] | { contact_role?: string }[],
): boolean {
  if (leaders && leaders.length > 0) {
    const asContacts = leaders as { contact_role?: string }[]
    if (asContacts[0]?.contact_role) {
      return asContacts.some((l) => l.contact_role === 'leader')
    }
    return true
  }
  return Boolean(
    company.il_leader_name?.trim() && company.il_leader_email?.trim(),
  )
}

export function formatIlLeaderLine(leader: { name: string; email?: string | null }): string {
  return leader.email ? `${leader.name} · ${leader.email}` : leader.name
}

export function snapshotIlLeaderToDiagnostic(leader: {
  name: string
  email: string
}): { leader_name: string; leader_email: string } {
  return { leader_name: leader.name, leader_email: leader.email }
}
