/**
 * Supabase env helpers.
 * Accepts the new publishable key name and keeps anon key as backward-compatible fallback.
 */

function requireEnv(name: string, value: string | undefined) {
  if (!value) throw new Error(`Missing required environment variable: ${name}`)
  return value
}

export function getSupabaseUrl() {
  return requireEnv('NEXT_PUBLIC_SUPABASE_URL', process.env.NEXT_PUBLIC_SUPABASE_URL)
}

export function getSupabasePublishableKey() {
  const publishable = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return requireEnv(
    'NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (or NEXT_PUBLIC_SUPABASE_ANON_KEY fallback)',
    publishable ?? anon
  )
}

