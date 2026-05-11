const LIGHT = '#F5F1EA'
const DARK = '#0B1A2F'
const ACCENT = '#B8945A'
const OK = '#4A7C59'

const cards = [
  { title: 'Laudo técnico', body: 'Leitura por dimensão, nível de risco e narrativa para defesa documental.' },
  { title: 'Plano PDCA', body: 'Ações priorizadas com responsáveis sugeridos e ciclo de verificação.' },
  { title: 'Evidências', body: 'Hashes do instrumento e do pacote — rastreabilidade ponta a ponta.' },
]

export function PackageTrino() {
  return (
    <section className="px-4 py-16 sm:py-20" style={{ backgroundColor: LIGHT, color: DARK }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Pacote Trino</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm text-zinc-700">
          Os três entregáveis que fecham o ciclo NR-01 com rigor técnico e estética institucional.
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-3">
          {cards.map((c) => (
            <li key={c.title} className="rounded-2xl border border-black/10 bg-white p-6 shadow-sm">
              <div className="h-1 w-10 rounded-full" style={{ backgroundColor: ACCENT }} />
              <h3 className="mt-4 text-lg font-semibold">{c.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-zinc-700">{c.body}</p>
            </li>
          ))}
        </ul>
        <div
          className="mx-auto mt-10 max-w-3xl rounded-2xl border px-5 py-4 text-center text-sm sm:text-base"
          style={{ borderColor: OK, backgroundColor: 'rgba(74,124,89,0.08)' }}
        >
          <p className="font-semibold" style={{ color: OK }}>
            Bónus de lançamento
          </p>
          <p className="mt-1 text-zinc-800">
            Onboarding guiado e revisão de pacote incluídos para contratos assinados até{' '}
            <strong>30 de junho de 2026</strong> — sujeito a disponibilidade de agenda consultiva.
          </p>
        </div>
      </div>
    </section>
  )
}
