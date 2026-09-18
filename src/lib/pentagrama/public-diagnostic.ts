/**
 * Carrega diagnóstico Pentagrama para rotas públicas /il/[token] e /ic/[token].
 * O token é o segredo; service role evita RLS que bloqueia anon.
 */

import { createServiceRoleClient } from '@/lib/supabase/service-role'

export type PentagramaPublicDiagnostic = {
  id: string
  name: string
  status: string
  leader_name: string | null
  il_submitted_at: string | null
  companyId: string
  companyName: string
}

function mapRow(
  row: {
    id: string
    name: string
    status: string
    leader_name: string | null
    il_submitted_at: string | null
    company_id: string
    companies: { name: string } | { name: string }[] | null
  } | null,
): PentagramaPublicDiagnostic | null {
  if (!row) return null
  const companies = row.companies
  const companyName = Array.isArray(companies) ? companies[0]?.name : companies?.name
  return {
    id: row.id,
    name: row.name,
    status: row.status,
    leader_name: row.leader_name,
    il_submitted_at: row.il_submitted_at,
    companyId: row.company_id,
    companyName: companyName ?? '',
  }
}

export async function resolveDiagnosticByIcToken(
  token: string,
): Promise<PentagramaPublicDiagnostic | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('diagnostics')
    .select('id, name, status, leader_name, il_submitted_at, company_id, companies(name)')
    .eq('ic_token', token)
    .maybeSingle()

  return mapRow(
    data as {
      id: string
      name: string
      status: string
      leader_name: string | null
      il_submitted_at: string | null
      company_id: string
      companies: { name: string } | null
    } | null,
  )
}

export async function resolveDiagnosticByIlToken(
  token: string,
): Promise<PentagramaPublicDiagnostic | null> {
  const admin = createServiceRoleClient()
  const { data } = await admin
    .from('diagnostics')
    .select('id, name, status, leader_name, il_submitted_at, company_id, companies(name)')
    .eq('il_token', token)
    .maybeSingle()

  return mapRow(
    data as {
      id: string
      name: string
      status: string
      leader_name: string | null
      il_submitted_at: string | null
      company_id: string
      companies: { name: string } | null
    } | null,
  )
}
