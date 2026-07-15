/**
 * Acesso pós-compra Kiwify — link direto ao onboarding NR-01 (sem tela de senha).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'
import { sendEmail, platformEmailFrom } from '@/lib/email/platform'
import { normalizeEmail } from '@/lib/auth/resolve-user-by-email'
import { buildAuthCallbackUrl, rewriteSupabaseAuthActionLink } from '@/lib/auth/app-url'
import type { UserRole } from '@/types/database'

export const PURCHASE_ONBOARDING_PATH = '/nr01/onboarding'

export interface PurchaseAccessResult {
  userId: string
  emailSent: boolean
  error?: string
}

function finalizeActionLink(raw: string | undefined | null, redirectTo: string): string {
  if (!raw) throw new Error('Link de acesso não gerado')
  return rewriteSupabaseAuthActionLink(raw, redirectTo)
}

function isExistingUserError(message: string): boolean {
  const m = message.toLowerCase()
  return m.includes('already') || m.includes('registered') || m.includes('exists')
}

async function upsertPurchaseProfile(
  userId: string,
  email: string,
  name: string,
  moduleNr01: boolean,
  modulePentagrama: boolean,
): Promise<void> {
  const admin = createServiceRoleAdmin()
  await admin.from('profiles').upsert(
    {
      id: userId,
      email,
      name,
      role: 'contratante',
      is_active: true,
      module_pentagrama: modulePentagrama,
      module_nr01: moduleNr01,
    } as never,
    { onConflict: 'id' },
  )
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

async function sendPurchaseWelcomeEmail(params: {
  email: string
  name: string
  actionLink: string
  companyName?: string | null
}): Promise<{ sent: boolean; error?: string }> {
  const companyLine = params.companyName?.trim()
    ? `Empresa: ${params.companyName.trim()}.`
    : ''
  const subject = 'Quantum5G — seu acesso NR-01 está liberado'

  const text = [
    `Olá, ${params.name},`,
    '',
    'Sua compra foi confirmada e o workspace NR-01 já está disponível.',
    companyLine,
    '',
    'Clique no link abaixo para entrar direto na plataforma (sem senha neste primeiro acesso):',
    params.actionLink,
    '',
    'No próximo passo você cadastra o responsável técnico (RT) assinante do laudo.',
    '',
    'Quantum5G — conformidade psicossocial NR-01',
    'https://www.quantun5g.app',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <div style="font-family:system-ui,-apple-system,sans-serif;max-width:520px;color:#18181b">
      <p style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:#71717a;margin:0 0 8px">
        Quantum5G NR-01
      </p>
      <h1 style="font-size:20px;font-weight:700;margin:0 0 16px">Acesso liberado</h1>
      <p>Olá, <strong>${escapeHtml(params.name)}</strong>,</p>
      <p>Sua compra foi confirmada. O workspace está pronto para uso.</p>
      ${companyLine ? `<p style="font-size:13px;color:#52525b">${escapeHtml(companyLine)}</p>` : ''}
      <p style="margin:28px 0">
        <a href="${params.actionLink}" style="background:#18181b;color:#fff;padding:14px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
          Acessar plataforma agora
        </a>
      </p>
      <p style="font-size:12px;color:#71717a;line-height:1.5">
        Link pessoal e válido por tempo limitado. Depois você pode definir senha em Configurações.
      </p>
      <hr style="border:none;border-top:1px solid #e4e4e7;margin:24px 0"/>
      <p style="font-size:11px;color:#a1a1aa">Próximo passo: cadastro do RT assinante do laudo NR-01.</p>
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

async function generateAccessLink(
  email: string,
  redirectTo: string,
  displayName: string,
  role: UserRole,
): Promise<{ link: string; userId: string } | null> {
  const admin = createServiceRoleAdmin()

  for (const type of ['magiclink', 'recovery', 'invite'] as const) {
    const { data, error } = await admin.auth.admin.generateLink({
      type,
      email,
      options: {
        redirectTo,
        ...(type === 'invite' ? { data: { role, name: displayName } } : {}),
      },
    })
    if (!error && data.properties?.action_link && data.user?.id) {
      return {
        link: finalizeActionLink(data.properties.action_link, redirectTo),
        userId: data.user.id,
      }
    }
    if (error && type === 'invite' && !isExistingUserError(error.message)) {
      return null
    }
  }
  return null
}

/** Cria/atualiza conta e envia magic link → onboarding NR-01 (sem /convite/ativar). */
export async function sendPurchaseAccessEmail(params: {
  email: string
  name: string
  moduleNr01?: boolean
  modulePentagrama?: boolean
  companyName?: string | null
}): Promise<PurchaseAccessResult> {
  const normalized = normalizeEmail(params.email)
  const displayName = params.name?.trim() || normalized.split('@')[0] || 'Cliente'
  const redirectTo = buildAuthCallbackUrl(PURCHASE_ONBOARDING_PATH)
  const moduleNr01 = params.moduleNr01 ?? true
  const modulePentagrama = params.modulePentagrama ?? true

  const access = await generateAccessLink(normalized, redirectTo, displayName, 'contratante')
  if (!access) {
    return { userId: '', emailSent: false, error: 'Não foi possível gerar link de acesso' }
  }

  await upsertPurchaseProfile(
    access.userId,
    normalized,
    displayName,
    moduleNr01,
    modulePentagrama,
  )

  const mail = await sendPurchaseWelcomeEmail({
    email: normalized,
    name: displayName,
    actionLink: access.link,
    companyName: params.companyName,
  })

  return {
    userId: access.userId,
    emailSent: mail.sent,
    error: mail.sent ? undefined : mail.error,
  }
}
