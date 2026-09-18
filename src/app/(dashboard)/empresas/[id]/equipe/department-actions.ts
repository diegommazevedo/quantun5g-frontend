'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import type { UserRole } from '@/types/database'
import { fetchCompanyForActor } from '@/lib/companies/list-for-actor'
import { normalizeDepartmentName } from '@/lib/companies/departments'

async function authCompany(companyId: string) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .returns<{ role: UserRole }[]>()
    .single()
  const role = profile?.role ?? 'consultant'
  const { data: co } = await fetchCompanyForActor(supabase, user.id, role, companyId, 'id')
  if (!co) redirect('/empresas')
  return createServiceRoleAdmin()
}

function revalidateEquipe(companyId: string) {
  revalidatePath(`/empresas/${companyId}/equipe`)
  revalidatePath(`/empresas/${companyId}`)
}

export async function adicionarDepartamento(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const admin = await authCompany(companyId)
  const name = (formData.get('name') as string)?.trim().replace(/\s+/g, ' ')
  if (!name) {
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent('Informe o nome do departamento.')}`)
  }

  const nameNormalized = normalizeDepartmentName(name)
  const { data: maxSort } = await admin
    .from('company_departments')
    .select('sort_order')
    .eq('company_id', companyId)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle()
  const sortOrder = ((maxSort as { sort_order: number } | null)?.sort_order ?? -1) + 1

  const { error } = await admin.from('company_departments').insert({
    company_id: companyId,
    name,
    name_normalized: nameNormalized,
    sort_order: sortOrder,
    is_active: true,
  } as never)

  if (error) {
    const msg =
      error.code === '23505' ? 'Departamento já cadastrado nesta empresa.' : error.message
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent(msg)}`)
  }

  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function renomearDepartamento(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const departmentId = formData.get('department_id') as string
  const admin = await authCompany(companyId)
  const name = (formData.get('name') as string)?.trim().replace(/\s+/g, ' ')
  if (!name || !departmentId) {
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent('Dados incompletos.')}`)
  }

  const nameNormalized = normalizeDepartmentName(name)
  const { error } = await admin
    .from('company_departments')
    .update({
      name,
      name_normalized: nameNormalized,
      updated_at: new Date().toISOString(),
    } as never)
    .eq('id', departmentId)
    .eq('company_id', companyId)

  if (error) {
    const msg =
      error.code === '23505' ? 'Já existe um departamento com este nome.' : error.message
    redirect(`/empresas/${companyId}/equipe?error=${encodeURIComponent(msg)}`)
  }

  // Espelho legado nos contatos
  await admin
    .from('company_contacts')
    .update({ department: name } as never)
    .eq('company_id', companyId)
    .eq('department_id', departmentId)

  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function desativarDepartamento(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const departmentId = formData.get('department_id') as string
  const admin = await authCompany(companyId)

  await admin
    .from('company_departments')
    .update({ is_active: false, updated_at: new Date().toISOString() } as never)
    .eq('id', departmentId)
    .eq('company_id', companyId)

  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}

export async function reativarDepartamento(formData: FormData) {
  const companyId = formData.get('company_id') as string
  const departmentId = formData.get('department_id') as string
  const admin = await authCompany(companyId)

  await admin
    .from('company_departments')
    .update({ is_active: true, updated_at: new Date().toISOString() } as never)
    .eq('id', departmentId)
    .eq('company_id', companyId)

  revalidateEquipe(companyId)
  redirect(`/empresas/${companyId}/equipe`)
}
