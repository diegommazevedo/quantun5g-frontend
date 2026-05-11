const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

export function FinalCTA() {
  return (
    <section className="px-4 py-16 sm:py-20" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-3xl rounded-2xl border border-white/10 px-6 py-10 text-center sm:px-10">
        <p className="text-sm font-semibold uppercase tracking-wide" style={{ color: ALERT }}>
          Prazo regulatório
        </p>
        <h2 className="mt-3 text-2xl font-bold sm:text-3xl">Sua empresa tem até 26 de maio de 2026</h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed opacity-90">
          Garanta laudo, plano e evidências com trilha técnica antes da fiscalização intensificar. Quanto antes
          estruturar o diagnóstico, menor o risco operacional e jurídico percebido.
        </p>
        <div className="mt-8 flex flex-col items-stretch justify-center gap-4 sm:flex-row sm:justify-center">
          <a
            href="#captura-diagnostico"
            className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-lg px-6 py-3 text-base font-semibold transition hover:opacity-95"
            style={{ backgroundColor: ACCENT, color: BG }}
          >
            Falar com a Quantum5G
          </a>
          <a
            href="#planos"
            className="inline-flex min-h-[48px] min-w-[200px] items-center justify-center rounded-lg border-2 px-6 py-3 text-base font-semibold transition hover:bg-white/5"
            style={{ borderColor: ACCENT, color: TEXT }}
          >
            Ver planos
          </a>
        </div>
      </div>
    </section>
  )
}
