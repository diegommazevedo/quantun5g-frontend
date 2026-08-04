/**
 * Login SaaS — apex quantun5g.app (viewport única, desktop e mobile).
 */

import { login } from './actions'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

interface LoginPageProps {
  searchParams: Promise<{ error?: string; redirect?: string }>
}

const MODULES = [
  {
    id: 'pentagrama',
    name: 'Pentagrama de Ginger',
    tag: 'Diagnóstico',
    accent: 'bg-violet-400',
  },
  {
    id: 'nr01',
    name: 'NR-01',
    tag: 'Regulatório',
    accent: 'bg-blue-400',
  },
] as const

export const metadata = {
  title: 'Entrar · Quantum5G',
  description: 'Acesso à plataforma Quantum5G — Pentagrama e NR-01.',
}

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams
  const errorMsg = params.error
  const redirectTo = safeRedirectPath(params.redirect)

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-6 sm:px-6">
        {/* Marca */}
        <header className="shrink-0 text-center">
          <h1 className="text-3xl font-bold tracking-tight sm:text-[2rem]">Quantum5G</h1>
          <p className="mt-2 text-sm leading-snug text-slate-400">
            Saúde organizacional e conformidade psicossocial.
          </p>
        </header>

        {/* Módulos — leitura rápida, sem caixa dupla */}
        <ul
          className="mt-6 grid shrink-0 grid-cols-2 gap-2.5"
          aria-label="Módulos da plataforma"
        >
          {MODULES.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-white/10 bg-white/[0.04] px-3 py-2.5"
            >
              <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-400">
                <span aria-hidden className={`h-1.5 w-1.5 rounded-full ${m.accent}`} />
                {m.tag}
              </span>
              <span className="mt-1 block text-sm font-semibold leading-snug text-white">
                {m.name}
              </span>
            </li>
          ))}
        </ul>

        {/* Formulário — superfície escura (evita contraste quebrado do card branco) */}
        <div className="mt-5 shrink-0 rounded-xl border border-white/10 bg-slate-900/70 p-5 shadow-xl shadow-black/30">
          <h2 className="text-lg font-semibold text-white">Entrar</h2>
          <p className="mt-1 text-xs text-slate-400">Use o e-mail e a senha da sua conta.</p>

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-red-400/30 bg-red-500/10 px-3 py-2">
              <p className="text-xs text-red-200">{decodeURIComponent(errorMsg)}</p>
            </div>
          )}

          <form action={login} className="mt-4 space-y-3.5">
            {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-slate-300">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                className="mt-1.5 block w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-slate-300">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="mt-1.5 block w-full rounded-lg border border-white/15 bg-slate-950/60 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 focus:border-white/30 focus:outline-none focus:ring-1 focus:ring-white/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-white py-2.5 text-sm font-semibold text-slate-900 transition hover:bg-slate-100"
            >
              Entrar
            </button>
          </form>
        </div>

        {/* Ajuda — curta */}
        <aside className="mt-5 shrink-0 text-center text-xs leading-relaxed text-slate-400">
          <p>
            Primeira vez? Use o link de <span className="text-slate-300">criar senha</span> enviado
            por e-mail após a contratação.
          </p>
        </aside>
      </div>

      <footer className="shrink-0 pb-4 text-center text-[10px] text-slate-600">
        © {new Date().getFullYear()} Quantum5G
      </footer>
    </div>
  )
}
