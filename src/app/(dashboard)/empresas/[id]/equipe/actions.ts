'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import type { CompanyContactRole } from '@/types/database'

async function authCompany(companyId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: co } = await supabase
    .from('companies')
    .select('id')
    .eq('id', companyId)
    .eq('consultant_id', user.id)
    .maybeSingle()
  if (!co) redirect('/empresas')
  return { supabase, user }
}

function revalidateEquipe(companyId: string) {
  revalidatePath(`/empresas/${companyId}/equipe`)
  revalidatePath(`/empresas/${companyId}`)
  revalidatePath('/empresas')
}

export async function adicionarContato(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const { supabase } = await authCompany(companyId)

  const full_name = (formData.get('full_name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const contact_role = (formData.get('contact_role') as CompanyContactRole) || 'collaborator'
  const job_title = (formData.get('job_title') as string)?.trim() || null
  const department = (formData.get('department') as string)?.trim() || null

  if (!full_name || !email) {
    redirect(`/empresas/${companyId}/equipe?error=Dados+incompletos`)
  }

  const { error } = await supabase.from('company_contacts').insert({
    company_id: companyId,
    full_name,
    email,
    contact_role,
    job_title,
    department,
  } as never)

  if (error) {
    const msg = error.code === '23505' ? 'E-mail já cadastrado nesta empresa.' : error.message
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent(msg)}`)
  }

  await syncLegacyIlFromContacts(supabase, companyId)
  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function atualizarContato(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const contactId = formData.get('contact_id') as string
  const { supabase } = await authCompany(companyId)

  const { error } = await supabase
    .from('company_contacts')
    .update({
      full_name: (formData.get('full_name') as string)?.trim(),
      email: (formData.get('email') as string)?.trim().toLowerCase(),
      contact_role: formData.get('contact_role') as CompanyContactRole,
      job_title: (formData.get('job_title') as string)?.trim() || null,
      department: (formData.get('department') as string)?.trim() || null,
      is_active: formData.get('is_active') === 'true',
    } as never)
    .eq('id', contactId)
    .eq('company_id', companyId)

  if (error) {
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent(error.message)}`)
  }

  await syncLegacyIlFromContacts(supabase, companyId)
  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function removerContato(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const contactId = formData.get('contact_id') as string
  const { supabase } = await authCompany(companyId)

  await supabase.from('company_contacts').delete().eq('id', contactId).eq('company_id', companyId)
  await syncLegacyIlFromContacts(supabase, companyId)
  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function reativarEmailSuprimido(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const email = (formData.get('email') as string)?.trim()
  const { supabase } = await authCompany(companyId)

  const { reactivateEmailForCompany } = await import('@/lib/email/suppression')
  const result = await reactivateEmailForCompany(supabase, companyId, email)

  if (!result.ok) {
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent(result.error)}`)
  }

  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe?reativado=1`)
}

async function syncLegacyIlFromContacts(
  supabase: Awaited<ReturnType<typeof createClient>>,
  companyId: string,
) {
  const { data } = await supabase
    .from('company_contacts')
    .select('full_name, email')
    .eq('company_id', companyId)
    .eq('contact_role', 'leader')
    .eq('is_active', true)
    .order('created_at')
    .limit(1)

  const first = (data ?? [])[0] as { full_name: string; email: string } | undefined
  await supabase
    .from('companies')
    .update({
      il_leader_name: first?.full_name ?? null,
      il_leader_email: first?.email ?? null,
    } as never)
    .eq('id', companyId)
}
