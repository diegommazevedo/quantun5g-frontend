/**
 * Normalização de identificadores de empresa para deduplicação.
 */

export function normalizeCompanyName(name: string): string {
  return name.trim().replace(/\s+/g, ' ').toLowerCase()
}

/** Mantém apenas dígitos (CNPJ/CPF). */
export function normalizeCnpj(raw: string): string {
  return raw.replace(/\D/g, '')
}

export function isValidCnpjLength(cnpj: string): boolean {
  const digits = normalizeCnpj(cnpj)
  return digits.length === 14
}
