'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

type Step = 1 | 2

type HeadcountBand = 'up_to_20' | '20_99' | '100_499' | '500_plus'
type WizardTier = 'Essencial' | 'Operacional' | 'Estruturado' | 'Corporativo'

const HEADCOUNT_OPTIONS: {
  id: HeadcountBand
  label: string
  collaborators: number
  tier: WizardTier
}[] = [
  { id: 'up_to_20', label: 'Até 20 colaboradores', collaborators: 15, tier: 'Essencial' },
  { id: '20_99', label: '20 a 99 colaboradores', collaborators: 60, tier: 'Operacional' },
  { id: '100_499', label: '100 a 499 colaboradores', collaborators: 250, tier: 'Estruturado' },
  { id: '500_plus', label: '500 ou mais colaboradores', collaborators: 500, tier: 'Corporativo' },
]

const TIER_OFFERS: Record<
  WizardTier,
  {
    planId: string
    price: string
    period: string
    modality: string
    includes: string[]
  }
> = {
  Essencial: {
    planId: 'nr01_essencial',
    price: 'R$ 2.800',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo de avaliação',
    includes: [
      'Coleta anônima NR-01 (fatores psicossociais)',
      'Laudo técnico em PDF',
      'Plano de ação PDCA base',
      'Dashboard do consultor',
    ],
  },
  Operacional: {
    planId: 'nr01_operacional',
    price: 'R$ 5.500',
    period: 'pagamento único',
    modality: 'Projeto fechado · 1 ciclo de avaliação',
    includes: [
      'Tudo do Essencial',
      'Pacote de evidências com hashes SHA-256',
      'Audit log imutável para fiscalização',
      'Suporte na implantação',
    ],
  },
  Estruturado: {
    planId: 'nr01_estruturado',
    price: 'R$ 19.600',
    period: 'por ano',
    modality: 'Assinatura anual · 2 ciclos de avaliação',
    includes: [
      'Tudo do Operacional',
      'Monitoramento contínuo (pulsos)',
      'Relatórios periódicos para SST',
      'k-anonymity configurável por avaliação',
    ],
  },
  Corporativo: {
    planId: 'nr01_corporativo',
    price: 'R$ 60.000',
    period: 'por ano',
    modality: 'Assinatura anual · 4 ciclos de avaliação',
    includes: [
      'Tudo do Estruturado',
      'Volume elevado e multi-equipe',
      'Prioridade na fila de implantação',
      'Evidências prontas para auditoria',
    ],
  },
}

const STEP_ANIMATION =
  'mt-8 motion-safe:animate-[wizardFade_0.35s_ease-out] motion-reduce:transition-none'

function tierFromBand(band: HeadcountBand): WizardTier {
  return HEADCOUNT_OPTIONS.find((o) => o.id === band)!.tier
}

function buildUtmContent(band: HeadcountBand, tier: WizardTier): string {
  return JSON.stringify({ wizard_band: band, wizard_tier: tier })
}

function readUtmsFromUrl(): {
  utm_source?: string
  utm_medium?: string
  utm_campaign?: string
} {
  if (typeof window === 'undefined') return {}
  const p = new URLSearchParams(window.location.search)
  const pick = (k: string) => p.get(k)?.trim() || undefined
  return {
    utm_source: pick('utm_source'),
    utm_medium: pick('utm_medium'),
    utm_campaign: pick('utm_campaign'),
  }
}

export function QualificationWizard() {
  const [step, setStep] = useState<Step>(1)
  const [transitionKey, setTransitionKey] = useState(0)
  const [headcount, setHeadcount] = useState<HeadcountBand | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [consent, setConsent] = useState(false)
  const [acceptedOffer, setAcceptedOffer] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [utms, setUtms] = useState<ReturnType<typeof readUtmsFromUrl>>({})

  useEffect(() => {
    setUtms(readUtmsFromUrl())
  }, [])

  const tier = useMemo(() => (headcount ? tierFromBand(headcount) : null), [headcount])
  const offer = tier ? TIER_OFFERS[tier] : null
  const collaboratorsCount = useMemo(
    () => HEADCOUNT_OPTIONS.find((o) => o.id === headcount)?.collaborators ?? null,
    [headcount],
  )

  const goTo = useCallback((next: Step) => {
    setTransitionKey((k) => k + 1)
    setStep(next)
    setError(null)
  }, [])

  async function submitAndCheckout(e: FormEvent) {
    e.preventDefault()
    if (!headcount || !tier || !offer || !collaboratorsCount) return
    setError(null)
    if (!acceptedOffer) {
      setError('Confirme que leu e aceita a oferta publicada antes de continuar.')
      return
    }
    if (!consent) {
      setError('É necessário aceitar o tratamento de dados para continuar.')
      return
    }

    setLoading(true)
    const checkoutUrl = `/checkout/nr01?plan=${encodeURIComponent(offer.planId)}`

    try {
      const res = await fetch('/api/lp/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          collaborators_count: collaboratorsCount,
          consent_lgpd: true,
          source: 'lp_wizard',
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          utm_content: buildUtmContent(headcount, tier),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Não foi possível validar os dados.')
      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao continuar.')
      setLoading(false)
    }
  }

  return (
    <section
      id="captura-diagnostico"
      className="scroll-mt-20 px-4 py-16"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      <style>{`
        @keyframes wizardFade {
          from { opacity: 0; transform: translateX(8px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>

      <div className="mx-auto max-w-xl">
        <h2 className="text-2xl font-bold sm:text-3xl">Contratar adequação NR-01</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          Preços públicos e escopo fixo por porte. Sem proposta manual: você vê o plano, aceita a oferta e segue
          para pagamento seguro (login + checkout).
        </p>

        {step <= 2 ? (
          <p className="mt-6 text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
            Passo {step} de 2
          </p>
        ) : null}

        <div key={transitionKey} className={STEP_ANIMATION}>
          {step === 1 ? (
            <div>
              <h3 className="mt-6 text-lg font-semibold">1. Qual o porte da sua empresa?</h3>
              <p className="mt-1 text-sm opacity-80">
                O plano e o preço são definidos automaticamente — sem análise comercial prévia.
              </p>
              <ul className="mt-5 space-y-3" role="listbox" aria-label="Porte da empresa">
                {HEADCOUNT_OPTIONS.map((opt) => {
                  const meta = TIER_OFFERS[opt.tier]
                  const active = headcount === opt.id
                  return (
                    <li key={opt.id}>
                      <button
                        type="button"
                        role="option"
                        aria-selected={active}
                        onClick={() => {
                          setHeadcount(opt.id)
                          goTo(2)
                        }}
                        className="flex w-full flex-col rounded-xl border px-4 py-4 text-left transition"
                        style={{
                          borderColor: active ? ACCENT : 'rgba(255,255,255,0.15)',
                          backgroundColor: active ? 'rgba(184,148,90,0.12)' : 'rgba(255,255,255,0.05)',
                        }}
                      >
                        <span className="text-sm font-semibold sm:text-base">{opt.label}</span>
                        <span className="mt-1 text-sm" style={{ color: ACCENT }}>
                          {opt.tier} · {meta.price} · {meta.period}
                        </span>
                      </button>
                    </li>
                  )
                })}
              </ul>
            </div>
          ) : null}

          {step === 2 && tier && offer && headcount ? (
            <div className="space-y-6">
              <button
                type="button"
                onClick={() => goTo(1)}
                className="text-sm font-medium underline underline-offset-2 opacity-80"
                style={{ color: ACCENT }}
              >
                ← Alterar porte
              </button>

              <OfferCard tier={tier} offer={offer} />

              <GuaranteeBlock />

              <form onSubmit={(e) => void submitAndCheckout(e)} className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5">
                <h3 className="text-lg font-semibold">2. Aceitar oferta e validar contacto</h3>
                <p className="text-sm opacity-85">
                  Só pedimos o essencial para emitir a cobrança e associar a sua empresa ao plano{' '}
                  <strong>{tier}</strong>. No checkout pedimos CPF/CNPJ para o pagamento.
                </p>

                <label className="flex items-start gap-3 rounded-lg border border-white/10 bg-white/5 p-3 text-sm">
                  <input
                    type="checkbox"
                    checked={acceptedOffer}
                    onChange={(e) => setAcceptedOffer(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                    style={{ accentColor: ACCENT }}
                  />
                  <span>
                    Li e aceito a oferta do plano <strong>{tier}</strong> ({offer.price} · {offer.period}) com o
                    escopo listado acima, nos{' '}
                    <a href="/termos" className="underline" style={{ color: ACCENT }}>
                      termos de uso
                    </a>
                    .
                  </span>
                </label>

                <div>
                  <label className="block text-sm font-medium" htmlFor="wiz-email">
                    Email corporativo *
                  </label>
                  <input
                    id="wiz-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium" htmlFor="wiz-company">
                    Empresa *
                  </label>
                  <input
                    id="wiz-company"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white"
                    autoComplete="organization"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium" htmlFor="wiz-name">
                    Nome do responsável *
                  </label>
                  <input
                    id="wiz-name"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white"
                    autoComplete="name"
                  />
                </div>

                <label className="flex items-start gap-3 text-sm">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    className="mt-1 h-4 w-4 shrink-0"
                    style={{ accentColor: ACCENT }}
                  />
                  <span>
                    Aceito o tratamento dos dados para contratação e contacto operacional, conforme a{' '}
                    <a href="/privacidade" className="underline" style={{ color: ACCENT }}>
                      política de privacidade
                    </a>
                    . *
                  </span>
                </label>

                {error ? (
                  <p className="text-sm" style={{ color: ALERT }}>
                    {error}
                  </p>
                ) : null}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full min-h-[52px] rounded-lg font-semibold transition disabled:opacity-60"
                  style={{ backgroundColor: ACCENT, color: BG }}
                >
                  {loading ? 'A redirecionar…' : `Continuar para pagamento — ${offer.price}`}
                </button>

                <p className="text-center text-xs opacity-70">
                  Próximo passo: login (se necessário) e checkout seguro com valor{' '}
                  <strong>{offer.price}</strong> ({offer.period}).
                </p>
              </form>

              <p className="text-center text-xs opacity-60">
                Não é o momento?{' '}
                <a href="/lp/nr01/calculadora" className="underline" style={{ color: ACCENT }}>
                  Simular outro cenário na calculadora
                </a>{' '}
                — sem compromisso.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    </section>
  )
}

function OfferCard({
  tier,
  offer,
}: {
  tier: WizardTier
  offer: (typeof TIER_OFFERS)[WizardTier]
}) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{ borderColor: ACCENT, backgroundColor: 'rgba(184,148,90,0.08)' }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
        Oferta publicada · plano {tier}
      </p>
      <p className="mt-3">
        <span className="text-3xl font-bold" style={{ color: ACCENT }}>
          {offer.price}
        </span>
        <span className="ml-2 text-sm opacity-85">{offer.period}</span>
      </p>
      <p className="mt-2 text-sm opacity-90">{offer.modality}</p>
      <ul className="mt-4 space-y-2 text-sm opacity-95">
        {offer.includes.map((item) => (
          <li key={item} className="flex gap-2">
            <span style={{ color: ACCENT }} aria-hidden>
              ✓
            </span>
            <span>{item}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function GuaranteeBlock() {
  return (
    <div
      className="rounded-xl border border-white/10 bg-white/5 p-4 text-sm leading-relaxed opacity-95"
      role="note"
    >
      <p className="font-semibold" style={{ color: ACCENT }}>
        Transparência e garantia do serviço
      </p>
      <ul className="mt-2 list-inside list-disc space-y-1 opacity-90">
        <li>Preço e escopo visíveis antes do pagamento — sem taxas ocultas nesta etapa.</li>
        <li>Plataforma Quantum5G: coleta anônima, laudo, plano PDCA e trilha de evidências conforme NR-01.</li>
        <li>Material informativo; não substitui assessoria jurídica ou médica do trabalho da sua empresa.</li>
        <li>Após o pagamento confirmado, acesso ao módulo NR-01 conforme o plano contratado.</li>
      </ul>
    </div>
  )
}
