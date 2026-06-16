/**
 * Enriquece faturas com perfil (cliente/consultor) e empresa para listagens.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { buildInvoiceListRow, type CommercialInvoiceListRow } from '@/lib/billing/commercial-invoice-display'
import type { CommercialInvoice } from '@/types/database'

export async function enrichCommercialInvoices(
  admin: SupabaseClient,
  invoices: CommercialInvoice[],
): Promise<CommercialInvoiceListRow[]> {
  if (invoices.length === 0) return []

  const profileIds = new Set<string>()
  const companyIds = new Set<string>()
  for (const inv of invoices) {
    profileIds.add(inv.user_id)
    profileIds.add(inv.consultant_id)
    if (inv.company_id) companyIds.add(inv.company_id)
  }

  const profilesById = new Map<string, { name: string | null; email: string | null }>()
  const companiesById = new Map<string, { name: string }>()
  const companiesByCnpj = new Map<string, { name: string }>()

  const profileIdList = [...profileIds]
  if (profileIdList.length > 0) {
    const { data: profiles } = await admin
      .from('profiles')
      .select('id, name, email')
      .in('id', profileIdList)
    for (const p of profiles ?? []) {
      profilesById.set(p.id as string, {
        name: (p.name as string | null) ?? null,
        email: (p.email as string | null) ?? null,
      })
    }
  }

  const companyIdList = [...companyIds]
  if (companyIdList.length > 0) {
    const { data: companies } = await admin
      .from('companies')
      .select('id, name, cnpj')
      .in('id', companyIdList)
    for (const c of companies ?? []) {
      companiesById.set(c.id as string, { name: c.name as string })
    }
  }

  const cnpjDigitsList = new Set<string>()
  for (const inv of invoices) {
    const meta = (inv.metadata ?? {}) as Record<string, unknown>
    const raw = meta.client_cnpj
    if (typeof raw === 'string' && raw.trim()) {
      cnpjDigitsList.add(raw.replace(/\D/g, ''))
    }
  }
  if (cnpjDigitsList.size > 0) {
    const { data: byCnpj } = await admin
      .from('companies')
      .select('name, cnpj')
      .in('cnpj', [...cnpjDigitsList])
    for (const c of byCnpj ?? []) {
      const digits = (c.cnpj as string).replace(/\D/g, '')
      companiesByCnpj.set(digits, { name: c.name as string })
    }
  }

  return invoices.map((inv) =>
    buildInvoiceListRow(inv, { profilesById, companiesById, companiesByCnpj }),
  )
}
