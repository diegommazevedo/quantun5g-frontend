const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const OK = '#4A7C59'

const cards = [
  {
    title: 'NR-01 atualizada',
    body: 'Portarias MTE 1.419/2024 e 765/2025: GRO com FRP explícitos, participação e documentação auditável.',
  },
  {
    title: 'Lei 14.457/2022',
    body: 'Saúde mental no trabalho e prevenção de estresse, alinhada às dimensões ISO 45003 usadas no instrumento.',
  },
  {
    title: 'Fiscalização ativa',
    body: 'Evidência técnica, trilhas imutáveis e laudo legível reduzem risco de autuação por lacuna documental.',
  },
]

export function RegulatoryContext() {
  return (
    <section className="px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Contexto regulatório</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm opacity-90">
          Três frentes que exigem diagnóstico sério — não apenas pesquisa de clima.
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <li
              key={c.title}
              className="flex flex-col rounded-2xl border border-white/10 p-6"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <span className="h-1 w-12 rounded-full" style={{ backgroundColor: OK }} aria-hidden />
              <h3 className="mt-4 text-lg font-semibold" style={{ color: ACCENT }}>
                {c.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed opacity-90">{c.body}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
