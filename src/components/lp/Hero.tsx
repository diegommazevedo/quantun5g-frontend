import Link from 'next/link'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function Hero() {
  return (
    <section
      className="px-4 py-16 sm:py-24"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      <div className="mx-auto max-w-4xl text-center">
        <p className="text-sm font-medium uppercase tracking-widest" style={{ color: ACCENT }}>
          NR-01 · Fatores psicossociais
        </p>
        <h1 className="mt-4 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
          Laudo técnico, plano PDCA e pacote Trino com hashes e audit log — pronto para fiscalização.
        </h1>
        <p className="mx-auto mt-4 max-w-2xl text-base leading-relaxed opacity-90 sm:text-lg">
          Quantum5G automatiza a coleta anônima, o motor regulatório e os PDFs com trilha imutável. Menos planilha,
          mais evidência.
        </p>
        <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed opacity-80">
          Plataforma Quantum5G — Pentagrama de Ginger (IC/IL) em paralelo ao módulo NR-01 quando contratado.
        </p>
        <div className="mt-10 flex flex-col items-center justify-center gap-4 sm:flex-row">
          <a
            href="#captura-diagnostico"
            className="inline-flex min-h-[44px] min-w-[200px] items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition hover:opacity-95"
            style={{ backgroundColor: ACCENT, color: BG }}
          >
            Quero diagnóstico NR-01
          </a>
          <Link
            href="/lp/nr01/calculadora"
            className="inline-flex min-h-[44px] min-w-[200px] items-center justify-center rounded-lg border-2 px-6 py-3 text-base font-semibold transition hover:bg-white/5"
            style={{ borderColor: ACCENT, color: TEXT }}
          >
            Simular investimento
          </Link>
        </div>
      </div>
    </section>
  )
}
