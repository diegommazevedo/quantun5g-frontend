/**
 * QUANTUM5G — Supabase Proxy Client
 * Uso exclusivo de src/proxy.ts para refresh de sessão em cada request.
 * Não usar em componentes ou route handlers.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
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
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANTE: não usar getUser() com getSession() — getUser() valida no servidor
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // Rotas protegidas — redireciona para login se não autenticado
  const protectedPaths = ['/dashboard', '/diagnostico', '/relatorio', '/admin']
  const isProtected = protectedPaths.some(path =>
    request.nextUrl.pathname.startsWith(path)
  )

  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // Redireciona usuário autenticado que tenta acessar / ou /login
  if (user && (request.nextUrl.pathname === '/' || request.nextUrl.pathname === '/login')) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}
