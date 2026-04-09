/**
 * QUANTUM5G — TELA-01: Página de Login
 * Server Component. Formulário POST para Server Action.
 * Redirect automático via middleware se já autenticado.
 */

import { login } from './actions'

interface LoginPageProps {
  searchParams: Promise<{ error?: string }>
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorMsg = params.error

  return (
    <div className="w-full max-w-sm space-y-8">
      {/* Header */}
      <div className="space-y-2">
        <div className="lg:hidden">
          <span className="text-zinc-900 text-lg font-semibold tracking-tight">
            Quantum5G
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-zinc-900">
          Acesse sua conta
        </h2>
        <p className="text-sm text-zinc-500">
          Diagnóstico Pentagrama de Ginger
        </p>
      </div>

      {/* Mensagem de erro */}
      {errorMsg && (
        <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3">
          <p className="text-sm text-red-700">{decodeURIComponent(errorMsg)}</p>
        </div>
      )}

      {/* Formulário */}
      <form action={login} className="space-y-5">
        <div className="space-y-1.5">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-zinc-700"
          >
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            placeholder="seu@email.com"
            className="
              block w-full rounded-lg border border-zinc-300
              bg-white px-3.5 py-2.5 text-sm text-zinc-900
              placeholder:text-zinc-400
              focus:border-zinc-900 focus:outline-none focus:ring-2
              focus:ring-zinc-900/10
              disabled:cursor-not-allowed disabled:opacity-50
            "
          />
        </div>

        <div className="space-y-1.5">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-zinc-700"
          >
            Senha
          </label>
          <input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••"
            className="
              block w-full rounded-lg border border-zinc-300
              bg-white px-3.5 py-2.5 text-sm text-zinc-900
              placeholder:text-zinc-400
              focus:border-zinc-900 focus:outline-none focus:ring-2
              focus:ring-zinc-900/10
              disabled:cursor-not-allowed disabled:opacity-50
            "
          />
        </div>

        <button
          type="submit"
          className="
            w-full rounded-lg bg-zinc-900 px-4 py-2.5
            text-sm font-semibold text-white
            hover:bg-zinc-700 active:bg-zinc-800
            focus:outline-none focus:ring-2 focus:ring-zinc-900/30
            transition-colors
          "
        >
          Entrar
        </button>
      </form>

      {/* Nota de versão */}
      <p className="text-center text-xs text-zinc-400">
        Acesso restrito a usuários cadastrados.
      </p>
    </div>
  )
}
