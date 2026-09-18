/**
 * QUANTUM5G — Next.js Proxy (ex-middleware)
 *
 * 1. Refresh de sessão Supabase
 * 2. Subdomínio de produto: usuário autenticado acessa o app;
 *    visitante sem sessão → paywall
 */

import { type NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@supabase/ssr'
import { updateSession } from '@/lib/supabase/middleware'
import { getProductFromRequest } from '@/lib/routing/subdomain'
import { PRODUCTS } from '@/lib/products/registry'
import { hasActiveSubscriptionForRequest } from '@/lib/billing/subscription'
import { getSupabasePublishableKey, getSupabaseUrl } from '@/lib/supabase/env'

const SUBDOMAIN_PUBLIC_PREFIXES = [
  '/lp',
  '/checkout',
  '/paywall',
  '/login',
  '/institucional',
  '/api/billing',
  '/api/auth',
  '/coleta',
  '/status',
]

export async function proxy(request: NextRequest) {
  const sessionResponse = await updateSession(request)

  if (sessionResponse.headers.get('location')) {
    return sessionResponse
  }

  const product = getProductFromRequest(request)
  if (!product) return sessionResponse

  const pathname = request.nextUrl.pathname
  const isPublicInProduct = SUBDOMAIN_PUBLIC_PREFIXES.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  )
  if (isPublicInProduct) return sessionResponse

  const hasSub = await hasActiveSubscriptionForRequest(request, product)
  if (hasSub) return sessionResponse

  // Qualquer usuário logado acessa o módulo (política: módulos liberados).
  const supabase = createServerClient(getSupabaseUrl(), getSupabasePublishableKey(), {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll() {
        /* no-op — updateSession já refrescou cookies */
      },
    },
  })
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (user) return sessionResponse

  const url = request.nextUrl.clone()
  url.pathname = PRODUCTS[product].paywallPath
  url.search = ''
  return NextResponse.redirect(url)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|formulario/|api/(?!billing)|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
