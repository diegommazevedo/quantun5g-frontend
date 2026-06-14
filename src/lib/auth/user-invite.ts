/**
 * Convite de usuário da plataforma — link Supabase + e-mail Quantum5G via Resend.
 * Não usa inviteUserByEmail (evita template genérico do Supabase com localhost).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { sendEmail, platformEmailFrom } from '@/lib/email/platform'
import { normalizeEmail } from '@/lib/auth/resolve-user-by-email'
import { buildAuthCallbackUrl, rewriteSupabaseAuthActionLink } from '@/lib/auth/app-url'
import type { UserRole } from '@/types/database'

const ROLE_LABEL_PT: Record<string, string> = {
  admin: 'Administrador',
  consultant: 'Consultor licenciado',
  contratante: 'Contratante',
  gerente: 'Gerente de filial',
  leader: 'Contratante',
  collaborator: 'Colaborador',
}

export interface InvitePlatformUserParams {
  email: string
  name: string
  role: UserRole
  modulePentagrama?: boolean
  moduleNr01?: boolean
  /** Destino após definir senha; padrão /convite/ativar */
  nextPath?: string
  invitedByName?: string | null
}

export interface InvitePlatformUserResult {
  userId: string
  invited: boolean
  emailSent: boolean
  error?: string
}

function finalizeActionLink(raw: string | undefined | null, redirectTo: string): string {
  if (!raw) throw new Error('Link de convite não gerado')
  return rewriteSupabaseAuthActionLink(raw, redirectTo)
}

function isExistingUserError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('already') || m.includes('registered') || m.includes('exists')
}

export async function sendPlatformInviteEmail(params: {
  email: string
  name: string
  role: UserRole
  actionLink: string
  invitedByName?: string | null
}): Promise<{ sent: boolean; error?: string }> {
  const roleLabel = ROLE_LABEL_PT[params.role] ?? params.role
  const invitedBy = params.invitedByName?.trim()
  const subject = 'Quantum5G — ative seu acesso à plataforma'

  const text = [
    `Olá, ${params.name},`,
    '',
    'Você foi convidado(a) para acessar a plataforma Quantum5G.',
    `Perfil: ${roleLabel}.`,
    invitedBy ? `Convite enviado por: ${invitedBy}.` : '',
    '',
    'Clique no link abaixo para criar sua senha e entrar:',
    params.actionLink,
    '',
    'Se você não esperava este e-mail, ignore esta mensagem.',
    '',
    'Quantum5G — saúde organizacional e conformidade psicossocial',
    'https://www.quantun5g.app',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#18181b">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;margin:0 0 8px">
        Quantum5G
      </p>
      <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">Ative seu acesso</h1>
      <p>Olá, <strong>${escapeHtml(params.name)}</strong>,</p>
      <p>Você foi convidado(a) para a plataforma <strong>Quantum5G</strong> como <strong>${escapeHtml(roleLabel)}</strong>.</p>
      ${invitedBy ? `<p style="font-size:13px;color:#52525b">Convite enviado por ${escapeHtml(invitedBy)}.</p>` : ''}
      <p style="margin:28px 0">
        <a href="${params.actionLink}" style="background:#18181b;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Criar senha e acessar
        </a>
      </p>
      <p style="font-size:12px;color:#71717a;line-height:1.5">
        O link é pessoal e expira em breve. Se o botão não funcionar, copie e cole no navegador:<br/>
        <span style="word-break:break-all">${params.actionLink}</span>
      </p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>
      <p style="font-size:11px;color:#a1a1aa">Saúde organizacional · Pentagrama de Ginger · NR-01</p>
    </div>
  `

  const result = await sendEmail({
    to: params.email,
    from: platformEmailFrom('platform'),
    subject,
    text,
    html,
  })

  if (!result.ok) return { sent: false, error: result.error ?? 'Falha ao enviar e-mail' }
  return { sent: true }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function upsertInvitedProfile(
  userId: string,
  email: string,
  name: string,
  role: UserRole,
  modulePentagrama: boolean,
  moduleNr01: boolean,
): Promise<void> {
  const admin = createServiceRoleAdmin()
  const isAdmin = role === 'admin'
  await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      role,
      is_active: true,
      module_pentagrama: isAdmin ? true : modulePentagrama,
      module_nr01: isAdmin ? true : moduleNr01,
    } as never,
    { onConflict: 'id' },
  )
}

export async function invitePlatformUser(
  params: InvitePlatformUserParams,
): Promise<InvitePlatformUserResult> {
  const normalized = normalizeEmail(params.email)
  const displayName = params.name?.trim() || normalized.split('@')[0] || 'Usuário'
  const nextPath = params.nextPath ?? '/convite/ativar'
  const redirectTo = buildAuthCallbackUrl(nextPath)
  const admin = createServiceRoleAdmin()
  const modulePentagrama = params.modulePentagrama ?? true
  const moduleNr01 = params.moduleNr01 ?? true

  const { data: linkData, error: linkErr } = await admin.auth.admin.generateLink({
    type: 'invite',
    email: normalized,
    options: {
      redirectTo,
      data: { role: params.role, name: displayName },
    },
  })

  if (linkErr) {
    if (isExistingUserError(linkErr.message)) {
      const { data: recovery, error: recoveryErr } = await admin.auth.admin.generateLink({
        type: 'recovery',
        email: normalized,
        options: { redirectTo },
      })
      if (recoveryErr || !recovery.user?.id) {
        return { userId: '', invited: false, emailSent: false, error: recoveryErr?.message ?? linkErr.message }
      }

      const actionLink = finalizeActionLink(recovery.properties?.action_link, redirectTo)
      await upsertInvitedProfile(
        recovery.user.id,
        normalized,
        displayName,
        params.role,
        modulePentagrama,
        moduleNr01,
      )
      const mail = await sendPlatformInviteEmail({
        email: normalized,
        name: displayName,
        role: params.role,
        actionLink,
        invitedByName: params.invitedByName,
      })
      return {
        userId: recovery.user.id,
        invited: false,
        emailSent: mail.sent,
        error: mail.sent ? undefined : mail.error,
      }
    }
    return { userId: '', invited: false, emailSent: false, error: linkErr.message }
  }

  if (!linkData.user?.id) {
    return { userId: '', invited: false, emailSent: false, error: 'Falha ao criar usuário' }
  }

  const actionLink = finalizeActionLink(linkData.properties?.action_link, redirectTo)
  await upsertInvitedProfile(
    linkData.user.id,
    normalized,
    displayName,
    params.role,
    modulePentagrama,
    moduleNr01,
  )

  const mail = await sendPlatformInviteEmail({
    email: normalized,
    name: displayName,
    role: params.role,
    actionLink,
    invitedByName: params.invitedByName,
  })

  return {
    userId: linkData.user.id,
    invited: true,
    emailSent: mail.sent,
    error: mail.sent ? undefined : mail.error,
  }
}

/** Reenvio de link de acesso com o mesmo template da plataforma. */
export async function resendPlatformAccessLink(params: {
  userId: string
  email: string
  name: string
  role: UserRole
  nextPath?: string
}): Promise<{ emailSent: boolean; error?: string }> {
  const redirectTo = buildAuthCallbackUrl(params.nextPath ?? '/convite/ativar')
  const admin = createServiceRoleAdmin()
  const normalized = normalizeEmail(params.email)

  async function linkFrom(
    type: 'invite' | 'recovery' | 'magiclink',
  ): Promise<string | null> {
    const { data, error } = await admin.auth.admin.generateLink({
      type,
      email: normalized,
      options: {
        redirectTo,
        ...(type === 'invite'
          ? { data: { role: params.role, name: params.name } }
          : {}),
      },
    })
    if (error || !data.properties?.action_link) return null
    return finalizeActionLink(data.properties.action_link, redirectTo)
  }

  let actionLink =
    (await linkFrom('invite')) ??
    (await linkFrom('recovery')) ??
    (await linkFrom('magiclink'))

  if (!actionLink) {
    return { emailSent: false, error: 'Não foi possível gerar o link de ativação.' }
  }

  const mail = await sendPlatformInviteEmail({
    email: params.email,
    name: params.name,
    role: params.role,
    actionLink,
  })
  return { emailSent: mail.sent, error: mail.sent ? undefined : mail.error }
}
