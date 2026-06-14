import { createClient as createAdminClient } from '@supabase/supabase-js'

export type UserActivationKind = 'active' | 'inactive' | 'invite_pending'

export const ACTIVATION_LABEL: Record<UserActivationKind, string> = {
  active: 'Ativo',
  inactive: 'Inativo',
  invite_pending: 'Convite pendente',
}

export const ACTIVATION_HINT: Record<UserActivationKind, string> = {
  active: 'Senha definida e acesso concluído.',
  inactive: 'Conta bloqueada pelo administrador.',
  invite_pending: 'Aguardando criação de senha (convite ou link já enviado).',
}

export interface AuthUserSnapshot {
  password_set: boolean
}

export function resolveActivationKind(
  isActive: boolean,
  auth: AuthUserSnapshot,
): UserActivationKind {
  if (!isActive) return 'inactive'
  if (auth.password_set) return 'active'
  return 'invite_pending'
}

function admin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
  )
}

export async function loadAuthSnapshotsByUserIds(
  userIds: string[],
): Promise<Record<string, AuthUserSnapshot>> {
  const out: Record<string, AuthUserSnapshot> = {}
  if (!userIds.length) return out

  const wanted = new Set(userIds)
  const client = admin()
  let page = 1

  for (;;) {
    const { data, error } = await client.auth.admin.listUsers({ page, perPage: 1000 })
    if (error) break

    for (const u of data.users) {
      if (!wanted.has(u.id)) continue
      const meta = u.user_metadata as { password_set?: boolean } | undefined
      out[u.id] = { password_set: meta?.password_set === true }
    }

    if (data.users.length < 1000) break
    if (Object.keys(out).length >= wanted.size) break
    page += 1
  }

  for (const id of userIds) {
    if (!(id in out)) out[id] = { password_set: false }
  }

  return out
}

export async function loadActivationStatusByUserIds(
  profiles: { id: string; is_active: boolean }[],
): Promise<Record<string, UserActivationKind>> {
  const snapshots = await loadAuthSnapshotsByUserIds(profiles.map((p) => p.id))
  const out: Record<string, UserActivationKind> = {}
  for (const p of profiles) {
    out[p.id] = resolveActivationKind(p.is_active, snapshots[p.id])
  }
  return out
}
