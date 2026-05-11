import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Obrigado | Quantum5G NR-01',
  description: 'Recebemos o seu pedido de contacto.',
}

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const OK = '#4A7C59'

type Props = { searchParams: Promise<{ e?: string }> }

export default async function ObrigadoPage({ searchParams }: Props) {
  const sp = await searchParams
  const email = sp.e ? decodeURIComponent(sp.e) : ''

  return (
    <div className="flex min-h-screen flex-col px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-lg text-center">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: OK }}>
          Pedido recebido
        </p>
        <h1 className="mt-4 text-2xl font-bold sm:text-3xl">Obrigado</h1>
        <p className="mt-4 text-sm leading-relaxed opacity-90">
          A equipa comercial da Quantum5G vai contactar em breve
          {email ? (
            <>
              {' '}
              no endereço <span className="font-medium text-white">{email}</span>
            </>
          ) : null}
          .
        </p>
        <Link
          href="/lp/nr01"
          className="mt-10 inline-block min-h-[44px] rounded-lg px-6 py-3 text-sm font-semibold transition hover:opacity-95"
          style={{ backgroundColor: ACCENT, color: BG }}
        >
          Voltar à landing
        </Link>
      </div>
    </div>
  )
}
