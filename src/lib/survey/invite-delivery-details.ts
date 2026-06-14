import type { createClient } from '@/lib/supabase/server'

type Supabase = Awaited<ReturnType<typeof createClient>>

export type InviteDeliveryRow = {
  contactId: string
  fullName: string
  email: string
  emailStatus: string
  label: string
  detail: string
  sentAt: string | null
  deliveredAt: string | null
  openedAt: string | null
  error: string | null
}

const STATUS_PT: Record<string, { label: string; detail: string }> = {
  delivered: {
    label: 'Entregue',
    detail: 'Confirmado na caixa de entrada do destinatário (webhook Resend).',
  },
  sent: {
    label: 'Enviado',
    detail: 'Aceito pelo servidor de e-mail; aguardando confirmação de entrega.',
  },
  pending: {
    label: 'Pendente',
    detail: 'Convite registrado; e-mail ainda não disparado nesta campanha.',
  },
  failed: {
    label: 'Falha no envio',
    detail: 'O provedor rejeitou ou o sistema não concluiu o envio.',
  },
  bounced: {
    label: 'Rejeitado (bounce)',
    detail: 'Caixa inexistente, cheia ou bloqueada — não entregue.',
  },
  complained: {
    label: 'Marcado como spam',
    detail: 'Destinatário ou provedor sinalizou como spam.',
  },
}

function mapStatus(
  status: string | null,
  error: string | null,
): { label: string; detail: string } {
  const st = status ?? 'pending'
  const base = STATUS_PT[st] ?? { label: st, detail: 'Status desconhecido.' }
  if (error?.includes('row-level security')) {
    return {
      label: 'Sem permissão',
      detail: 'O sistema não pôde registrar o convite. Use a conta do consultor responsável.',
    }
  }
  if (error) {
    return { label: base.label, detail: error }
  }
  return base
}

export async function loadInviteDeliveryDetails(
  supabase: Supabase,
  module: 'pentagrama' | 'nr01',
  referenceId: string,
  surveyKind?: string,
): Promise<InviteDeliveryRow[]> {
  let q = supabase
    .from('survey_invites')
    .select(
      `
      contact_id,
      email_status,
      email_sent_at,
      email_delivered_at,
      email_opened_at,
      opened_at,
      email_error,
      company_contacts ( full_name, email )
    `,
    )
    .eq('module', module)
    .eq('reference_id', referenceId)

  if (surveyKind) q = q.eq('survey_kind', surveyKind)

  const { data } = await q.order('created_at')

  return ((data ?? []) as Array<{
    contact_id: string
    email_status: string | null
    email_sent_at: string | null
    email_delivered_at: string | null
    email_opened_at: string | null
    opened_at: string | null
    email_error: string | null
    company_contacts: { full_name: string; email: string } | null
  }>).map((row) => {
    const contact = row.company_contacts
    const mapped = mapStatus(row.email_status, row.email_error)
    return {
      contactId: row.contact_id,
      fullName: contact?.full_name ?? '—',
      email: contact?.email ?? '—',
      emailStatus: row.email_status ?? 'pending',
      label: mapped.label,
      detail: mapped.detail,
      sentAt: row.email_sent_at,
      deliveredAt: row.email_delivered_at,
      openedAt: row.email_opened_at ?? row.opened_at,
      error: row.email_error,
    }
  })
}

export function groupDeliveryRows(rows: InviteDeliveryRow[]) {
  const delivered = rows.filter((r) => r.emailStatus === 'delivered')
  const sentPending = rows.filter((r) => r.emailStatus === 'sent')
  const notDelivered = rows.filter((r) =>
    ['failed', 'bounced', 'complained', 'pending'].includes(r.emailStatus),
  )
  const other = rows.filter(
    (r) =>
      r.emailStatus !== 'delivered' &&
      r.emailStatus !== 'sent' &&
      !['failed', 'bounced', 'complained', 'pending'].includes(r.emailStatus),
  )
  return { delivered, sentPending, notDelivered, other, all: rows }
}
