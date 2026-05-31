/**
 * QUANTUM5G — Cliente HTTP do Asaas (gateway de pagamento).
 *
 * Documentação: https://docs.asaas.com/reference
 * Base URLs:
 *   - Produção: https://api.asaas.com/v3
 *   - Sandbox:  https://api-sandbox.asaas.com/v3
 *
 * Configurar:
 *   ASAAS_API_KEY        (obrigatório)
 *   ASAAS_API_BASE       (opcional; default: sandbox)
 *   ASAAS_WEBHOOK_TOKEN  (obrigatório para validar webhooks)
 */

import { createHash, timingSafeEqual } from 'crypto'

const DEFAULT_BASE = 'https://api-sandbox.asaas.com/v3'

export function isAsaasConfigured(): boolean {
  return Boolean(process.env.ASAAS_API_KEY?.trim())
}

function getApiKey(): string {
  const key = process.env.ASAAS_API_KEY
  if (!key) throw new Error('ASAAS_API_KEY não configurado')
  return key
}

function getBaseUrl(): string {
  return process.env.ASAAS_API_BASE ?? DEFAULT_BASE
}

async function asaas<T>(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  body?: unknown,
): Promise<T> {
  const res = await fetch(`${getBaseUrl()}${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      'access_token': getApiKey(),
      'User-Agent': 'Quantum5G/1.0',
    },
    body: body ? JSON.stringify(body) : undefined,
    cache: 'no-store',
  })

  if (!res.ok) {
    const text = await res.text()
    throw new Error(`Asaas ${method} ${path} → ${res.status}: ${text}`)
  }

  return res.json() as Promise<T>
}

// ── Customers ─────────────────────────────────────────────────

export interface AsaasCustomer {
  id: string
  name: string
  email?: string
  cpfCnpj?: string
  phone?: string
}

export interface CustomerInput {
  name: string
  email: string
  cpfCnpj: string
  phone?: string
}

export async function findCustomerByCpfCnpj(
  cpfCnpj: string,
): Promise<AsaasCustomer | null> {
  const res = await asaas<{ data: AsaasCustomer[] }>(
    'GET',
    `/customers?cpfCnpj=${encodeURIComponent(cpfCnpj)}`,
  )
  return res.data[0] ?? null
}

export async function createCustomer(
  input: CustomerInput,
): Promise<AsaasCustomer> {
  return asaas<AsaasCustomer>('POST', '/customers', input)
}

export async function findOrCreateCustomer(
  input: CustomerInput,
): Promise<AsaasCustomer> {
  const existing = await findCustomerByCpfCnpj(input.cpfCnpj)
  if (existing) return existing
  return createCustomer(input)
}

// ── Payments ──────────────────────────────────────────────────

export type AsaasBillingType = 'BOLETO' | 'CREDIT_CARD' | 'PIX' | 'UNDEFINED'

export interface PaymentInput {
  customer: string
  billingType: AsaasBillingType
  value: number
  dueDate: string
  description?: string
  externalReference?: string
}

export interface AsaasPayment {
  id: string
  status: string
  value: number
  dueDate: string
  invoiceUrl?: string
  bankSlipUrl?: string
  pixTransaction?: { qrCode?: { payload?: string } }
  externalReference?: string
}

export async function createPayment(
  input: PaymentInput,
): Promise<AsaasPayment> {
  return asaas<AsaasPayment>('POST', '/payments', input)
}

export async function getPayment(id: string): Promise<AsaasPayment> {
  return asaas<AsaasPayment>('GET', `/payments/${id}`)
}

// ── Webhook auth ──────────────────────────────────────────────

/**
 * Valida o header `asaas-access-token` do webhook em tempo
 * constante (proteção contra timing attack).
 */
export function verifyWebhookToken(received: string | null): boolean {
  const expected = process.env.ASAAS_WEBHOOK_TOKEN
  if (!expected || !received) return false
  // hash + timingSafeEqual: tamanhos diferentes não vazam por length
  const a = createHash('sha256').update(expected).digest()
  const b = createHash('sha256').update(received).digest()
  try {
    return timingSafeEqual(a, b)
  } catch {
    return false
  }
}
