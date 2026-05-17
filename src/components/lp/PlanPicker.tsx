'use client'

import { NR01_OFFERS, type Nr01WizardTier } from '@/constants/lp-nr01-offers'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

export function PlanPicker({
  recommendedTier,
  collaborators,
  onContract,
}: {
  recommendedTier: Nr01WizardTier | null
  collaborators: number | null
  onContract: (tier: Nr01WizardTier) => void
}) {
  const visibleOffers = recommendedTier
    ? NR01_OFFERS.filter((o) => o.tier === recommendedTier)
    : []

  return (
    <section id="planos" className="scroll-mt-20 px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-3xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
          Passo 2 de 2
        </p>
        <h2 className="mt-2 text-center text-2xl font-bold sm:text-3xl">Selecione o plano para contratar</h2>
        <p className="mx-auto mt-3 max-w-2xl text-center text-sm opacity-90">
          Com base em {collaborators ?? '—'} colaboradores, este é o plano publicado para a sua escala. Preço fixo
          antes do pagamento.
        </p>
        <p className="mx-auto mt-2 max-w-2xl text-center text-xs" style={{ color: ALERT }}>
          Não substitui assessoria jurídica ou médica do trabalho da sua empresa.
        </p>

        {!recommendedTier ? (
          <p className="mt-10 rounded-xl border border-white/10 bg-white/5 p-6 text-center text-sm opacity-80">
            Ajuste a calculadora de escala acima para ver o plano aplicável.
          </p>
        ) : (
          <ul className="mt-10 grid gap-6">
            {visibleOffers.map((offer) => (
              <li
                key={offer.planId}
                className="flex flex-col rounded-2xl border-2 p-6 sm:p-8"
                style={{
                  borderColor: ACCENT,
                  backgroundColor: 'rgba(184,148,90,0.12)',
                  boxShadow: `0 0 0 1px ${ACCENT}`,
                }}
              >
                <span
                  className="mb-2 w-fit rounded-full px-2 py-0.5 text-xs font-semibold uppercase"
                  style={{ backgroundColor: ACCENT, color: BG }}
                >
                  Recomendado para si
                </span>
                <h3 className="text-2xl font-bold">{offer.tier}</h3>
                <p className="mt-2">
                  <span className="text-3xl font-bold" style={{ color: ACCENT }}>
                    {offer.price}
                  </span>
                  <span className="ml-2 text-sm opacity-80">{offer.period}</span>
                </p>
                <p className="mt-2 text-sm opacity-90">{offer.modality}</p>
                <p className="mt-1 text-sm opacity-80">{offer.description}</p>
                <ul className="mt-5 flex-1 space-y-2 text-sm opacity-95">
                  {offer.highlights.map((h) => (
                    <li key={h} className="flex gap-2">
                      <span style={{ color: ACCENT }} aria-hidden>
                        ✓
                      </span>
                      <span>{h}</span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => onContract(offer.tier)}
                  className="mt-8 inline-flex min-h-[52px] w-full items-center justify-center rounded-lg px-4 py-2 text-center text-base font-semibold transition hover:opacity-95"
                  style={{ backgroundColor: ACCENT, color: BG }}
                >
                  Contratar {offer.tier} — {offer.price}
                </button>
              </li>
            ))}
          </ul>
        )}

        {recommendedTier ? (
          <p className="mt-6 text-center text-xs opacity-70">
            Precisa de outro porte?{' '}
            <a href="#calculadora-escala" className="underline underline-offset-2" style={{ color: ACCENT }}>
              Voltar à calculadora
            </a>
          </p>
        ) : null}
      </div>
    </section>
  )
}
