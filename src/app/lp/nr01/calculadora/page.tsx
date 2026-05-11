import Link from 'next/link'
import type { Metadata } from 'next'
import { Calculator } from '@/components/lp/Calculator'

export const metadata: Metadata = {
  title: 'Calculadora NR-01 | Quantum5G',
  description: 'Simule a escala da avaliação NR-01 e veja o tier indicativo.',
}

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export default function CalculadoraPage() {
  return (
    <div style={{ backgroundColor: BG, color: TEXT }} className="min-h-screen">
      <div className="mx-auto max-w-3xl px-4 pt-10">
        <Link href="/lp/nr01" className="text-sm font-medium underline underline-offset-4" style={{ color: ACCENT }}>
          ← Voltar à landing NR-01
        </Link>
        <h1 className="mt-6 text-2xl font-bold sm:text-3xl">Calculadora de escala</h1>
        <p className="mt-2 text-sm opacity-90">Indicativo comercial — não substitui proposta formal.</p>
      </div>
      <Calculator />
    </div>
  )
}
