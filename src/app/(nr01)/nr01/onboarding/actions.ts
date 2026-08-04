'use server'



import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

import { isContratanteRole } from '@/lib/org/roles'

import {

  findCompanyPendingRtOnboarding,

  findContratanteOnboardingGap,

} from '@/lib/nr01/rt-onboarding-gate'

import {

  ensureCompanyFromLicensedCnpj,

  licensedCnpjFromMetadata,

  loadActiveNr01Subscription,

  syncLicensedCnpjFromKiwifySale,

} from '@/lib/nr01/licensed-cnpj'

import { provisionFirstNr01Assessment } from '@/lib/nr01/provision-first-assessment'

import { parseCollaboratorEmails } from '@/lib/nr01/parse-collaborator-emails'

import { seedCompanyCollaborators } from '@/lib/nr01/seed-company-contacts'

import { autoStartNr01Collection } from '@/lib/nr01/auto-start-collection'

import type { UserRole } from '@/types/database'



function onboardingErrorUrl(message: string): never {

  redirect(`/nr01/onboarding?error=${encodeURIComponent(message)}`)

}



/** Confirma razão social — CNPJ vem exclusivamente da licença (checkout), imutável. */

export async function confirmarEmpresaLicenciada(formData: FormData) {

  const supabase = await createClient()

  const {

    data: { user },

  } = await supabase.auth.getUser()

  if (!user) redirect('/login')



  const { data: profile } = await supabase

    .from('profiles')

    .select('role, name, email')

    .eq('id', user.id)

    .returns<{ role: UserRole; name: string | null; email: string | null }[]>()

    .single()



  const role = (profile?.role ?? 'consultant') as UserRole

  if (!isContratanteRole(role)) {

    onboardingErrorUrl('Apenas contratantes podem concluir este passo.')

  }



  const gap = await findContratanteOnboardingGap(user.id)

  if (gap !== 'needs_company') {

    redirect('/nr01/onboarding')

  }



  const companyName = (formData.get('company_name') as string)?.trim()

  const result = await ensureCompanyFromLicensedCnpj(user.id, {

    companyName: companyName || profile?.name,

    email: profile?.email,

  })



  if (!result.licensedCnpj) {

    onboardingErrorUrl(

      'CNPJ não consta na compra. Refaça o checkout com CNPJ empresarial ou contacte suporte@quantum5g.app.',

    )

  }



  if (!result.companyId) {

    onboardingErrorUrl(

      result.skippedReason ?? 'Não foi possível vincular a empresa à licença. Contacte o suporte.',

    )

  }



  redirect('/nr01/onboarding')

}



export async function salvarRtOnboarding(formData: FormData) {

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



  const role = (profile?.role ?? 'consultant') as UserRole

  if (!isContratanteRole(role)) {

    onboardingErrorUrl('Apenas contratantes podem concluir este passo.')

  }



  const companyId = (formData.get('company_id') as string)?.trim()

  const rtName = (formData.get('technical_lead_name') as string)?.trim()

  const rtCrp = (formData.get('technical_lead_crp') as string)?.trim()

  const rtProfession = (formData.get('technical_lead_profession') as string)?.trim() || 'Psicólogo'

  const rtEmail = (formData.get('technical_lead_email') as string)?.trim() || null



  if (!companyId) onboardingErrorUrl('Empresa não identificada.')

  if (!rtName || !rtCrp) onboardingErrorUrl('Informe nome e CRP do responsável técnico.')



  const pending = await findCompanyPendingRtOnboarding(user.id)

  if (!pending || pending.id !== companyId) {

    onboardingErrorUrl('Empresa inválida ou RT já cadastrado.')

  }



  const subscription = await loadActiveNr01Subscription(user.id)

  const licensedCnpj = licensedCnpjFromMetadata(subscription?.metadata ?? null)

  if (licensedCnpj && pending.cnpj && pending.cnpj !== licensedCnpj) {

    onboardingErrorUrl('CNPJ da empresa não corresponde ao vinculado à licença paga.')

  }



  const admin = createServiceRoleAdmin()

  const { error } = await admin

    .from('companies')

    .update({

      technical_lead_name: rtName,

      technical_lead_crp: rtCrp,

      technical_lead_profession: rtProfession,

      technical_lead_email: rtEmail,

    } as never)

    .eq('id', companyId)

    .eq('account_user_id', user.id)



  if (error) onboardingErrorUrl(error.message)



  const collaboratorEmailsRaw = (formData.get('collaborator_emails') as string)?.trim()

  const parsedContacts = parseCollaboratorEmails(collaboratorEmailsRaw)

  if (parsedContacts.length > 0) {

    await seedCompanyCollaborators(companyId, parsedContacts)

  }



  const assessment = await provisionFirstNr01Assessment({

    userId: user.id,

    companyId,

  })



  if (assessment.assessmentId) {

    const activation = await autoStartNr01Collection({

      assessmentId: assessment.assessmentId,

      userId: user.id,

    })



    const qs = new URLSearchParams({ welcome: '1', rt: '1' })

    if (activation.invites.dispatched) {

      qs.set('sent', String(activation.invites.sent))

      if (activation.invites.failed > 0) qs.set('failed', String(activation.invites.failed))

      if (activation.invites.skipped > 0) qs.set('skipped', String(activation.invites.skipped))

    } else if (parsedContacts.length === 0) {

      qs.set('hint', 'adicione_equipe')

    }



    redirect(`/nr01/avaliacao/${assessment.assessmentId}?${qs}`)

  }



  redirect('/nr01/dashboard?welcome=1&rt=1')

}



/** @deprecated use confirmarEmpresaLicenciada — CNPJ manual não é mais aceito */

export async function salvarEmpresaOnboarding(formData: FormData) {

  return confirmarEmpresaLicenciada(formData)

}



export async function resolverEmpresaLicenciadaNoOnboarding(userId: string, email: string | null) {

  const gap = await findContratanteOnboardingGap(userId)

  if (gap !== 'needs_company') return { gap, licensedCnpj: null as string | null }



  let subscription = await loadActiveNr01Subscription(userId)

  if (subscription) {

    subscription = await syncLicensedCnpjFromKiwifySale(subscription)

  }



  const licensedCnpj = licensedCnpjFromMetadata(subscription?.metadata ?? null)

  if (!licensedCnpj) {

    return { gap, licensedCnpj: null as string | null }

  }



  const ensured = await ensureCompanyFromLicensedCnpj(userId, { email })

  if (ensured.companyId) {

    return { gap: 'needs_rt' as const, licensedCnpj }

  }



  return { gap, licensedCnpj, skipReason: ensured.skippedReason }

}


