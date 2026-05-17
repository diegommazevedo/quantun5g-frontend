/**
 * QUANTUM5G — Detecção de subdomínio para a arquitetura dual.
 * Funciona tanto em proxy (NextRequest) quanto via host string puro.
 *
 * Em desenvolvimento (localhost), suporta override via query
 * `?subdomain=pentagrama` ou `?subdomain=nr01`, já que cookies
 * com escopo .quantum5g.app não funcionam em http://localhost.
 */

import type { NextRequest } from 'next/server'
import { type ProductId, getProductBySubdomain } from '@/lib/products/registry'

export const APP_DOMAIN = 'quantum5g.app'

export function detectSubdomainFromHost(
  host: string | null | undefined,
  searchOverride?: string | null,
): string | null {
  if (!host) return searchOverride ?? null
  const hostname = host.split(':')[0].toLowerCase()

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return searchOverride ?? null
  }

  if (hostname === APP_DOMAIN) return null
  if (!hostname.endsWith(`.${APP_DOMAIN}`)) return null

  return hostname.slice(0, -APP_DOMAIN.length - 1)
}

export function detectSubdomain(request: NextRequest): string | null {
  const host = request.headers.get('host')
  const override = request.nextUrl.searchParams.get('subdomain')
  return detectSubdomainFromHost(host, override)
}

export function getProductFromRequest(request: NextRequest): ProductId | null {
  const sub = detectSubdomain(request)
  if (!sub) return null
  return getProductBySubdomain(sub)?.id ?? null
}
