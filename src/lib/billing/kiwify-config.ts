/**
 * Configuração Kiwify — lê credenciais do ambiente.
 * Dashboard: Apps → API → API Key "Quantun5g"
 */

export interface KiwifyCredentials {
  clientId: string
  clientSecret: string
  accountId: string
}

export function getKiwifyCredentials(): KiwifyCredentials {
  const clientId =
    process.env.KIWIFY_CLIENT_ID?.trim() ?? process.env.client_id?.trim() ?? ''
  const clientSecret =
    process.env.KIWIFY_CLIENT_SECRET?.trim() ??
    process.env.KIWIFY_CLIENT_SECRET_API_KEY?.trim() ??
    ''
  const accountId =
    process.env.KIWIFY_ACCOUNT_ID?.trim() ?? process.env.account_id?.trim() ?? ''

  const missing: string[] = []
  if (!clientId) missing.push('KIWIFY_CLIENT_ID (ou client_id)')
  if (!clientSecret) missing.push('KIWIFY_CLIENT_SECRET (ou KIWIFY_CLIENT_SECRET_API_KEY)')
  if (!accountId) missing.push('KIWIFY_ACCOUNT_ID (ou account_id)')

  if (missing.length) {
    throw new Error(`Credenciais Kiwify incompletas: ${missing.join(', ')}`)
  }

  return { clientId, clientSecret, accountId }
}

export function getKiwifyApiBase(): string {
  return (process.env.KIWIFY_API_BASE ?? 'https://public-api.kiwify.com/v1').replace(/\/$/, '')
}
