/**
 * Login SaaS — apex quantun5g.app (viewport única, desktop e mobile).
 */

import Link from 'next/link'
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
    blurb: 'IL + IC nas cinco dimensões do método validado.',
  },
  {
    id: 'nr01',
    name: 'NR-01',
    tag: 'Regulatório',
    blurb: 'Pesquisa psicossocial, laudo e evidências MTE.',
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
  const contratacaoHref = redirectTo === '/contratacao' ? '/contratacao' : '/login?redirect=/contratacao'

  return (
    <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-4 py-5 sm:max-w-lg sm:px-6">
        {/* Marca + plataforma */}
        <header className="shrink-0 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">
            Plataforma
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight sm:text-[1.65rem]">
            Quantum5G
          </h1>
          <p className="mt-1 text-xs leading-snug text-slate-400">
            Saúde organizacional e conformidade psicossocial em um só ecossistema.
          </p>
        </header>

        {/* Módulos — bloco único */}
        <div
          className="mt-4 shrink-0 rounded-xl border border-white/10 bg-white/5 p-3 backdrop-blur-sm"
          aria-label="Módulos da plataforma"
        >
          <p className="mb-2 text-center text-[10px] font-medium uppercase tracking-wide text-slate-500">
            Módulos
          </p>
          <ul className="grid grid-cols-2 gap-2">
            {MODULES.map((m) => (
              <li
                key={m.id}
                className="rounded-lg border border-white/10 bg-slate-900/60 px-2.5 py-2"
              >
                <span className="block text-[10px] font-semibold uppercase text-violet-300/90">
                  {m.tag}
                </span>
                <span className="mt-0.5 block text-xs font-semibold leading-tight text-white">
                  {m.name}
                </span>
                <span className="mt-0.5 block text-[10px] leading-snug text-slate-400">
                  {m.blurb}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Formulário */}
        <div className="mt-4 shrink-0 rounded-xl border border-white/10 bg-white p-4 text-zinc-900 shadow-xl shadow-black/20">
          <h2 className="text-base font-bold text-zinc-900">Acesse sua conta</h2>
          <p className="mt-0.5 text-xs text-zinc-500">E-mail e senha cadastrados na plataforma.</p>

          {errorMsg && (
            <div className="mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2">
              <p className="text-xs text-red-700">{decodeURIComponent(errorMsg)}</p>
            </div>
          )}

          <form action={login} className="mt-3 space-y-3">
            {redirectTo ? <input type="hidden" name="redirect" value={redirectTo} /> : null}
            <div>
              <label htmlFor="email" className="block text-xs font-medium text-zinc-700">
                E-mail
              </label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                placeholder="seu@email.com"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/20"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-xs font-medium text-zinc-700">
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                placeholder="••••••••"
                className="mt-1 block w-full rounded-lg border border-zinc-300 px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900/20"
              />
            </div>
            <button
              type="submit"
              className="w-full rounded-lg bg-zinc-900 py-2.5 text-sm font-semibold text-white hover:bg-zinc-800"
            >
              Entrar
            </button>
          </form>
        </div>

        {/* Orientação contratação / primeiro acesso */}
        <aside className="mt-3 shrink-0 space-y-2 text-center text-[11px] leading-snug text-slate-400">
          <p>
            <strong className="font-medium text-slate-300">Primeira vez?</strong> Clientes recebem
            por e-mail o link para <strong className="text-slate-300">criar senha</strong> após a
            contratação — use esse link, não cadastre aqui.
          </p>
          <p>
            <strong className="font-medium text-slate-300">Consultor ou parceiro:</strong> entre com
            seu acesso e emita a fatura presencial do cliente.
          </p>
          <Link
            href={contratacaoHref}
            className="inline-flex w-full items-center justify-center rounded-lg border border-violet-400/40 bg-violet-500/15 px-3 py-2.5 text-xs font-semibold text-violet-100 transition hover:bg-violet-500/25"
          >
            Contratação presencial — emitir fatura ao cliente
          </Link>
          <p className="text-[10px] text-slate-500">
            Conheça a oferta NR-01 em{' '}
            <Link href="/lp/nr01" className="text-slate-400 underline hover:text-white">
              quantun5g.app/lp/nr01
            </Link>
          </p>
        </aside>
      </div>

      <footer className="shrink-0 pb-3 text-center text-[10px] text-slate-600">
        © {new Date().getFullYear()} Quantum5G
      </footer>
    </div>
  )
}
