/**
 * LICENSING_V2 — consultor licenciado = único ator comercial (paga, opera, gerencia CNPJs).
 * Flag off em produção até validação; ative com NEXT_PUBLIC_LICENSING_V2=true.
 */

export function isLicensingV2(): boolean {
  return process.env.NEXT_PUBLIC_LICENSING_V2 === 'true'
}

/** Papel efetivo na UI quando V2 unifica consultor + antigo "leader". */
export function isLicensedOperatorRole(role: string): boolean {
  if (isLicensingV2()) {
    return role === 'consultant' || role === 'admin' || role === 'leader'
  }
  return role === 'consultant' || role === 'admin'
}

export type CommercialPlan = 'b2c' | 'b2b'

export function parseCommercialPlan(raw: string | null | undefined): CommercialPlan {
  return raw === 'b2b' ? 'b2b' : 'b2c'
}
