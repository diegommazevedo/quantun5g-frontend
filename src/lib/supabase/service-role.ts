/**
 * Cliente Supabase com service role — apenas em rotas de servidor
 * confiáveis (ex.: render interno de PDF após validação de token).
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Cliente Supabase com service_role — ignora RLS; usar só em rotas server/API. */
export function createServiceRoleClient(): SupabaseClient<Database> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios para service role.')
  }
  return createClient<Database>(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}

/**
 * Variante untyped do service-role client.
 *
 * Motivo: o supabase-js v2.100+ com PostgrestVersion 12 exige que o
 * Insert/Update Type ID exato definido em Database. As inserções/UPSERTs
 * dos patches mais antigos (P020, etc.) usam cliente untyped — esta
 * função apenas formaliza esse padrão para escritas em tabelas novas
 * (subscriptions, payments) sem propagar `as never` por todo lado.
 *
 * Use APENAS para .insert/.update/.upsert. Para SELECT, prefira
 * `createServiceRoleClient()` (mantém os tipos das Rows).
 */
export function createServiceRoleAdmin(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY são obrigatórios.')
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
}
