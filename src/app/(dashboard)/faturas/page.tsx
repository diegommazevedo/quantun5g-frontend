/**
 * /faturas — DESCONTINUADO (fatura presencial).
 * Histórico legado: redireciona para checkout Kiwify.
 */

import { redirect } from 'next/navigation'
import { nr01LicenseRequiredHref } from '@/lib/billing/sales-path'

export default function FaturasRedirectPage() {
  redirect(nr01LicenseRequiredHref('licenca'))
}
