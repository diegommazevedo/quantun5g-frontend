/**
 * /contratacao — DESCONTINUADO (fatura presencial).
 * Redireciona para o funil Kiwify (LP NR-01).
 */

import { redirect } from 'next/navigation'
import { nr01PurchaseHref } from '@/lib/billing/sales-path'

export default function ContratacaoRedirectPage() {
  redirect(nr01PurchaseHref('contratar'))
}
