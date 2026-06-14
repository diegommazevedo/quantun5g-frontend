'use server'

import { revalidatePath } from 'next/cache'
import type { UserRole } from '@/types/database'
import { invitePlatformUser, resendPlatformAccessLink } from '@/lib/auth/user-invite'
import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
function adminClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Não autenticado' as const }
  const { data: me } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: { role: string } | null }
  if (me?.role !== 'admin') return { error: 'Acesso negado' as const }
  return { ok: true as const }
}

export async function criarUsuario(formData: FormData) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const role = ((formData.get('role') as string) || 'consultant') as UserRole
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'

  if (!name || !email) return { error: 'Nome e e-mail são obrigatórios' }
  if (!['admin', 'consultant', 'leader', 'collaborator', 'contratante', 'gerente'].includes(role)) {
    return { error: 'Papel inválido' }
  }

  const result = await invitePlatformUser({
    email,
    name,
    role,
    modulePentagrama,
    moduleNr01,
  })

  if (result.error && !result.userId) {
    if (result.error.includes('already') || result.error.includes('cadastrado')) {
      return { error: 'Este e-mail já está cadastrado.' }
    }
    return { error: result.error }
  }

  if (!result.emailSent) {
    return {
      error: result.error ?? 'Usuário criado, mas o e-mail de convite não foi enviado. Verifique RESEND_API_KEY.',
    }
  }

  revalidatePath('/admin/usuarios')
  return { success: true, name }
}

export async function atualizarAcessoUsuario(formData: FormData) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const userId = formData.get('user_id') as string
  const role = (formData.get('role') as string) as UserRole
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'

  if (!userId) return { error: 'Usuário inválido' }

  const admin = adminClient()
  const isAdmin = role === 'admin'

  const { error } = await admin
    .from('profiles')
    .update({
      role,
      module_pentagrama: isAdmin ? true : modulePentagrama,
      module_nr01: isAdmin ? true : moduleNr01,
    } as never)
    .eq('id', userId)

  if (error) return { error: error.message }

  const vincErr = await salvarVinculosUsuario(admin, userId, role, formData)
  if (vincErr) return vincErr

  revalidatePath('/admin/usuarios')
  return { success: true }
}

function parseCompanyIds(formData: FormData): string[] {
  return formData.getAll('company_ids').map(String).filter(Boolean)
}

async function salvarVinculosUsuario(
  admin: ReturnType<typeof adminClient>,
  userId: string,
  role: UserRole,
  formData: FormData,
): Promise<{ error: string } | null> {
  if (role === 'consultant') {
    const selected = new Set(parseCompanyIds(formData))
    const transferTo = (formData.get('transfer_consultant_id') as string)?.trim()
    const { data: current } = await admin.from('companies').select('id').eq('consultant_id', userId)
    const currentIds = ((current ?? []) as { id: string }[]).map((c) => c.id)
    const removed = currentIds.filter((id) => !selected.has(id))

    if (selected.size > 0) {
      const { error } = await admin
        .from('companies')
        .update({ consultant_id: userId } as never)
        .in('id', [...selected])
      if (error) return { error: error.message }
    }

    if (removed.length > 0) {
      if (!transferTo) {
        return { error: 'Selecione o consultor que receberá as empresas desvinculadas.' }
      }
      const { error } = await admin
        .from('companies')
        .update({ consultant_id: transferTo } as never)
        .in('id', removed)
      if (error) return { error: error.message }
    }
    return null
  }

  if (role === 'contratante' || role === 'leader') {
    const orgName = (formData.get('org_name') as string)?.trim()
    const consultantId = (formData.get('org_consultant_id') as string)?.trim()
    const companyIds = parseCompanyIds(formData)
    let orgId = (formData.get('org_id') as string)?.trim() || null

    if (!orgName) return { error: 'Nome da organização é obrigatório.' }
    if (!consultantId) return { error: 'Consultor operador é obrigatório.' }

    if (orgId) {
      const { error } = await admin
        .from('org_accounts')
        .update({ name: orgName, consultant_id: consultantId } as never)
        .eq('id', orgId)
      if (error) return { error: error.message }
    } else {
      const { data: created, error } = await admin
        .from('org_accounts')
        .insert({
          name: orgName,
          owner_user_id: userId,
          consultant_id: consultantId,
        } as never)
        .select('id')
        .single()
      if (error || !created?.id) return { error: error?.message ?? 'Falha ao criar organização.' }
      orgId = created.id as string
    }

    const { data: previous } = await admin
      .from('companies')
      .select('id')
      .eq('org_account_id', orgId)
    const prevIds = ((previous ?? []) as { id: string }[]).map((c) => c.id)
    const toClear = prevIds.filter((id) => !companyIds.includes(id))
    if (toClear.length) {
      const { error } = await admin
        .from('companies')
        .update({ org_account_id: null } as never)
        .in('id', toClear)
      if (error) return { error: error.message }
    }
    if (companyIds.length) {
      const { error } = await admin
        .from('companies')
        .update({ org_account_id: orgId } as never)
        .in('id', companyIds)
      if (error) return { error: error.message }
    }
    return null
  }

  if (role === 'gerente') {
    const orgAccountId = (formData.get('gerente_org_id') as string)?.trim()
    const memberId = (formData.get('gerente_member_id') as string)?.trim() || null
    const companyIds = parseCompanyIds(formData)

    if (!orgAccountId) return { error: 'Selecione a organização do gerente.' }
    if (companyIds.length === 0) return { error: 'Selecione ao menos uma filial para o gerente.' }

    const { data: orgCompanies } = await admin
      .from('companies')
      .select('id')
      .eq('org_account_id', orgAccountId)
    const allowed = new Set(((orgCompanies ?? []) as { id: string }[]).map((c) => c.id))
    if (!companyIds.every((id) => allowed.has(id))) {
      return { error: 'Uma ou mais filiais não pertencem à organização selecionada.' }
    }

    let resolvedMemberId = memberId
    if (!resolvedMemberId) {
      const { data: created, error } = await admin
        .from('org_members')
        .insert({
          org_account_id: orgAccountId,
          user_id: userId,
          is_active: true,
        } as never)
        .select('id')
        .single()
      if (error || !created?.id) return { error: error?.message ?? 'Falha ao vincular gerente à organização.' }
      resolvedMemberId = created.id as string
      await admin.from('profiles').update({ role: 'gerente' } as never).eq('id', userId)
    } else {
      const { data: member } = await admin
        .from('org_members')
        .select('org_account_id')
        .eq('id', resolvedMemberId)
        .single()
      if (!member || (member as { org_account_id: string }).org_account_id !== orgAccountId) {
        return { error: 'Gerente não pertence à organização informada.' }
      }
    }

    await admin.from('org_member_companies').delete().eq('member_id', resolvedMemberId)
    for (const companyId of companyIds) {
      const { error } = await admin.from('org_member_companies').insert({
        member_id: resolvedMemberId,
        company_id: companyId,
      } as never)
      if (error) return { error: error.message }
    }
    return null
  }

  return null
}

export async function toggleUsuarioAtivo(userId: string, ativo: boolean) {
  const gate = await requireAdmin()
  if ('error' in gate) return gate

  const admin = adminClient()
  const { error: profileErr } = await admin
    .from('profiles')
    .update({ is_active: ativo } as never)
    .eq('id', userId)

  if (profileErr) return { error: profileErr.message }

  await admin.auth.admin.updateUserById(userId, {
    ban_duration: ativo ? 'none' : '876000h',
  })

  revalidatePath('/admin/usuarios')
  return { success: true }
}

export async function reenviarConviteUsuario(userId: string) {
  try {
    const gate = await requireAdmin()
    if ('error' in gate) return gate

    if (!userId) return { error: 'Usuário inválido.' }

    const admin = adminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('name, email, role, is_active')
      .eq('id', userId)
      .maybeSingle()

    const row = profile as {
      name: string | null
      email: string | null
      role: UserRole
      is_active: boolean
    } | null

    if (!row?.email) return { error: 'Usuário não encontrado.' }

    const resend = await resendPlatformAccessLink({
      userId,
      email: row.email,
      name: row.name ?? row.email,
      role: row.role,
    })

    if (!resend.emailSent) {
      return { error: resend.error ?? 'Falha ao reenviar e-mail.' }
    }

    revalidatePath('/admin/usuarios')
    return { success: true }
  } catch (err) {
    return { error: (err as Error).message ?? 'Erro inesperado ao reenviar convite.' }
  }
}
