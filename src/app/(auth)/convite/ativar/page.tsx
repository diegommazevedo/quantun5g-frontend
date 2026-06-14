/**
 * Primeiro acesso — usuário convidado define senha após validar o link do e-mail.
 */

import { redirect } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { definirSenhaConvite } from './actions'
import type { UserRole } from '@/types/database'

const ROLE_LABEL: Record<string, string> = {
  admin: 'Administrador',
  consultant: 'Consultor licenciado',
  contratante: 'Contratante',
  gerente: 'Gerente de filial',
  leader: 'Contratante',
  collaborator: 'Colaborador',
}

interface Props {
  searchParams: Promise<{ error?: string }>
}

export const metadata = {
  title: 'Ativar acesso · Quantum5G',
  description: 'Crie sua senha e entre na plataforma Quantum5G.',
}

export default async function ConviteAtivarPage({ searchParams }: Props) {
  const { error } = await searchParams
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return (
      <ConviteShell>
        <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          <p className="font-semibold">Link inválido ou sessão expirada</p>
          <p className="mt-1 text-xs text-amber-800">
            Abra novamente o link recebido por e-mail ou peça um novo convite ao administrador.
          </p>
        </div>
        <Link
          href="/login"
          className="mt-4 inline-block text-sm font-medium text-violet-200 hover:text-white"
        >
          Ir para o login →
        </Link>
      </ConviteShell>
    )
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, email')
    .eq('id', user.id)
    .returns<{ name: string | null; role: UserRole; email: string | null }[]>()
    .single()

  const name = profile?.name ?? user.email?.split('@')[0] ?? 'Usuário'
  const roleLabel = ROLE_LABEL[profile?.role ?? ''] ?? profile?.role ?? 'Usuário'

  return (
    <ConviteShell>
      <div className="q-card-form rounded-xl border border-zinc-200 p-5 shadow-xl shadow-black/20">
        <p className="text-[10px] font-semibold uppercase tracking-wide text-violet-700">
          Primeiro acesso
        </p>
        <h1 className="mt-1 text-xl font-bold text-zinc-900">Olá, {name}</h1>
        <p className="mt-1 text-sm text-zinc-600">
          Crie sua senha para entrar na plataforma como <strong>{roleLabel}</strong>.
        </p>
        {user.email && (
          <p className="mt-2 font-mono text-xs text-zinc-500">{user.email}</p>
        )}

        {error && (
          <div className="mt-4 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
            {decodeURIComponent(error)}
          </div>
        )}

        <form action={definirSenhaConvite} className="mt-5 space-y-4">
          <div>
            <label htmlFor="password" className="block text-xs font-medium text-zinc-700">
              Nova senha
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              placeholder="Mínimo 8 caracteres"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/20"
            />
          </div>
          <div>
            <label htmlFor="confirm" className="block text-xs font-medium text-zinc-700">
              Confirmar senha
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              required
              minLength={8}
              autoComplete="new-password"
              className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
          >
            Ativar acesso e entrar
          </button>
        </form>
      </div>
    </ConviteShell>
  )
}

function ConviteShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-8">
        <header className="mb-6 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Plataforma
          </p>
          <h2 className="mt-1 text-2xl font-bold tracking-tight">Quantum5G</h2>
        </header>
        {children}
      </div>
      <footer className="pb-4 text-center text-[10px] text-slate-600">
        © {new Date().getFullYear()} Quantum5G
      </footer>
    </div>
  )
}
