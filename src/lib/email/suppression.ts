/**
 * Lista de supressão global — hard bounce e spam complaint (LGPD: e-mail normalizado).
 */

import type { SupabaseClient } from '@supabase/supabase-js'

export type SuppressionReason = 'hard_bounce' | 'complaint' | 'manual'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

export async function loadSuppressedEmailSet(
  supabase: SupabaseClient,
  emails: string[],
): Promise<Set<string>> {
  const normalized = [...new Set(emails.map(normalizeEmail).filter((e) => e.includes('@')))]
  if (normalized.length === 0) return new Set()

  const { data } = await supabase
    .from('email_suppressions')
    .select('email_normalized')
    .in('email_normalized', normalized)

  return new Set((data ?? []).map((r) => (r as { email_normalized: string }).email_normalized))
}

export async function isEmailSuppressed(
  supabase: SupabaseClient,
  email: string,
): Promise<boolean> {
  const set = await loadSuppressedEmailSet(supabase, [email])
  return set.has(normalizeEmail(email))
}

export async function addEmailSuppression(
  supabase: SupabaseClient,
  input: {
    email: string
    reason: SuppressionReason
    resendEmailId?: string | null
    resendEventId?: string | null
    contactId?: string | null
    notes?: string | null
  },
): Promise<void> {
  const email_normalized = normalizeEmail(input.email)
  if (!email_normalized.includes('@')) return

  await supabase.from('email_suppressions').upsert(
    {
      email_normalized,
      reason: input.reason,
      resend_email_id: input.resendEmailId ?? null,
      resend_event_id: input.resendEventId ?? null,
      contact_id: input.contactId ?? null,
      notes: input.notes ?? null,
    } as never,
    { onConflict: 'email_normalized', ignoreDuplicates: false },
  )

  await supabase
    .from('company_contacts')
    .update({ is_active: false, updated_at: new Date().toISOString() } as never)
    .ilike('email', email_normalized)
}

export async function loadSuppressionDetailsForEmails(
  supabase: SupabaseClient,
  emails: string[],
): Promise<Map<string, EmailSuppressionRow>> {
  const normalized = [...new Set(emails.map(normalizeEmail).filter((e) => e.includes('@')))]
  if (normalized.length === 0) return new Map()

  const { data } = await supabase
    .from('email_suppressions')
    .select('id, email_normalized, reason, notes, created_at, contact_id')
    .in('email_normalized', normalized)

  const map = new Map<string, EmailSuppressionRow>()
  for (const row of (data ?? []) as EmailSuppressionRow[]) {
    map.set(row.email_normalized, row)
  }
  return map
}

export interface EmailSuppressionRow {
  id: string
  email_normalized: string
  reason: SuppressionReason
  notes: string | null
  created_at: string
  contact_id: string | null
}

const REASON_LABEL: Record<SuppressionReason, string> = {
  hard_bounce: 'Bounce permanente',
  complaint: 'Marcado como spam',
  manual: 'Bloqueio manual',
}

export function suppressionReasonLabel(reason: SuppressionReason): string {
  return REASON_LABEL[reason] ?? reason
}

/** Remove da lista global e reativa contatos da empresa (reativação manual pelo consultor). */
export async function reactivateEmailForCompany(
  supabase: SupabaseClient,
  companyId: string,
  email: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const email_normalized = normalizeEmail(email)
  if (!email_normalized.includes('@')) {
    return { ok: false, error: 'E-mail inválido' }
  }

  const { data: belongs } = await supabase
    .from('company_contacts')
    .select('id')
    .eq('company_id', companyId)
    .ilike('email', email_normalized)
    .limit(1)
    .maybeSingle()

  if (!belongs) {
    return { ok: false, error: 'E-mail não pertence à equipe desta empresa' }
  }

  const { error: delErr } = await supabase
    .from('email_suppressions')
    .delete()
    .eq('email_normalized', email_normalized)

  if (delErr) {
    return { ok: false, error: delErr.message }
  }

  await supabase
    .from('company_contacts')
    .update({ is_active: true, updated_at: new Date().toISOString() } as never)
    .eq('company_id', companyId)
    .ilike('email', email_normalized)

  return { ok: true }
}
