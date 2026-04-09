/**
 * QUANTUM5G — Supabase Browser Client
 * Uso: componentes Client Components e hooks no lado do cliente.
 * Singleton para evitar múltiplas instâncias no mesmo navegador.
 */

import { createBrowserClient } from '@supabase/ssr'
import type { Database } from '@/types/database'

let client: ReturnType<typeof createBrowserClient<Database>> | null = null

export function createClient() {
  if (client) return client

  client = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  )

  return client
}
