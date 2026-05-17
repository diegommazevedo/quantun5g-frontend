/**
 * QUANTUM5G — Supabase Proxy Client
 * Uso exclusivo de src/proxy.ts para refresh de sessão em cada request.
 * Não usar em componentes ou route handlers.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from './env'
import { withDualScope } from '@/lib/auth/cookie-scope'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          // P021: domain=.quantun5g.app em produção para SSO entre
          // apex e subdomínios (pentagrama., nr01.). Em dev, no-op.
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, withDualScope(options))
          )
        },
      },
    }
  )

  // Rotas protegidas — redireciona para login se não autenticado.
  // /nr01/coleta/* é PÚBLICO (questionário anônimo), por isso o startsWith é
  // checado em /nr01/dashboard e /nr01/avaliacao explicitamente.
  const protectedPaths = [
    '/dashboard',
    '/diagnostico',
    '/relatorio',
    '/admin',
    '/nr01/dashboard',
    '/nr01/avaliacao',
  ]
  const pathname = request.nextUrl.pathname
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  // P021: a rota raiz `/` agora é o apex shell (server component que
  // decide redirect ↔ dashboard de produtos). NÃO redireciona aqui.
  // Apenas /login redireciona logged-in users para o apex.
  const isAuthPage = pathname === '/login'

  // Só valida com getUser() em rotas que realmente precisam de decisão de auth
  if (isProtected || isAuthPage) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && isProtected) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && isAuthPage) {
      const url = request.nextUrl.clone()
      url.pathname = '/'
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
