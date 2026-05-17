/**
 * QUANTUM5G — Cookie scope helper para SSO entre subdomínios.
 *
 * Em produção, cookies do Supabase precisam de domain=.quantun5g.app
 * para serem visíveis em todos os subdomínios (apex, pentagrama,
 * nr01). Em desenvolvimento (localhost), domain ausente é o correto
 * — definir domain quebra o cookie.
 */

import type { CookieOptions } from '@supabase/ssr'

export const COOKIE_DOMAIN = '.quantun5g.app'

/**
 * Aplica domain=.quantun5g.app apenas em produção.
 * Em qualquer outro NODE_ENV, retorna as opções inalteradas.
 */
export function withDualScope(options: CookieOptions): CookieOptions {
  if (process.env.NODE_ENV !== 'production') return options
  return { ...options, domain: COOKIE_DOMAIN }
}
