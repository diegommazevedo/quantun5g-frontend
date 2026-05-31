/**
 * QUANTUM5G — Layout /admin
 * Gate de segurança: só role='admin' passa.
 * Redireciona qualquer outro perfil para /dashboard.
 */

import { redirect }       from 'next/navigation'
import { createClient }   from '@/lib/supabase/server'
import { logout }         from '@/app/(auth)/login/actions'

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('name, role, email')
    .eq('id', user.id)
    .single() as { data: { name: string | null; role: string; email: string | null } | null }

  if (profile?.role !== 'admin') redirect('/dashboard')

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-4">
              <a href="/dashboard" className="text-zinc-900 font-semibold text-base tracking-tight hover:text-zinc-600 transition-colors">
                Quantum5G
              </a>
              <span className="text-zinc-300">|</span>
              <nav className="flex items-center gap-1">
                <a
                  href="/admin/usuarios"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Usuários
                </a>
                <a
                  href="/admin/consultores"
                  className="rounded-md px-3 py-1.5 text-sm font-medium text-zinc-700 hover:bg-zinc-100 transition-colors"
                >
                  Consultores
                </a>
              </nav>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <p className="text-sm font-medium text-zinc-900 leading-none">
                  {profile?.name ?? user.email}
                </p>
                <p className="text-xs text-zinc-400 mt-0.5">Admin</p>
              </div>
              <form action={logout}>
                <button
                  type="submit"
                  className="text-sm text-zinc-500 hover:text-zinc-900 transition-colors px-3 py-1.5 rounded-md hover:bg-zinc-100"
                >
                  Sair
                </button>
              </form>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 mx-auto w-full max-w-7xl px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  )
}
