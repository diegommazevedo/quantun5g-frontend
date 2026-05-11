import Link from 'next/link'
import { LP_PRICING_TIERS } from '@/constants/lp-nr01'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

export function PricingTiers() {
  return (
    <section id="planos" className="scroll-mt-20 px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Planos e formatos</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm opacity-90">
          Valores finais na proposta comercial. Abaixo, o desenho típico de tiers Quantum5G para NR-01.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs" style={{ color: ALERT }}>
          Contratar agora não substitui assessoria jurídica ou médica do trabalho da sua empresa.
        </p>
        <ul className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-4">
          {LP_PRICING_TIERS.map((tier) => (
            <li
              key={tier.id}
              className={`flex flex-col rounded-2xl border p-6 ${
                tier.featured
                  ? 'border-[#B8945A] ring-2 ring-[#B8945A] ring-offset-2 ring-offset-[#0B1A2F]'
                  : 'border-white/10'
              }`}
              style={{
                backgroundColor: tier.featured ? 'rgba(184,148,90,0.12)' : 'rgba(255,255,255,0.04)',
              }}
            >
              {tier.featured ? (
                <span
                  className="mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase"
                  style={{ backgroundColor: ACCENT, color: BG }}
                >
                  Popular
                </span>
              ) : null}
              <h3 className="text-lg font-bold">{tier.name}</h3>
              <p className="mt-1 text-2xl font-bold" style={{ color: ACCENT }}>
                {tier.priceLabel}
              </p>
              <p className="text-xs uppercase tracking-wide opacity-75">{tier.period}</p>
              <p className="mt-3 text-sm leading-relaxed opacity-90">{tier.description}</p>
              <ul className="mt-4 flex-1 space-y-2 text-sm opacity-90">
                {tier.highlights.map((h) => (
                  <li key={h} className="flex gap-2">
                    <span style={{ color: ACCENT }} aria-hidden>
                      ✓
                    </span>
                    <span>{h}</span>
                  </li>
                ))}
              </ul>
              <a
                href="#captura-diagnostico"
                className="mt-6 inline-flex min-h-[44px] w-full items-center justify-center rounded-lg px-4 py-2 text-center text-sm font-semibold transition hover:opacity-95"
                style={{ backgroundColor: ACCENT, color: BG }}
              >
                {tier.ctaLabel}
              </a>
            </li>
          ))}
        </ul>
        <p className="mt-8 text-center text-xs opacity-70">
          Dúvidas sobre escopo?{' '}
          <Link href="/institucional" className="underline underline-offset-2" style={{ color: ACCENT }}>
            Institucional
          </Link>
        </p>
      </div>
    </section>
  )
}
