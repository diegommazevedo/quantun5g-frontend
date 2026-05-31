/**
 * E-mail transacional da plataforma Quantum5G (Pentagrama + NR-01).
 */

export {
  sendEmail,
  getActiveDriver,
  type EmailMessage,
  type EmailSendResult,
  type EmailDriver,
} from '@/lib/nr01/email'

const PLATFORM_FROM =
  process.env.QUANTUM_EMAIL_FROM ??
  process.env.NR01_EMAIL_FROM ??
  'Quantum5G <onboarding@resend.dev>'

export function platformEmailFrom(module: 'pentagrama' | 'nr01' | 'platform'): string {
  if (module === 'platform') return PLATFORM_FROM
  if (module === 'pentagrama') {
    return process.env.PENTAGRAMA_EMAIL_FROM ?? PLATFORM_FROM
  }
  return process.env.NR01_EMAIL_FROM ?? PLATFORM_FROM
}

export interface SurveyInviteEmailArgs {
  to: string
  recipientName: string
  companyName: string
  moduleLabel: string
  surveyLabel: string
  surveyUrl: string
  deadline?: string | null
  consultantName?: string | null
}

export function buildSurveyInviteEmail(args: SurveyInviteEmailArgs): {
  subject: string
  text: string
  html: string
} {
  const subject = `${args.moduleLabel} — ${args.surveyLabel} · ${args.companyName}`
  const deadlineLine = args.deadline
    ? `\nPrazo sugerido: ${args.deadline}\n`
    : ''
  const text = [
    `Olá, ${args.recipientName},`,
    '',
    `Você foi convidado(a) a participar da pesquisa "${args.surveyLabel}" da empresa ${args.companyName}.`,
    deadlineLine,
    'Acesse o questionário pelo link abaixo (uso pessoal — não compartilhe):',
    args.surveyUrl,
    '',
    args.consultantName ? `Conduzido por: ${args.consultantName}` : '',
    '',
    'Quantum5G — diagnóstico organizacional',
  ]
    .filter(Boolean)
    .join('\n')

  const html = `
    <p>Olá, <strong>${escapeHtml(args.recipientName)}</strong>,</p>
    <p>Você foi convidado(a) a participar da pesquisa <strong>${escapeHtml(args.surveyLabel)}</strong>
       da empresa <strong>${escapeHtml(args.companyName)}</strong>.</p>
    ${args.deadline ? `<p><strong>Prazo sugerido:</strong> ${escapeHtml(args.deadline)}</p>` : ''}
    <p style="margin:24px 0">
      <a href="${args.surveyUrl}" style="background:#18181b;color:#fff;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:600">
        Abrir questionário
      </a>
    </p>
    <p style="font-size:12px;color:#71717a">Ou copie o link: ${args.surveyUrl}</p>
  `

  return { subject, text, html }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}
