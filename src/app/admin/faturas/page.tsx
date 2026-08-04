/**
 * /admin/faturas — DESCONTINUADO (aprovar/pagar presencial).
 * Mantém a rota só para não quebrar bookmarks; redireciona ao painel.
 */

import { redirect } from 'next/navigation'

export default function AdminFaturasRedirectPage() {
  redirect('/admin')
}
