/**
 * Resolve user id por e-mail — profiles + Auth Admin (convite sem profile sincronizado).
 */

import { createServiceRoleAdmin } from '@/lib/supabase/service-role'

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

async function ensureProfileRow(userId: string, email: string, name?: string | null): Promise<void> {
  const admin = createServiceRoleAdmin()
  const { data: existing } = await admin
    .from('profiles')
    .select('id')
    .eq('id', userId)
    .maybeSingle()

  if (existing?.id) return

  await admin.from('profiles').upsert(
    {
      id: userId,
      email: normalizeEmail(email),
      name: name?.trim() || email.split('@')[0] || 'Usuário',
      role: 'leader',
      is_active: true,
      module_pentagrama: false,
      module_nr01: false,
    } as never,
    { onConflict: 'id' },
  )
}

/**
 * Retorna user id ou null. Mensagem amigável via segunda função.
 */
export async function resolveUserIdByEmail(email: string): Promise<string | null> {
  const normalized = normalizeEmail(email)
  if (!normalized.includes('@')) return null

  const admin = createServiceRoleAdmin()

  const { data: byExact } = await admin
    .from('profiles')
    .select('id')
    .eq('email', normalized)
    .maybeSingle()

  if (byExact?.id) return byExact.id as string

  const { data: byIlike } = await admin
    .from('profiles')
    .select('id, email')
    .ilike('email', normalized)
    .limit(1)
    .maybeSingle()

  if (byIlike?.id) return byIlike.id as string

  let page = 1
  const perPage = 200
  for (let i = 0; i < 10; i++) {
    const { data: list, error } = await admin.auth.admin.listUsers({ page, perPage })
    if (error || !list?.users?.length) break

    const hit = list.users.find((u) => u.email?.toLowerCase() === normalized)
    if (hit?.id) {
      await ensureProfileRow(hit.id, hit.email ?? normalized, hit.user_metadata?.name as string | undefined)
      return hit.id
    }

    if (list.users.length < perPage) break
    page++
  }

  return null
}

export function userNotFoundMessage(email: string): string {
  return `Nenhum usuário com o e-mail "${email.trim()}". Marque "Enviar convite automaticamente" ou cadastre em Admin → Usuários.`
}

/**
 * Convite liderança (porta a porta) — link personalizado Resend, módulos bloqueados até fatura paga.
 */
export async function inviteLeaderByEmail(params: {
  email: string
  name?: string | null
  invoiceNumber?: string | null
}): Promise<{ userId: string; invited: boolean; emailSent: boolean }> {
  const normalized = normalizeEmail(params.email)
  const existing = await resolveUserIdByEmail(normalized)
  if (existing) {
    return { userId: existing, invited: false, emailSent: false }
  }

  const { ensureLeaderAuthWithSetupLink } = await import('@/lib/auth/leader-onboarding-email')
  return ensureLeaderAuthWithSetupLink({
    email: normalized,
    name: params.name,
    invoiceNumber: params.invoiceNumber,
  })
}
