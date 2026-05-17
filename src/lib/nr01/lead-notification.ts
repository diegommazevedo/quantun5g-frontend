/**
 * Notificação por email quando um lead NR-01 é capturado na LP.
 * Usa o adapter Resend existente (src/lib/nr01/email.ts).
 */

import { sendEmail } from '@/lib/nr01/email'

const LEAD_NOTIFY_TO = ['suporte@quantun5g.com', 'diegomanoelmiranda@gmail.com'] as const

/** Remetente: LP_LEAD_EMAIL_FROM > NR01_EMAIL_FROM > domínio custom > sandbox Resend */
export function getLeadNotificationFrom(): string {
  return (
    process.env.LP_LEAD_EMAIL_FROM?.trim() ||
    process.env.NR01_EMAIL_FROM?.trim() ||
    'Quantum5G Leads <noreply@quantun5g.com>'
  )
}

export interface LeadData {
  email: string
  phone: string | null
  company_name: string
  collaborators_count: number | null
  suggested_tier: string | null
  source: string
  utm_source: string | null
  utm_medium: string | null
  utm_campaign: string | null
  utm_content: string | null
  consent_lgpd: boolean
  consent_at: string
  ip_hash: string
  created_at: string
  name?: string | null
  message?: string | null
}

function dash(value: string | null | undefined): string {
  if (value == null || String(value).trim() === '') return '—'
  return String(value).trim()
}

function na(value: string | number | null | undefined): string {
  if (value == null || (typeof value === 'string' && value.trim() === '')) return 'não informado'
  return String(value)
}

function formatCreatedAtBrt(iso: string): string {
  try {
    const formatted = new Intl.DateTimeFormat('pt-BR', {
      timeZone: 'America/Sao_Paulo',
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(new Date(iso))
    return `${formatted} BRT`
  } catch {
    return iso
  }
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildLeadEmail(lead: LeadData) {
  const tier = lead.suggested_tier?.trim() || 'não identificado'
  const subject = `🔔 Novo lead NR-01 — ${lead.company_name} (${tier})`
  const createdAt = formatCreatedAtBrt(lead.created_at)
  const consentLabel = lead.consent_lgpd
    ? `Sim em ${formatCreatedAtBrt(lead.consent_at)}`
    : `Não em ${formatCreatedAtBrt(lead.consent_at)}`

  const lines = [
    'Novo lead capturado em quantun5g.app/lp/nr01',
    '',
    `Data/hora:     ${createdAt}`,
    ...(lead.name?.trim() ? [`Nome:          ${lead.name.trim()}`] : []),
    `Email:         ${lead.email}`,
    `Telefone:      ${na(lead.phone)}`,
    `Empresa:       ${na(lead.company_name)}`,
    `Colaboradores: ${na(lead.collaborators_count)}`,
    `Tier sugerido: ${tier}`,
    `Fonte:         ${lead.source}`,
    `UTM Source:    ${dash(lead.utm_source)}`,
    `UTM Medium:    ${dash(lead.utm_medium)}`,
    `UTM Campaign:  ${dash(lead.utm_campaign)}`,
    `UTM Content:   ${dash(lead.utm_content)}`,
    `Consentimento: ${consentLabel}`,
    `IP Hash:       ${lead.ip_hash}`,
    ...(lead.message?.trim() ? ['', 'Mensagem:', lead.message.trim()] : []),
  ]

  const text = lines.join('\n')

  const row = (label: string, value: string) =>
    `<tr><td style="padding:6px 12px 6px 0;color:#64748b;vertical-align:top;white-space:nowrap">${label}</td><td style="padding:6px 0;color:#0f172a">${escapeHtml(value)}</td></tr>`

  const html = `<!doctype html>
<html lang="pt-BR"><body style="font-family:system-ui,sans-serif;background:#f8fafc;padding:20px;color:#0f172a">
  <div style="max-width:560px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:8px;padding:24px">
    <p style="margin:0 0 16px;font-size:14px">Novo lead capturado em <strong>quantun5g.app/lp/nr01</strong></p>
    <table style="font-size:14px;line-height:1.4;border-collapse:collapse;width:100%">
      ${row('Data/hora', createdAt)}
      ${lead.name?.trim() ? row('Nome', lead.name.trim()) : ''}
      ${row('Email', lead.email)}
      ${row('Telefone', na(lead.phone))}
      ${row('Empresa', na(lead.company_name))}
      ${row('Colaboradores', na(lead.collaborators_count))}
      ${row('Tier sugerido', tier)}
      ${row('Fonte', lead.source)}
      ${row('UTM Source', dash(lead.utm_source))}
      ${row('UTM Medium', dash(lead.utm_medium))}
      ${row('UTM Campaign', dash(lead.utm_campaign))}
      ${row('UTM Content', dash(lead.utm_content))}
      ${row('Consentimento', consentLabel)}
      ${row('IP Hash', lead.ip_hash)}
      ${lead.message?.trim() ? row('Mensagem', lead.message.trim()) : ''}
    </table>
  </div>
</body></html>`

  return { subject, text, html }
}

export async function sendLeadNotification(lead: LeadData): Promise<void> {
  try {
    const from = getLeadNotificationFrom()
    const { subject, text, html } = buildLeadEmail(lead)

    const results = await Promise.allSettled(
      LEAD_NOTIFY_TO.map((to) => sendEmail({ to, subject, text, html, from })),
    )

    results.forEach((result, i) => {
      const to = LEAD_NOTIFY_TO[i]
      if (result.status === 'rejected') {
        console.error(`[lead-notification] falha para ${to}:`, result.reason)
        return
      }
      if (!result.value.ok) {
        console.error(`[lead-notification] Resend/console erro para ${to}:`, result.value.error)
      }
    })
  } catch (err) {
    console.error('[lead-notification] erro inesperado:', err)
  }
}
