const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

const pillars = [
  { title: '80 questões', desc: 'Instrumento NR-01 completo, alinhado ao desenho metodológico Quantum5G.' },
  { title: '10 dimensões ISO 45003', desc: 'Mapeamento explícito às categorias psicossociais da norma internacional.' },
  { title: '55 laudos', desc: 'Textos técnicos calibrados por combinação de achado — consistência na leitura.' },
  { title: 'Pseudonimização LGPD', desc: 'IP e dados sensíveis tratados com HMAC/SHA-256 onde aplicável ao produto.' },
  { title: 'Audit log imutável', desc: 'Eventos append-only para trilha de versão e defesa em fiscalização.' },
]

export function Methodology5Pillars() {
  return (
    <section className="px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-5xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Metodologia em 5 pilares</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm opacity-90">
          Do instrumento à evidência — tudo pensado para consultoria e SESMT operarem com segurança.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {pillars.map((p) => (
            <li
              key={p.title}
              className="flex flex-col rounded-xl border border-white/10 p-5"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <h3 className="text-base font-semibold" style={{ color: ACCENT }}>
                {p.title}
              </h3>
              <p className="mt-2 text-xs leading-relaxed opacity-90">{p.desc}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
