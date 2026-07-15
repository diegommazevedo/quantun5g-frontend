'use server'

import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { isContratanteRole } from '@/lib/org/roles'
import { findCompanyPendingRtOnboarding } from '@/lib/nr01/rt-onboarding-gate'
import { provisionFirstNr01Assessment } from '@/lib/nr01/provision-first-assessment'
import type { UserRole } from '@/types/database'

function rtErrorUrl(message: string): never {
  redirect(`/nr01/onboarding?error=${encodeURIComponent(message)}`)
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
    rtErrorUrl('Apenas contratantes podem concluir este passo.')
  }

  const companyId = (formData.get('company_id') as string)?.trim()
  const rtName = (formData.get('technical_lead_name') as string)?.trim()
  const rtCrp = (formData.get('technical_lead_crp') as string)?.trim()
  const rtProfession = (formData.get('technical_lead_profession') as string)?.trim() || 'Psicólogo'
  const rtEmail = (formData.get('technical_lead_email') as string)?.trim() || null

  if (!companyId) rtErrorUrl('Empresa não identificada.')
  if (!rtName || !rtCrp) rtErrorUrl('Informe nome e CRP do responsável técnico.')

  const pending = await findCompanyPendingRtOnboarding(user.id)
  if (!pending || pending.id !== companyId) {
    rtErrorUrl('Empresa inválida ou RT já cadastrado.')
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

  if (error) rtErrorUrl(error.message)

  const assessment = await provisionFirstNr01Assessment({
    userId: user.id,
    companyId,
  })

  if (assessment.assessmentId && assessment.created) {
    redirect(`/nr01/avaliacao/${assessment.assessmentId}?welcome=1&rt=1`)
  }

  redirect('/nr01/dashboard?welcome=1&rt=1')
}
