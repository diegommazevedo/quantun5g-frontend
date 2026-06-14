/**
 * URL pública da aplicação — nunca localhost em e-mails ou links de convite.
 */

export const PRODUCTION_APP_URL = 'https://www.quantun5g.app'

export function resolveAppBaseUrl(): string {
  if (process.env.VERCEL_ENV === 'production' || process.env.NODE_ENV === 'production') {
    return PRODUCTION_APP_URL
  }

  const candidates = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : null,
    process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : null,
  ]
  for (const raw of candidates) {
    if (!raw?.trim()) continue
    const base = raw.replace(/\/$/, '')
    if (/localhost|127\.0\.0\.1/i.test(base)) continue
    return base
  }
  return PRODUCTION_APP_URL
}

/** Força redirect_to de produção no link Supabase (evita Site URL localhost). */
export function rewriteSupabaseAuthActionLink(actionLink: string, redirectTo: string): string {
  try {
    const url = new URL(actionLink)
    url.searchParams.set('redirect_to', redirectTo)
    const fixed = url.toString()
    return fixed.replace(/redirect_to=[^&]*localhost[^&]*/i, `redirect_to=${encodeURIComponent(redirectTo)}`)
  } catch {
    return actionLink
  }
}

export function buildAuthCallbackUrl(nextPath: string): string {
  const next = nextPath.startsWith('/') ? nextPath : `/${nextPath}`
  return `${resolveAppBaseUrl()}/auth/callback?next=${encodeURIComponent(next)}`
}
