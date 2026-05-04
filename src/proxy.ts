/**
 * QUANTUM5G — Next.js Proxy (ex-middleware, renomeado em Next.js 16)
 *
 * Responsabilidades:
 *  1. Refresh de sessão Supabase em cada request (delegado a updateSession).
 *  2. P021: detecção de subdomínio (pentagrama./nr01./apex) e gating de
 *     acesso por assinatura ativa quando a request entra em rota privada
 *     dentro de um subdomínio de produto.
 *
 *  Em desenvolvimento (localhost), o subdomínio pode ser simulado via
 *  query `?subdomain=pentagrama` ou `?subdomain=nr01`.
 */

import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'
import { getProductFromRequest } from '@/lib/routing/subdomain'
import { PRODUCTS } from '@/lib/products/registry'
import { hasActiveSubscriptionForRequest } from '@/lib/billing/subscription'

// Rotas públicas dentro de qualquer subdomínio (não exigem assinatura).
const SUBDOMAIN_PUBLIC_PREFIXES = [
  '/lp',
  '/checkout',
  '/paywall',
  '/login',
  '/institucional',
  '/api/billing',
  '/api/auth',
]

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request)

  // Se updateSession já decidiu redirecionar (login etc.), respeita.
  if (sessionResponse.headers.get('location')) {
    return sessionResponse
  }

  const product = getProductFromRequest(request)
  if (!product) return sessionResponse

  const pathname = request.nextUrl.pathname
  const isPublicInProduct = SUBDOMAIN_PUBLIC_PREFIXES.some(
    p => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (isPublicInProduct) return sessionResponse

  // Subdomínio de produto + rota privada → exige assinatura ativa.
  const hasSub = await hasActiveSubscriptionForRequest(request, product)
  if (hasSub) return sessionResponse

  const url = request.nextUrl.clone()
  url.pathname = PRODUCTS[product].paywallPath
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    /*
     * Aplica proxy a todos os paths exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - rotas de formulário público (il e ic via token — sem auth)
     * - assets estáticos comuns
     */
    '/((?!_next/static|_next/image|favicon.ico|formulario/|api/(?!billing)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
