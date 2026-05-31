/**
 * Acesso líder — link de senha via Resend (sem depender do e-mail padrão do Supabase).
 * Módulos permanecem bloqueados até fatura comercial marcada como paga.
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { sendEmail, platformEmailFrom } from '@/lib/email/platform'
import { normalizeEmail } from '@/lib/auth/resolve-user-by-email'

function appBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL ?? 'https://www.quantun5g.app').replace(/\/$/, '')
}

export async function sendLeaderPasswordSetupEmail(params: {
  email: string
  name: string
  actionLink: string
  invoiceNumber?: string | null
}): Promise<{ sent: boolean; error?: string }> {
  const subject = 'Quantum5G — defina sua senha de acesso'
  const invoiceLine = params.invoiceNumber
    ? `<p>Sua contratação está registrada na fatura <strong>${params.invoiceNumber}</strong>. `
    : '<p>'
  const text = [
    `Olá, ${params.name},`,
    '',
    'Sua conta na plataforma Quantum5G foi criada.',
    params.invoiceNumber
      ? `Fatura: ${params.invoiceNumber}. Os módulos contratados serão liberados após confirmação do pagamento pelo administrador.`
      : 'Os módulos serão liberados após confirmação do pagamento.',
    '',
    'Defina sua senha e acesse:',
    params.actionLink,
    '',
    'Quantum5G',
  ].join('\n')

  const html = `
    <p>Olá, <strong>${params.name}</strong>,</p>
    ${invoiceLine}Você já pode entrar na plataforma; os módulos contratados ficam disponíveis após o pagamento ser confirmado.</p>
    <p style="margin:24px 0">
      <a href="${params.actionLink}" style="background:#18181b;color:#fff;padding:12px 22px;border-radius:8px;text-decoration:none;font-weight:600">
        Criar senha e acessar
      </a>
    </p>
    <p style="font-size:12px;color:#71717a">Se o botão não abrir, copie: ${params.actionLink}</p>
  `

  const result = await sendEmail({
    to: params.email,
    from: platformEmailFrom('pentagrama'),
    subject,
    text,
    html,
  })

  if (!result.ok) {
    return { sent: false, error: result.error ?? 'Falha ao enviar e-mail' }
  }
  return { sent: true }
}

export async function ensureLeaderAuthWithSetupLink(params: {
  email: string
  name?: string | null
  invoiceNumber?: string | null
}): Promise<{ userId: string; invited: boolean; emailSent: boolean }> {
  const normalized = normalizeEmail(params.email)
  const admin = createServiceRoleAdmin()
  const displayName = params.name?.trim() || normalized.split('@')[0] || 'Cliente'
  const redirectTo = `${appBaseUrl()}/auth/callback?next=/dashboard`

  let userId: string | null = null
  let isNew = false

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: normalized,
    options: {
      redirectTo,
      data: { role: 'leader', name: displayName },
    },
  })

  if (linkErr) {
    const msg = linkErr.message.toLowerCase()
    if (msg.includes('already') || msg.includes('registered')) {
      const { data: magic, error: magicErr } = await admin.auth.admin.generateLink({
        type: 'magiclink',
        email: normalized,
        options: { redirectTo },
      })
      if (magicErr || !magic.user?.id) throw new Error(magicErr?.message ?? 'Usuário existente sem link de acesso')
      userId = magic.user.id
      const actionLink = magic.properties?.action_link
      if (!actionLink) throw new Error('Link de acesso não gerado')

      await upsertLeaderProfile(userId, normalized, displayName)
      const mail = await sendLeaderPasswordSetupEmail({
        email: normalized,
        name: displayName,
        actionLink,
        invoiceNumber: params.invoiceNumber,
      })
      return { userId, invited: false, emailSent: mail.sent }
    }
    throw new Error(linkErr.message)
  }

  if (!linkData.user?.id) throw new Error('Falha ao criar usuário')
  userId = linkData.user.id
  isNew = true

  const actionLink = linkData.properties?.action_link
  if (!actionLink) throw new Error('Link de convite não gerado')

  await upsertLeaderProfile(userId, normalized, displayName)

  const mail = await sendLeaderPasswordSetupEmail({
    email: normalized,
    name: displayName,
    actionLink,
    invoiceNumber: params.invoiceNumber,
  })

  return { userId, invited: isNew, emailSent: mail.sent }
}

async function upsertLeaderProfile(userId: string, email: string, name: string): Promise<void> {
  const admin = createServiceRoleAdmin()
  await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      role: 'leader',
      is_active: true,
      module_pentagrama: false,
      module_nr01: false,
    } as never,
    { onConflict: 'id' },
  )
}
