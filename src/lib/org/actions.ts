'use server'

import { revalidatePath } from 'next/cache'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { requireContratanteOrRedirect, assertContratanteOwnsOrg } from '@/lib/org/access'

function parseCompanyIds(formData: FormData): string[] {
  const raw = formData.getAll('company_ids')
  return raw.map(String).filter(Boolean)
}

export async function criarGerenteOrg(formData: FormData) {
  const ctx = await requireContratanteOrRedirect()
  const name = (formData.get('name') as string)?.trim()
  const email = (formData.get('email') as string)?.trim().toLowerCase()
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'
  const companyIds = parseCompanyIds(formData)

  if (!name || !email) return { error: 'Nome e e-mail são obrigatórios.' }
  if (companyIds.length === 0) return { error: 'Selecione ao menos uma filial (CNPJ).' }

  const admin = createServiceRoleAdmin()
  const { data: orgCompanies } = await admin
    .from('companies')
    .select('id')
    .eq('org_account_id', ctx.org.id)

  const allowed = new Set(((orgCompanies ?? []) as { id: string }[]).map((c) => c.id))
  if (!companyIds.every((id) => allowed.has(id))) {
    return { error: 'Uma ou mais filiais não pertencem à sua organização.' }
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quantun5g.app'

  const { data: invited, error: inviteErr } = await admin.auth.admin.inviteUserByEmail(email, {
    redirectTo: `${appUrl}/dashboard`,
    data: { role: 'gerente', name },
  })

  if (inviteErr) {
    if (inviteErr.message.includes('already been registered')) {
      return { error: 'Este e-mail já está cadastrado. Use outro ou peça ao admin vincular.' }
    }
    return { error: inviteErr.message }
  }

  const userId = invited.user.id

  await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      role: 'gerente',
      is_active: true,
      module_pentagrama: modulePentagrama,
      module_nr01: moduleNr01,
    } as never,
    { onConflict: 'id' },
  )

  const { data: member, error: memErr } = await admin
    .from('org_members')
    .insert({
      org_account_id: ctx.org.id,
      user_id: userId,
      module_pentagrama: modulePentagrama,
      module_nr01: moduleNr01,
      is_active: true,
      created_by: ctx.userId,
    } as never)
    .select('id')
    .single()

  if (memErr || !member?.id) return { error: memErr?.message ?? 'Falha ao vincular gerente.' }

  for (const companyId of companyIds) {
    await admin.from('org_member_companies').insert({
      member_id: member.id as string,
      company_id: companyId,
    } as never)
  }

  revalidatePath('/organizacao/equipe')
  return { success: true }
}

export async function atualizarGerenteOrg(formData: FormData) {
  const ctx = await requireContratanteOrRedirect()
  const memberId = formData.get('member_id') as string
  const modulePentagrama = formData.get('module_pentagrama') === 'on'
  const moduleNr01 = formData.get('module_nr01') === 'on'
  const companyIds = parseCompanyIds(formData)

  if (!memberId) return { error: 'Gerente inválido.' }
  if (companyIds.length === 0) return { error: 'Selecione ao menos uma filial.' }

  const admin = createServiceRoleAdmin()
  const { data: member } = await admin
    .from('org_members')
    .select('id, user_id, org_account_id')
    .eq('id', memberId)
    .single()

  if (!member?.org_account_id || member.org_account_id !== ctx.org.id) {
    return { error: 'Gerente não pertence à sua organização.' }
  }

  const { data: orgCompanies } = await admin
    .from('companies')
    .select('id')
    .eq('org_account_id', ctx.org.id)
  const allowed = new Set(((orgCompanies ?? []) as { id: string }[]).map((c) => c.id))
  if (!companyIds.every((id) => allowed.has(id))) {
    return { error: 'Filiais inválidas.' }
  }

  await admin
    .from('org_members')
    .update({ module_pentagrama: modulePentagrama, module_nr01: moduleNr01 } as never)
    .eq('id', memberId)

  await admin
    .from('profiles')
    .update({
      module_pentagrama: modulePentagrama,
      module_nr01: moduleNr01,
      role: 'gerente',
    } as never)
    .eq('id', member.user_id as string)

  await admin.from('org_member_companies').delete().eq('member_id', memberId)
  for (const companyId of companyIds) {
    await admin.from('org_member_companies').insert({
      member_id: memberId,
      company_id: companyId,
    } as never)
  }

  revalidatePath('/organizacao/equipe')
  return { success: true }
}

export async function toggleGerenteAtivo(memberId: string, ativo: boolean) {
  const ctx = await requireContratanteOrRedirect()
  const admin = createServiceRoleAdmin()

  const { data: member } = await admin
    .from('org_members')
    .select('id, user_id, org_account_id')
    .eq('id', memberId)
    .single()

  if (!member?.org_account_id || member.org_account_id !== ctx.org.id) {
    return { error: 'Gerente não encontrado.' }
  }

  await admin.from('org_members').update({ is_active: ativo } as never).eq('id', memberId)
  await admin.from('profiles').update({ is_active: ativo } as never).eq('id', member.user_id as string)
  await admin.auth.admin.updateUserById(member.user_id as string, {
    ban_duration: ativo ? 'none' : '876000h',
  })

  revalidatePath('/organizacao/equipe')
  return { success: true }
}

export async function reenviarSenhaGerente(userId: string) {
  const ctx = await requireContratanteOrRedirect()
  const admin = createServiceRoleAdmin()

  const { data: member } = await admin
    .from('org_members')
    .select('org_account_id')
    .eq('user_id', userId)
    .maybeSingle()

  if (!member?.org_account_id) return { error: 'Usuário não é gerente da organização.' }
  const owns = await assertContratanteOwnsOrg(ctx.userId, member.org_account_id as string)
  if (!owns) return { error: 'Sem permissão.' }

  const { data: authUser } = await admin.auth.admin.getUserById(userId)
  const email = authUser?.user?.email
  if (!email) return { error: 'E-mail não encontrado.' }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quantun5g.app'
  const { error } = await admin.auth.admin.generateLink({
    type: 'recovery',
    email,
    options: { redirectTo: `${appUrl}/auth/callback` },
  })

  if (error) return { error: error.message }
  return { success: true }
}
