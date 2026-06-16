/**
 * Rótulos de exibição para listagem/supervisão de faturas comerciais.
 */

import { formatBrl, formatBillingLabel, parseTierPlanId } from '@/lib/billing/nr01-catalog'
import { formatInvoiceProductPt } from '@/lib/billing/commercial-invoice'
import { getPentagramaPlan } from '@/lib/billing/pentagrama-catalog'
import { formatCnpjDisplay } from '@/lib/companies/cnpj'
import { formatCompanyCnpjSlotsShort, slotsFromMetadata } from '@/lib/licensing/company-cnpj-slots'
import type { CommercialInvoice } from '@/types/database'

export interface CommercialInvoiceListRow {
  invoice: CommercialInvoice
  clientName: string | null
  clientEmail: string | null
  clientCnpj: string | null
  clientWhatsapp: string | null
  companyName: string | null
  consultantName: string | null
}

function metaStr(meta: Record<string, unknown>, key: string): string | null {
  const v = meta[key]
  return typeof v === 'string' && v.trim() ? v.trim() : null
}

export function formatWhatsappDisplay(raw: string | null): string | null {
  if (!raw) return null
  const d = raw.replace(/\D/g, '')
  if (d.length < 10) return raw
  if (d.length === 11) return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
  if (d.length >= 12) return `+${d.slice(0, 2)} (${d.slice(2, 4)}) ${d.slice(4, 9)}-${d.slice(9, 13)}`
  return raw
}

export function invoiceContractLines(inv: CommercialInvoice): {
  productLabel: string
  planDetail: string
  scopeDetail: string
} {
  const meta = (inv.metadata ?? {}) as Record<string, unknown>
  const tier = parseTierPlanId(inv.plan_id)
  const pentPlan = getPentagramaPlan(inv.plan_id)
  const productLabel = formatInvoiceProductPt(
    inv.product_id,
    inv.include_pentagrama,
    meta,
  )

  const tierLabel = pentPlan?.name ?? (tier ? tier.toUpperCase() : inv.plan_id)
  const billing =
    inv.product_id === 'nr01' || meta.invoice_kind === 'combo'
      ? formatBillingLabel(inv.billing_mode)
      : null
  const planDetail = [tierLabel, billing].filter(Boolean).join(' · ')

  const parts: string[] = []
  if (inv.headcount_declared != null && inv.headcount_declared > 0) {
    parts.push(`${inv.headcount_declared} trab.`)
  } else if (typeof meta.worker_min === 'number') {
    const max = meta.worker_max
    parts.push(
      max != null ? `Faixa ${meta.worker_min}–${max} trab.` : `Faixa ${meta.worker_min}+ trab.`,
    )
  }
  parts.push(formatCompanyCnpjSlotsShort(slotsFromMetadata(meta)))
  const scopeDetail = parts.join(' · ')

  return { productLabel, planDetail, scopeDetail }
}

export function invoiceClientFromMeta(inv: CommercialInvoice): {
  cnpj: string | null
  whatsapp: string | null
  companyName: string | null
  email: string | null
} {
  const meta = (inv.metadata ?? {}) as Record<string, unknown>
  const cnpjRaw = metaStr(meta, 'client_cnpj')
  return {
    cnpj: cnpjRaw ? formatCnpjDisplay(cnpjRaw) : null,
    whatsapp: formatWhatsappDisplay(metaStr(meta, 'client_whatsapp')),
    companyName: metaStr(meta, 'client_company_name'),
    email: metaStr(meta, 'client_email'),
  }
}

export function buildInvoiceListRow(
  inv: CommercialInvoice,
  lookups?: {
    profilesById?: Map<string, { name: string | null; email: string | null }>
    companiesById?: Map<string, { name: string }>
    companiesByCnpj?: Map<string, { name: string }>
  },
): CommercialInvoiceListRow {
  const fromMeta = invoiceClientFromMeta(inv)
  const profile = lookups?.profilesById?.get(inv.user_id)
  const company = inv.company_id ? lookups?.companiesById?.get(inv.company_id) : null
  const consultant = lookups?.profilesById?.get(inv.consultant_id)
  const cnpjDigits = fromMeta.cnpj?.replace(/\D/g, '') ?? ''
  const companyByCnpj = cnpjDigits ? lookups?.companiesByCnpj?.get(cnpjDigits) : null

  // Contrato comercial: metadata.client_email é o contratante; user_id pode ser o consultor operador.
  const hasContractClient = Boolean(fromMeta.email || fromMeta.companyName)

  return {
    invoice: inv,
    clientName: hasContractClient
      ? (fromMeta.companyName ??
          companyByCnpj?.name ??
          company?.name ??
          profile?.name ??
          null)
      : (profile?.name ?? fromMeta.companyName ?? company?.name ?? null),
    clientEmail: fromMeta.email ?? profile?.email ?? null,
    clientCnpj: fromMeta.cnpj,
    clientWhatsapp: fromMeta.whatsapp,
    companyName: company?.name ?? companyByCnpj?.name ?? fromMeta.companyName ?? null,
    consultantName: consultant?.name ?? null,
  }
}

export function formatInvoiceNotesPreview(notes: string | null, max = 48): string | null {
  if (!notes?.trim()) return null
  const t = notes.trim()
  return t.length <= max ? t : `${t.slice(0, max)}…`
}

export { formatBrl }
