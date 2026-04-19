/**
 * QUANTUM5G — Supabase Server Client (SSR)
 * Uso: Server Components, Route Handlers, Server Actions, Middleware.
 * Lê e escreve cookies via next/headers para manter sessão autenticada.
 */

import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'
import type { Database } from '@/types/database'
import { getSupabasePublishableKey, getSupabaseUrl } from './env'

export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient<Database>(
    getSupabaseUrl(),
    getSupabasePublishableKey(),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // Server Component não pode setar cookies — ignorar.
            // O Middleware cuida da atualização da sessão.
          }
        },
      },
    }
  )
}
