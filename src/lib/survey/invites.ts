import { createServiceRoleClient } from '@/lib/supabase/service-role'

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

/** Marca primeira abertura do link personalizado (parâmetro ?invite=). Não identifica resposta IC/NR-01. */
export async function markSurveyInviteOpened(inviteToken: string | undefined | null): Promise<void> {
  const raw = inviteToken?.trim()
  if (!raw || !UUID_RE.test(raw)) return

  const supabase = createServiceRoleClient()
  await supabase
    .from('survey_invites')
    .update({ opened_at: new Date().toISOString() } as never)
    .eq('token', raw)
    .is('opened_at', null)
}
