/**
 * QUANTUM5G — Adapter de email pluggable
 *
 * Driver real: Resend (https://resend.com) via fetch direto — sem dependência
 * extra no package.json. Free tier 3.000/mês, 15min de setup.
 *
 * Driver fallback: 'console' — loga payload no servidor e devolve sucesso.
 * Ativa quando RESEND_API_KEY não está setada. Permite smoke test e desenvolvimento
 * sem credencial. Em produção sem key configurada, falha aberta — visível.
 *
 * Sem dependência de runtime. Cabeçalhos fixos. Sem retry interno (caller decide).
 */

export type EmailDriver = 'resend' | 'console'

export interface EmailMessage {
  to: string
  subject: string
  text: string
  html?: string
  from?: string
}

export interface EmailSendResult {
  driver: EmailDriver
  ok: boolean
  id?: string
  error?: string
}

const DEFAULT_FROM = process.env.NR01_EMAIL_FROM ?? 'Quantum5G NR-01 <onboarding@resend.dev>'

export function getActiveDriver(): EmailDriver {
  return process.env.RESEND_API_KEY ? 'resend' : 'console'
}

// ============================================================
// Driver: Resend
// ============================================================
async function sendViaResend(msg: EmailMessage): Promise<EmailSendResult> {
  const key = process.env.RESEND_API_KEY
  if (!key) return { driver: 'resend', ok: false, error: 'RESEND_API_KEY ausente' }

  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${key}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: msg.from ?? DEFAULT_FROM,
        to: [msg.to],
        subject: msg.subject,
        text: msg.text,
        html: msg.html,
      }),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => '<sem corpo>')
      return { driver: 'resend', ok: false, error: `Resend ${res.status}: ${text.slice(0, 200)}` }
    }
    const data = await res.json().catch(() => null) as { id?: string } | null
    return { driver: 'resend', ok: true, id: data?.id }
  } catch (err) {
    return { driver: 'resend', ok: false, error: (err as Error).message }
  }
}

// ============================================================
// Driver: console (fallback)
// ============================================================
function sendViaConsole(msg: EmailMessage): EmailSendResult {
  const id = `console-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  console.log(`[email:console] ${id}`)
  console.log(`  from: ${msg.from ?? DEFAULT_FROM}`)
  console.log(`  to:   ${msg.to}`)
  console.log(`  subj: ${msg.subject}`)
  console.log('  ---')
  console.log(msg.text.split('\n').map((l) => '  ' + l).join('\n'))
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━')
  return { driver: 'console', ok: true, id }
}

// ============================================================
// API pública
// ============================================================
export async function sendEmail(msg: EmailMessage): Promise<EmailSendResult> {
  const driver = getActiveDriver()
  if (driver === 'resend') return sendViaResend(msg)
  return sendViaConsole(msg)
}

// ============================================================
// Builder do email de pulso semanal
// ============================================================
export interface PulseEmailArgs {
  to: string
  companyName: string
  weekNumber: number
  totalQuestions: number
  pulseUrl: string
  windowHours: number
}

export function buildPulseEmail(args: PulseEmailArgs): EmailMessage {
  const subject = `Pulso semanal NR-01 · ${args.totalQuestions} perguntas · 90 segundos`
  const text = [
    `Olá,`,
    ``,
    `Esta é a sua avaliação semanal de bem-estar no trabalho da ${args.companyName} (semana ${args.weekNumber}).`,
    `${args.totalQuestions} perguntas. Anônimo. Leva ~90 segundos.`,
    ``,
    `Responder: ${args.pulseUrl}`,
    ``,
    `Janela de resposta: ${args.windowHours}h. Sem cadastro, sem identificação.`,
    `Suas respostas integram o monitoramento contínuo NR-01 conforme política da empresa.`,
  ].join('\n')

  const html = `
<!doctype html>
<html lang="pt-BR"><body style="font-family:system-ui,-apple-system,sans-serif;background:#f4f4f5;padding:24px;color:#27272a">
  <div style="max-width:540px;margin:0 auto;background:#fff;border:1px solid #e4e4e7;border-radius:12px;padding:28px">
    <p style="font-size:11px;letter-spacing:.06em;text-transform:uppercase;color:#ea580c;margin:0">Pulso semanal NR-01</p>
    <h1 style="font-size:18px;color:#18181b;margin:6px 0 14px">Semana ${args.weekNumber} · ${args.companyName}</h1>
    <p style="font-size:14px;line-height:1.5;color:#52525b;margin:0 0 16px">
      ${args.totalQuestions} perguntas. <strong>Anônimo.</strong> Leva ~90 segundos.
    </p>
    <p style="margin:18px 0">
      <a href="${args.pulseUrl}"
         style="display:inline-block;background:#ea580c;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-weight:600;font-size:14px">
        Responder pulso
      </a>
    </p>
    <p style="font-size:12px;color:#a1a1aa;margin:18px 0 0">
      Janela de ${args.windowHours}h. Sem cadastro, sem identificação. Monitoramento contínuo conforme NR-01.
    </p>
  </div>
</body></html>
`.trim()

  return { to: args.to, subject, text, html }
}
