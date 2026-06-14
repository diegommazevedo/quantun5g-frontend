import { createClient as createAdminClient } from '@supabase/supabase-js'

export type UserActivationKind = 'active' | 'inactive' | 'invite_pending'

export const ACTIVATION_LABEL: Record<UserActivationKind, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  invite_pending: 'Convite pendente',
}

export const ACTIVATION_HINT: Record<UserActivationKind, string> = {
  active: 'Já acessou a plataforma e definiu senha.',
  inactive: 'Conta bloqueada pelo administrador.',
  invite_pending: 'E-mail de convite enviado; aguardando criação de senha.',
}

export function resolveActivationKind(
  isActive: boolean,
  lastSignInAt: string | null | undefined,
): UserActivationKind {
  if (!isActive) return 'inactive'
  if (!lastSignInAt) return 'invite_pending'
  return 'active'
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

/** Mapa userId → último login (Auth Admin). */
export async function loadLastSignInByUserIds(
  userIds: string[],
): Promise<Record<string, string | null>> {
  const out: Record<string, string | null> = {}
  if (!userIds.length) return out

  const wanted = new Set(userIds)
  const client = admin()
  let page = 1

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break

    for (const u of data.users) {
      if (wanted.has(u.id)) {
        out[u.id] = u.last_sign_in_at ?? null
      }
    }

    if (data.users.length < 1000) break
    if (Object.keys(out).length >= wanted.size) break
    page += 1
  }

  for (const id of userIds) {
    if (!(id in out)) out[id] = null
  }

  return out
}

export async function loadActivationStatusByUserIds(
  profiles: { id: string; is_active: boolean }[],
): Promise<Record<string, UserActivationKind>> {
  const lastSignIn = await loadLastSignInByUserIds(profiles.map((p) => p.id))
  const out: Record<string, UserActivationKind> = {}
  for (const p of profiles) {
    out[p.id] = resolveActivationKind(p.is_active, lastSignIn[p.id])
  }
  return out
}
