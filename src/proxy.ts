/**
 * QUANTUM5G — Next.js Proxy (ex-middleware, renomeado em Next.js 16)
 * Refresh de sessão Supabase em cada request.
 * Proteção de rotas autenticadas.
 */

import { type NextRequest } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function proxy(request: NextRequest) {
  return await updateSession(request)
}

export const config = {
  matcher: [
    /*
     * Aplica proxy a todos os paths exceto:
     * - _next/static (arquivos estáticos)
     * - _next/image (otimização de imagens)
     * - favicon.ico
     * - rotas de formulário público (il e ic via token — sem auth)
     */
    '/((?!_next/static|_next/image|favicon.ico|formulario/|api/|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|css|js)$).*)',
  ],
}
