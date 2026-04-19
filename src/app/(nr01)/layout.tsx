/**
 * QUANTUM5G — Layout do módulo NR-01
 * Reutiliza autenticação Supabase. Header próprio para diferenciar
 * visualmente o módulo regulatório do Pentagrama.
 */

import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function Nr01Layout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return (
    <div className="min-h-screen bg-zinc-50">
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <Link href="/nr01/dashboard" className="text-sm font-semibold text-zinc-900">
              Quantum5G · <span className="text-orange-600">NR-01</span>
            </Link>
            <nav className="flex items-center gap-4 text-sm">
              <Link href="/nr01/dashboard" className="text-zinc-600 hover:text-zinc-900">
                Painel
              </Link>
              <Link href="/nr01/avaliacao/nova" className="text-zinc-600 hover:text-zinc-900">
                Nova avaliação
              </Link>
              <Link href="/dashboard" className="text-zinc-400 hover:text-zinc-700">
                ← Pentagrama
              </Link>
            </nav>
          </div>
          <div className="text-xs text-zinc-500">{user.email}</div>
        </div>
      </header>
      <main className="mx-auto max-w-6xl px-6 py-8">{children}</main>
    </div>
  )
}
