/**
 * QUANTUM5G — Supabase Proxy Client
 * Uso exclusivo de src/proxy.ts para refresh de sessão em cada request.
 * Não usar em componentes ou route handlers.
 */

import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import type { Database } from '@/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from './env'
import { supabaseClientOptions } from './options'
import { withDualScope } from '@/lib/auth/cookie-scope'
import { resolvePostAuthPath } from '@/lib/auth/post-auth-redirect'
import { isContratanteRole, isGerenteRole } from '@/lib/org/roles'
import type { UserRole } from '@/types/database'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      ...supabaseClientOptions,
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
    '/empresas',
    '/relatorio',
    '/admin',
    '/contratacao',
    '/faturas',
    '/nr01/dashboard',
    '/nr01/avaliacao',
    '/organizacao',  // contratante self-serve: equipe, filiais, configurações
  ]
  const pathname = request.nextUrl.pathname
  const isProtected = protectedPaths.some(path => pathname.startsWith(path))

  // Apex `/` → login (visitante) ou dashboard (sessão); ver src/app/page.tsx.
  // `/login` redireciona usuário autenticado para o painel.
  const isAuthPage = pathname === '/login'

  // Só valida com getUser() em rotas que realmente precisam de decisão de auth
  /** Cadastro de CNPJ novo — só consultor/admin; contratante vê filiais em /empresas */
  const staffOnlyPrefixes = ['/empresas/nova', '/nr01/empresas/nova', '/diagnostico/empresas/nova']
  const pentagramaAppPrefixes = ['/diagnostico', '/relatorio']
  const nr01AppPrefixes = ['/nr01/dashboard', '/nr01/avaliacao']
  const needsStaff = staffOnlyPrefixes.some((p) => pathname.startsWith(p))
  const needsPentagramaApp =
    pathname === '/dashboard' ||
    pentagramaAppPrefixes.some((p) => pathname.startsWith(p))
  const needsNr01Access = nr01AppPrefixes.some((p) => pathname.startsWith(p))

  if (isProtected || isAuthPage || needsStaff || needsNr01Access || needsPentagramaApp) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (!user && (isProtected || needsStaff || needsNr01Access || needsPentagramaApp)) {
      const url = request.nextUrl.clone()
      url.pathname = '/login'
      return NextResponse.redirect(url)
    }

    if (user && (isAuthPage || pathname === '/')) {
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('role, module_nr01, module_pentagrama')
        .eq('id', user.id)
        .single()
      const profile = profileRaw as {
        role: UserRole
        module_nr01: boolean
        module_pentagrama: boolean
      } | null
      const url = request.nextUrl.clone()
      url.pathname = profile
        ? resolvePostAuthPath({
            role: profile.role ?? 'consultant',
            module_nr01: profile.module_nr01,
            module_pentagrama: profile.module_pentagrama,
          })
        : '/dashboard'
      return NextResponse.redirect(url)
    }

    if (user && (needsStaff || needsNr01Access || needsPentagramaApp)) {
      const { data: profileRaw } = await supabase
        .from('profiles')
        .select('role, is_active, module_nr01, module_pentagrama')
        .eq('id', user.id)
        .single()

      const profile = profileRaw as {
        role: string
        is_active: boolean
        module_nr01: boolean
        module_pentagrama: boolean
      } | null

      if (profile?.is_active === false) {
        const url = request.nextUrl.clone()
        url.pathname = '/login'
        return NextResponse.redirect(url)
      }

      const role = profile?.role ?? 'consultant'

      if (
        needsStaff &&
        role !== 'admin' &&
        role !== 'consultant' &&
        !isContratanteRole(role) &&
        !isGerenteRole(role)
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/dashboard'
        url.searchParams.set(
          'error',
          'Cadastro de novas empresas é feito pelo consultor responsável.',
        )
        return NextResponse.redirect(url)
      }

      if (
        needsPentagramaApp &&
        role === 'leader' &&
        profile &&
        profile.module_pentagrama === false
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/faturas'
        url.searchParams.set(
          'error',
          'Módulo Pentagrama não habilitado. Emita fatura ou aguarde pagamento.',
        )
        return NextResponse.redirect(url)
      }

      if (
        needsPentagramaApp &&
        profile &&
        profile.module_pentagrama === false &&
        role === 'consultant'
      ) {
        const url = request.nextUrl.clone()
        url.pathname = '/contratacao'
        url.searchParams.set('error', 'Módulo Pentagrama não habilitado no seu perfil.')
        return NextResponse.redirect(url)
      }

      if (
        needsNr01Access &&
        profile &&
        profile.module_nr01 === false &&
        role !== 'admin'
      ) {
        const url = request.nextUrl.clone()
        url.pathname = role === 'leader' ? '/faturas' : '/dashboard'
        url.searchParams.set('error', 'Módulo NR-01 não habilitado. Emita fatura ou aguarde pagamento.')
        return NextResponse.redirect(url)
      }
    }
  }

  return supabaseResponse
}
