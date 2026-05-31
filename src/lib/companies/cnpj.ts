/**
 * Validação de CNPJ (14 dígitos + dígitos verificadores).
 */

import { normalizeCnpj } from './normalize'

export function formatCnpjDisplay(cnpj: string): string {
  const d = normalizeCnpj(cnpj)
  if (d.length !== 14) return cnpj
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`
}

function calcDigit(slice: string, weights: number[]): number {
  let sum = 0
  for (let i = 0; i < weights.length; i++) {
    sum += parseInt(slice[i], 10) * weights[i]
  }
  const mod = sum % 11
  return mod < 2 ? 0 : 11 - mod
}

/** Retorna mensagem de erro ou null se válido. */
export function validateCnpj(raw: string): string | null {
  const digits = normalizeCnpj(raw)
  if (!digits) return 'CNPJ é obrigatório.'
  if (digits.length !== 14) return 'CNPJ deve ter 14 dígitos.'
  if (/^(\d)\1{13}$/.test(digits)) return 'CNPJ inválido.'

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2]
  const d1 = calcDigit(digits.slice(0, 12), w1)
  const d2 = calcDigit(digits.slice(0, 12) + String(d1), w2)

  if (d1 !== parseInt(digits[12], 10) || d2 !== parseInt(digits[13], 10)) {
    return 'CNPJ inválido (dígitos verificadores).'
  }
  return null
}

export function isValidCnpj(raw: string): boolean {
  return validateCnpj(raw) === null
}
