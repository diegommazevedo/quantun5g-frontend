import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quantum5G | Institucional',
  description: 'Informações institucionais da Quantum5G.',
}

export default function InstitucionalPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-slate-700">
      <header>
        <p className="text-sm font-semibold uppercase tracking-wide text-slate-500">Quantum5G</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Institucional</h1>
        <p className="mt-4 text-base leading-relaxed">
          Diagnóstico organizacional com o Pentagrama de Ginger e conformidade regulatória com o módulo NR-01
          (fatores de risco psicossociais).
        </p>
      </header>
      <nav className="mt-10 space-y-3 border-t border-slate-200 pt-8 text-base">
        <Link href="/" className="block text-blue-900 underline underline-offset-2 hover:text-blue-700">
          Início
        </Link>
        <Link href="/termos" className="block text-blue-900 underline underline-offset-2 hover:text-blue-700">
          Termos de uso
        </Link>
        <Link href="/privacidade" className="block text-blue-900 underline underline-offset-2 hover:text-blue-700">
          Política de privacidade
        </Link>
        <a
          href="mailto:contato@quantum5g.app"
          className="block text-blue-900 underline underline-offset-2 hover:text-blue-700"
        >
          contato@quantum5g.app
        </a>
      </nav>
    </div>
  )
}
