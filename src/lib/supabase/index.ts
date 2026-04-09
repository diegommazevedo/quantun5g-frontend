/**
 * QUANTUM5G — Re-exportações dos clientes Supabase
 *
 * Uso:
 *   Client Component:  import { createClient } from '@/lib/supabase/client'
 *   Server Component:  import { createClient } from '@/lib/supabase/server'
 *   Middleware:        import { updateSession } from '@/lib/supabase/middleware'
 */

export { createClient as createBrowserClient } from './client'
export { createClient as createServerClient } from './server'
export { updateSession } from './middleware'
