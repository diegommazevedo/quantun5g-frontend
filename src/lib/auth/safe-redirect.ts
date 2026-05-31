/** Aceita apenas paths internos relativos (evita open redirect). */
export function safeRedirectPath(raw: string | null | undefined): string | null {
  if (!raw) return null
  const path = raw.trim()
  if (!path.startsWith('/') || path.startsWith('//')) return null
  if (path.includes('://')) return null
  return path
}
