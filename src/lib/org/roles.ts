import type { UserRole } from '@/types/database'

export function isContratanteRole(role: UserRole | string): boolean {
  return role === 'contratante' || role === 'leader'
}

export function isGerenteRole(role: UserRole | string): boolean {
  return role === 'gerente'
}

export function isOrgManagerRole(role: UserRole | string): boolean {
  return isContratanteRole(role) || isGerenteRole(role)
}

export const ORG_ROLE_LABEL: Record<string, string> = {
  contratante: 'Contratante',
  gerente: 'Gerente de filial',
  leader: 'Contratante (legado)',
}
