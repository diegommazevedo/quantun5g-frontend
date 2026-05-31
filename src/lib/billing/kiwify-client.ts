/**
 * Cliente HTTP Kiwify (OAuth client_credentials + rotas REST).
 * Docs: https://docs.kiwify.com.br/api-reference/general
 */

import { getKiwifyApiBase, getKiwifyCredentials, type KiwifyCredentials } from '@/lib/billing/kiwify-config'

export interface KiwifyOAuthToken {
  access_token: string
  token_type: string
  expires_in: string | number
  scope: string
}

export interface KiwifyPaginated<T> {
  pagination: { count: number; page_number: number; page_size: number }
  data: T[]
}

export interface KiwifyProduct {
  id: string
  name?: string
  type?: string
  price?: number
  currency?: string
  status?: string
  created_at?: string
  updated_at?: string
}

export interface KiwifyWebhook {
  id: string
  name: string
  url: string
  products: string | string[]
  triggers: string[]
  token?: string
  created_at?: string
  updated_at?: string
}

export interface KiwifyAccountDetails {
  id: string
  company_name?: string
  company_cnpj?: string
  director_cpf?: string
}

export interface KiwifySaleDetails {
  id: string
  reference?: string
  status?: string
  payment_method?: string
  net_amount?: number
  approved_date?: string | null
  product?: { id: string; name?: string }
  customer?: { email?: string; name?: string; cpf?: string; cnpj?: string }
  payment?: { charge_amount?: number; net_amount?: number }
  tracking?: {
    utm_content?: string | null
    utm_source?: string | null
    s1?: string | null
    s2?: string | null
  }
}

export interface KiwifyWebhookCreateResult {
  id: string
  name: string
  url: string
  token: string
  triggers: string[]
}

type TokenCache = {
  token: string
  expiresAtMs: number
  credsKey: string
}

let tokenCache: TokenCache | null = null

function credsKey(creds: KiwifyCredentials): string {
  return `${creds.clientId}:${creds.accountId}`
}

export async function fetchKiwifyOAuthToken(
  creds = getKiwifyCredentials(),
): Promise<KiwifyOAuthToken> {
  const base = getKiwifyApiBase()
  const body = new URLSearchParams({
    client_id: creds.clientId,
    client_secret: creds.clientSecret,
  })

  const res = await fetch(`${base}/oauth/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Kiwify OAuth → ${res.status}: ${text}`)
  }

  return JSON.parse(text) as KiwifyOAuthToken
}

export async function getKiwifyAccessToken(
  creds = getKiwifyCredentials(),
): Promise<string> {
  const key = credsKey(creds)
  const now = Date.now()
  if (tokenCache && tokenCache.credsKey === key && tokenCache.expiresAtMs > now + 60_000) {
    return tokenCache.token
  }

  const oauth = await fetchKiwifyOAuthToken(creds)
  const expiresInSec = Number(oauth.expires_in) || 86_400
  tokenCache = {
    token: oauth.access_token,
    expiresAtMs: now + expiresInSec * 1000,
    credsKey: key,
  }
  return oauth.access_token
}

export async function kiwifyRequest<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options?: { query?: Record<string, string | number | undefined>; body?: unknown },
): Promise<T> {
  const creds = getKiwifyCredentials()
  const token = await getKiwifyAccessToken(creds)
  const base = getKiwifyApiBase()
  const url = new URL(`${base}${path.startsWith('/') ? path : `/${path}`}`)

  if (options?.query) {
    for (const [k, v] of Object.entries(options.query)) {
      if (v != null && v !== '') url.searchParams.set(k, String(v))
    }
  }

  const res = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token}`,
      'x-kiwify-account-id': creds.accountId,
      Accept: 'application/json',
      ...(options?.body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: options?.body ? JSON.stringify(options.body) : undefined,
    cache: 'no-store',
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(`Kiwify ${method} ${path} → ${res.status}: ${text}`)
  }

  return text ? (JSON.parse(text) as T) : ({} as T)
}

export async function listKiwifyProducts(page = 1, pageSize = 20) {
  return kiwifyRequest<KiwifyPaginated<KiwifyProduct>>('GET', '/products', {
    query: { page_number: page, page_size: pageSize },
  })
}

export async function getKiwifyAccountDetails() {
  return kiwifyRequest<KiwifyAccountDetails>('GET', '/account-details')
}

export async function listKiwifyWebhooks(page = 1, pageSize = 10) {
  return kiwifyRequest<KiwifyPaginated<KiwifyWebhook>>('GET', '/webhooks', {
    query: { page_number: page, page_size: pageSize },
  })
}

export async function createKiwifyWebhook(body: {
  name: string
  url: string
  products: string
  triggers: string[]
  token: string
}) {
  return kiwifyRequest<KiwifyWebhookCreateResult>('POST', '/webhooks', { body })
}

export async function getKiwifySale(orderId: string) {
  return kiwifyRequest<KiwifySaleDetails>('GET', `/sales/${encodeURIComponent(orderId)}`)
}

/** Limpa cache de token (testes). */
export function resetKiwifyTokenCache(): void {
  tokenCache = null
}
