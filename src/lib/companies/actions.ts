'use server'

/**
 * CRUD de empresas (companies) — unificado NR-01 + Pentagrama.
 */

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CompanyInsert } from '@/types/database'
import { normalizeCnpj, normalizeCompanyName } from '@/lib/companies/normalize'
import { validateCnpj, isValidCnpj } from '@/lib/companies/cnpj'
import { parseIlLeadersJson, validateIlLeaders } from '@/lib/companies/il-leaders'
import { parseContactsJson, type ContactInput } from '@/lib/companies/contacts'
import { companyHasTechnicalLead } from '@/lib/nr01/technical-lead'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'
import { isPlatformStaff } from '@/lib/auth/roles'
import type { UserRole } from '@/types/database'
import { assignCompanyAccountUser, resolveUserIdByEmail } from '@/lib/companies/assign-account-user'
import { isLicensingV2 } from '@/lib/licensing/model'
import { assertCanAddConsultantCompany } from '@/lib/licensing/company-cnpj-slots'

async function authConsultant() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'
  if (!isPlatformStaff(role) && role !== 'leader') redirect('/dashboard')
  return { supabase, user, role }
}

async function maybeAssignPayerFromForm(
  formData: FormData,
  role: UserRole,
  companyId: string,
  onError: (message: string) => never,
): Promise<void> {
  const payerEmail = (formData.get('account_user_email') as string)?.trim()
  if (!payerEmail || !isPlatformStaff(role)) return
  const leaderId = await resolveUserIdByEmail(payerEmail)
  if (!leaderId) {
    onError('E-mail do cliente pagante não encontrado no sistema.')
  }
  try {
    await assignCompanyAccountUser(companyId, leaderId)
  } catch (e) {
    onError(e instanceof Error ? e.message : 'Falha ao vincular cliente')
  }
}

/** Mensagens amigáveis quando o remoto não recebeu migrations. */
function mapDbError(message: string): string {
  const m = message.toLowerCase()
  if (m.includes('schema cache') || m.includes('could not find the') || m.includes('does not exist')) {
    return [
      'Banco remoto desatualizado (colunas/tabelas faltando).',
      'No Supabase Dashboard → SQL Editor, execute o arquivo supabase/apply-pending-remote.sql.',
      'Ou: node --env-file=.env.local scripts/apply-pending-migrations.mjs (com DATABASE_URL).',
    ].join(' ')
  }
  return message
}

async function assertSchemaReady(
  supabase: Awaited<ReturnType<typeof createClient>>,
): Promise<string | null> {
  const { error } = await supabase.from('companies').select('cnpj, name_normalized').limit(0)
  if (error) return mapDbError(error.message)
  const { error: ec } = await supabase.from('company_contacts').select('id').limit(0)
  if (ec) return mapDbError(ec.message)
  return null
}

function companyFormFields(formData: FormData) {
  const name = (formData.get('name') as string)?.trim()
  const legalName = (formData.get('legal_name') as string)?.trim() || null
  const tradeName = (formData.get('trade_name') as string)?.trim() || null
  const cnpjRaw = (formData.get('cnpj') as string)?.trim() || ''
  const cnpj = normalizeCnpj(cnpjRaw)
  const total = parseInt(formData.get('total_collaborators') as string, 10) || 0
  const rhName = (formData.get('rh_contact_name') as string)?.trim() || null
  const rhEmail = (formData.get('rh_contact_email') as string)?.trim() || null
  const rtName = (formData.get('technical_lead_name') as string)?.trim() || null
  const rtCrp = (formData.get('technical_lead_crp') as string)?.trim() || null
  const rtProfession = (formData.get('technical_lead_profession') as string)?.trim() || 'Psicólogo'
  const rtEmail = (formData.get('technical_lead_email') as string)?.trim() || null
  const ilLeaders = parseIlLeadersJson(formData.get('il_leaders_json') as string)
  const collaborators = parseContactsJson(formData.get('collaborators_json') as string).filter(
    (c) => c.contact_role === 'collaborator',
  )

  return {
    name,
    legalName,
    tradeName,
    cnpj,
    total,
    rhName,
    rhEmail,
    rtName,
    rtCrp,
    rtProfession,
    rtEmail,
    ilLeaders,
    collaborators,
  }
}

function validateCompanyPayload(fields: ReturnType<typeof companyFormFields>): string | null {
  if (!fields.name || fields.total <= 0) {
    return 'Preencha razão/nome e total de colaboradores.'
  }
  const cnpjErr = validateCnpj(fields.cnpj)
  if (cnpjErr) return cnpjErr
  if (!fields.rtName || !fields.rtCrp) {
    return 'Informe nome e CRP do responsável técnico assinante.'
  }
  const ilErr = validateIlLeaders(fields.ilLeaders)
  if (ilErr) return ilErr
  return validateCollaborators(fields.ilLeaders, fields.collaborators)
}

function validateCollaborators(
  leaders: ReturnType<typeof parseIlLeadersJson>,
  collaborators: ContactInput[],
): string | null {
  const leaderEmails = new Set(leaders.map((l) => l.email.toLowerCase()))
  const seen = new Set<string>()
  for (const c of collaborators) {
    if (!c.full_name || !c.email.includes('@')) {
      return 'Colaborador: preencha nome e e-mail válidos ou remova a linha vazia.'
    }
    if (leaderEmails.has(c.email)) {
      return `E-mail ${c.email} já está na liderança IL.`
    }
    if (seen.has(c.email)) return `E-mail duplicado entre colaboradores: ${c.email}`
    seen.add(c.email)
  }
  return null
}

async function assertNoDuplicate(
  supabase: Awaited<ReturnType<typeof createClient>>,
  consultantId: string,
  name: string,
  cnpj: string,
  excludeId?: string,
) {
  const nameNorm = normalizeCompanyName(name)

  let nameQuery = supabase
    .from('companies')
    .select('id, name')
    .eq('consultant_id', consultantId)
    .eq('name_normalized', nameNorm)
  if (excludeId) nameQuery = nameQuery.neq('id', excludeId)
  const { data: byName } = await nameQuery.maybeSingle()
  if (byName) {
    return `Já existe empresa "${(byName as { name: string }).name}" com nome equivalente.`
  }

  let cnpjQuery = supabase.from('companies').select('id, name').eq('cnpj', cnpj)
  if (excludeId) cnpjQuery = cnpjQuery.neq('id', excludeId)
  const { data: byCnpj } = await cnpjQuery.maybeSingle()
  if (byCnpj) {
    return `CNPJ já cadastrado para "${(byCnpj as { name: string }).name}".`
  }

  return null
}

async function syncIlLeaders(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  leaders: ReturnType<typeof parseIlLeadersJson>,
): Promise<string | null> {
  const { data: existing, error: loadErr } = await supabase
    .from('company_contacts')
    .select('id, email')
    .eq('company_id', companyId)
    .eq('contact_role', 'leader')

  if (loadErr) return mapDbError(loadErr.message)

  const existingEmails = new Set(
    ((existing ?? []) as { email: string }[]).map((e) => e.email.toLowerCase()),
  )
  const leaderEmails = new Set(leaders.map((l) => l.email.toLowerCase()))

  for (const row of (existing ?? []) as { id: string; email: string }[]) {
    if (!leaderEmails.has(row.email.toLowerCase())) {
      await supabase.from('company_contacts').delete().eq('id', row.id)
    }
  }

  for (const l of leaders) {
    if (existingEmails.has(l.email)) {
      await supabase
        .from('company_contacts')
        .update({ full_name: l.name, is_active: true } as never)
        .eq('company_id', companyId)
        .eq('email', l.email)
    } else {
      const { error: insErr } = await supabase.from('company_contacts').insert({
        company_id: companyId,
        full_name: l.name,
        email: l.email,
        contact_role: 'leader',
      } as never)
      if (insErr) return mapDbError(insErr.message)
    }
  }

  const first = leaders[0]
  await supabase
    .from('companies')
    .update({
      il_leader_name: first?.name ?? null,
      il_leader_email: first?.email ?? null,
    } as never)
    .eq('id', companyId)

  await supabase.from('company_il_leaders').delete().eq('company_id', companyId)
  for (let i = 0; i < leaders.length; i++) {
    const l = leaders[i]
    const { error: ilErr } = await supabase.from('company_il_leaders').insert({
      company_id: companyId,
      name: l.name,
      email: l.email,
      sort_order: i,
    } as never)
    if (ilErr) return mapDbError(ilErr.message)
  }
  return null
}

async function syncCollaborators(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
  collaborators: ContactInput[],
): Promise<string | null> {
  const { data: existing, error: loadErr } = await supabase
    .from('company_contacts')
    .select('id, email')
    .eq('company_id', companyId)
    .eq('contact_role', 'collaborator')

  if (loadErr) return mapDbError(loadErr.message)

  const keepEmails = new Set(collaborators.map((c) => c.email.toLowerCase()))
  for (const row of (existing ?? []) as { id: string; email: string }[]) {
    if (!keepEmails.has(row.email.toLowerCase())) {
      await supabase.from('company_contacts').delete().eq('id', row.id)
    }
  }

  for (const c of collaborators) {
    const { data: row } = await supabase
      .from('company_contacts')
      .select('id')
      .eq('company_id', companyId)
      .eq('email', c.email)
      .maybeSingle()

    if (row) {
      await supabase
        .from('company_contacts')
        .update({
          full_name: c.full_name,
          contact_role: 'collaborator',
          job_title: c.job_title,
          department: c.department,
          is_active: true,
        } as never)
        .eq('id', (row as { id: string }).id)
    } else {
      const { error: insErr } = await supabase.from('company_contacts').insert({
        company_id: companyId,
        full_name: c.full_name,
        email: c.email,
        contact_role: 'collaborator',
        job_title: c.job_title,
        department: c.department,
      } as never)
      if (insErr) return mapDbError(insErr.message)
    }
  }
  return null
}

function revalidateEmpresaPaths(companyId?: string) {
  revalidatePath('/empresas')
  revalidatePath('/nr01/empresas')
  revalidatePath('/diagnostico/empresas')
  revalidatePath('/nr01/avaliacao/nova')
  revalidatePath('/diagnostico/novo')
  if (companyId) {
    revalidatePath(`/empresas/${companyId}`)
    revalidatePath(`/nr01/empresas/${companyId}`)
    revalidatePath(`/diagnostico/empresas/${companyId}`)
  }
}

function novaEmpresaErrorUrl(retorno: string | null, error: string): string {
  const params = new URLSearchParams()
  if (retorno) params.set('retorno', retorno)
  params.set('error', error)
  return `/empresas/nova?${params.toString()}`
}

function editEmpresaErrorUrl(id: string, error: string, retorno?: string) {
  const params = new URLSearchParams()
  params.set('error', error)
  if (retorno) params.set('retorno', retorno)
  return `/empresas/${id}?${params.toString()}`
}

export async function criarEmpresa(formData: FormData) {
  const { supabase, user, role } = await authConsultant()
  const retorno = safeRedirectPath((formData.get('retorno') as string) || null)
  const fields = companyFormFields(formData)

  const schemaErr = await assertSchemaReady(supabase)
  if (schemaErr) redirect(novaEmpresaErrorUrl(retorno, schemaErr))

  const validationErr = validateCompanyPayload(fields)
  if (validationErr) redirect(novaEmpresaErrorUrl(retorno, validationErr))

  const dup = await assertNoDuplicate(supabase, user.id, fields.name, fields.cnpj)
  if (dup) redirect(novaEmpresaErrorUrl(retorno, dup))

  if (isLicensingV2() && isPlatformStaff(role)) {
    try {
      await assertCanAddConsultantCompany(user.id)
    } catch (e) {
      redirect(novaEmpresaErrorUrl(retorno, e instanceof Error ? e.message : 'Limite de CNPJs atingido'))
    }
  }

  const insert: CompanyInsert = {
    name: fields.name,
    legal_name: fields.legalName,
    trade_name: fields.tradeName,
    cnpj: fields.cnpj,
    total_collaborators: fields.total,
    rh_contact_name: fields.rhName,
    rh_contact_email: fields.rhEmail,
    technical_lead_name: fields.rtName,
    technical_lead_crp: fields.rtCrp,
    technical_lead_profession: fields.rtProfession,
    technical_lead_email: fields.rtEmail,
    il_leader_name: fields.ilLeaders[0]?.name ?? null,
    il_leader_email: fields.ilLeaders[0]?.email ?? null,
    consultant_id: user.id,
  }

  const { data, error } = await supabase
    .from('companies')
    .insert(insert as never)
    .select('id')
    .single()

  if (error || !data) {
    const msg = error?.code === '23505'
      ? 'Empresa duplicada (nome ou CNPJ já existente).'
      : mapDbError(`Erro ao cadastrar: ${error?.message ?? 'desconhecido'}`)
    redirect(novaEmpresaErrorUrl(retorno, msg))
  }

  const companyId = (data as { id: string }).id
  const syncLeaderErr = await syncIlLeaders(supabase, companyId, fields.ilLeaders)
  if (syncLeaderErr) redirect(novaEmpresaErrorUrl(retorno, syncLeaderErr))
  if (fields.collaborators.length > 0) {
    const syncColErr = await syncCollaborators(supabase, companyId, fields.collaborators)
    if (syncColErr) redirect(novaEmpresaErrorUrl(retorno, syncColErr))
  }

  await maybeAssignPayerFromForm(formData, role, companyId, (msg) =>
    redirect(novaEmpresaErrorUrl(retorno, msg)),
  )

  revalidateEmpresaPaths(companyId)

  if (retorno) redirect(retorno)
  redirect(`/empresas/${companyId}`)
}

export async function atualizarEmpresa(formData: FormData) {
  const { supabase, user, role } = await authConsultant()
  const id = formData.get('company_id') as string
  const retorno = safeRedirectPath((formData.get('retorno') as string) || null)
  const fields = companyFormFields(formData)

  const schemaErr = await assertSchemaReady(supabase)
  if (schemaErr) redirect(editEmpresaErrorUrl(id || '', schemaErr, retorno ?? undefined))

  const validationErr = validateCompanyPayload(fields)
  if (validationErr) redirect(editEmpresaErrorUrl(id || '', validationErr, retorno ?? undefined))

  const { data: owned } = await supabase
    .from('companies')
    .select('id')
    .eq('id', id)
    .eq('consultant_id', user.id)
    .maybeSingle()
  if (!owned) redirect('/empresas')

  const dup = await assertNoDuplicate(supabase, user.id, fields.name, fields.cnpj, id)
  if (dup) redirect(editEmpresaErrorUrl(id, dup, retorno ?? undefined))

  const { error } = await supabase
    .from('companies')
    .update({
      name: fields.name,
      legal_name: fields.legalName,
      trade_name: fields.tradeName,
      cnpj: fields.cnpj,
      total_collaborators: fields.total,
      rh_contact_name: fields.rhName,
      rh_contact_email: fields.rhEmail,
      technical_lead_name: fields.rtName,
      technical_lead_crp: fields.rtCrp,
      technical_lead_profession: fields.rtProfession,
      technical_lead_email: fields.rtEmail,
      il_leader_name: fields.ilLeaders[0]?.name ?? null,
      il_leader_email: fields.ilLeaders[0]?.email ?? null,
    } as never)
    .eq('id', id)

  if (error) redirect(editEmpresaErrorUrl(id, mapDbError(error.message), retorno ?? undefined))

  const syncLeaderErr = await syncIlLeaders(supabase, id, fields.ilLeaders)
  if (syncLeaderErr) redirect(editEmpresaErrorUrl(id, syncLeaderErr, retorno ?? undefined))
  const syncColErr = await syncCollaborators(supabase, id, fields.collaborators)
  if (syncColErr) redirect(editEmpresaErrorUrl(id, syncColErr, retorno ?? undefined))

  await maybeAssignPayerFromForm(formData, role, id, (msg) =>
    redirect(editEmpresaErrorUrl(id, msg, retorno ?? undefined)),
  )

  revalidateEmpresaPaths(id)

  if (retorno) redirect(retorno)
  redirect(`/empresas/${id}`)
}

/** Helpers usados nos fluxos de nova avaliação / diagnóstico */
export async function loadCompanyReadiness(company: {
  technical_lead_name?: string | null
  technical_lead_crp?: string | null
  il_leaders_count?: number
}) {
  const hasRt = companyHasTechnicalLead(company)
  const hasIl = (company.il_leaders_count ?? 0) > 0
  return { hasRt, hasIl, readyNr01: hasRt, readyPentagrama: hasRt && hasIl }
}

export { isValidCnpj, validateCnpj }
