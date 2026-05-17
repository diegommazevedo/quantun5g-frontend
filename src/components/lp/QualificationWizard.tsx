'use client'

import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

type Step = 1 | 2 | 3 | 4 | 'result'

type HeadcountBand = 'up_to_20' | '20_99' | '100_499' | '500_plus'
type BudgetExpectation =
  | 'up_to_3000'
  | '3000_6000'
  | '6000_25000'
  | 'above_25000'
  | 'prefer_proposal'

type WizardTier = 'Essencial' | 'Operacional' | 'Estruturado' | 'Corporativo'

type ResultMode = 'low_ticket' | 'high_ticket' | 'incompatible'

const HEADCOUNT_OPTIONS: { id: HeadcountBand; label: string; collaborators: number }[] = [
  { id: 'up_to_20', label: 'Até 20 colaboradores', collaborators: 15 },
  { id: '20_99', label: '20 a 99 colaboradores', collaborators: 60 },
  { id: '100_499', label: '100 a 499 colaboradores', collaborators: 250 },
  { id: '500_plus', label: '500 ou mais colaboradores', collaborators: 500 },
]

const URGENCY_OPTIONS: { id: string; label: string }[] = [
  { id: 'not_started', label: 'Ainda não começámos — precisamos agir antes de 26/05' },
  { id: 'started_incomplete', label: 'Já temos algo iniciado mas não está completo' },
  { id: 'understand_needs', label: 'Queremos entender o que precisamos fazer' },
  { id: 'evaluating_vendors', label: 'Estamos a avaliar fornecedores' },
]

const BUDGET_OPTIONS: { id: BudgetExpectation; label: string }[] = [
  { id: 'up_to_3000', label: 'Até R$ 3.000' },
  { id: '3000_6000', label: 'Entre R$ 3.000 e R$ 6.000' },
  { id: '6000_25000', label: 'Entre R$ 6.000 e R$ 25.000' },
  { id: 'above_25000', label: 'Acima de R$ 25.000' },
  { id: 'prefer_proposal', label: 'Prefiro receber uma proposta antes de decidir' },
]

const TIER_META: Record<WizardTier, { price: string; period: string; priceValue: number }> = {
  Essencial: { price: 'R$ 2.800', period: 'pagamento único', priceValue: 2800 },
  Operacional: { price: 'R$ 5.500', period: 'pagamento único', priceValue: 5500 },
  Estruturado: { price: 'R$ 19.600', period: '/ano', priceValue: 19600 },
  Corporativo: { price: 'R$ 60.000', period: '/ano', priceValue: 60000 },
}

const JOVANE_MAILTO =
  'mailto:contato@quantum5g.com.br?subject=NR-01%20%E2%80%94%20proposta%20personalizada'

const STEP_ANIMATION =
  'mt-8 motion-safe:animate-[wizardFade_0.35s_ease-out] motion-reduce:transition-none'

function tierFromBand(band: HeadcountBand): WizardTier {
  switch (band) {
    case 'up_to_20':
      return 'Essencial'
    case '20_99':
      return 'Operacional'
    case '100_499':
      return 'Estruturado'
    case '500_plus':
      return 'Corporativo'
  }
}

function budgetCeiling(budget: BudgetExpectation): number {
  switch (budget) {
    case 'up_to_3000':
      return 3000
    case '3000_6000':
      return 6000
    case '6000_25000':
      return 25000
    case 'above_25000':
      return Infinity
    case 'prefer_proposal':
      return 0
  }
}

function resolveResultMode(
  band: HeadcountBand,
  tier: WizardTier,
  budget: BudgetExpectation,
): ResultMode {
  if (band === '500_plus' && budget === 'up_to_3000') return 'incompatible'
  if (budget === 'prefer_proposal' || tier === 'Estruturado' || tier === 'Corporativo') {
    return 'high_ticket'
  }
  const ceiling = budgetCeiling(budget)
  if (TIER_META[tier].priceValue <= ceiling) return 'low_ticket'
  return 'high_ticket'
}

function buildUtmContent(urgency: string, budget: BudgetExpectation): string {
  return JSON.stringify({
    wizard_urgency: urgency,
    wizard_budget_expectation: budget,
  })
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
  const [urgency, setUrgency] = useState<string | null>(null)
  const [budget, setBudget] = useState<BudgetExpectation | null>(null)

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const [utms, setUtms] = useState<ReturnType<typeof readUtmsFromUrl>>({})

  useEffect(() => {
    setUtms(readUtmsFromUrl())
  }, [])

  const tier = useMemo(() => (headcount ? tierFromBand(headcount) : null), [headcount])

  const resultMode = useMemo(() => {
    if (!headcount || !budget || !tier) return null
    return resolveResultMode(headcount, tier, budget)
  }, [headcount, budget, tier])

  const collaboratorsCount = useMemo(
    () => HEADCOUNT_OPTIONS.find((o) => o.id === headcount)?.collaborators ?? null,
    [headcount],
  )

  const goTo = useCallback((next: Step) => {
    setTransitionKey((k) => k + 1)
    setStep(next)
    setError(null)
  }, [])

  const goBack = useCallback(() => {
    if (step === 2) goTo(1)
    else if (step === 3) goTo(2)
    else if (step === 4) goTo(3)
  }, [step, goTo])

  async function submitLead() {
    if (!headcount || !urgency || !budget || !collaboratorsCount) return
    setError(null)
    if (!consent) {
      setError('É necessário aceitar o tratamento de dados para continuar.')
      return
    }
    setLoading(true)
    try {
      const utm_content = buildUtmContent(urgency, budget)
      const res = await fetch('/api/lp/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim() || undefined,
          collaborators_count: collaboratorsCount,
          consent_lgpd: true,
          source: 'lp_wizard',
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          utm_content,
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar.')
      setSubmitted(true)
      goTo('result')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao enviar.')
    } finally {
      setLoading(false)
    }
  }

  const progressLabel = step === 'result' ? null : `Etapa ${step} de 4`

  return (
    <section
      id="captura-diagnostico"
      className="scroll-mt-20 px-4 py-16"
      style={{ backgroundColor: BG, color: TEXT }}
    >
      <style>{`
        @keyframes wizardFade {
          from { opacity: 0; transform: translateX(12px); }
          to { opacity: 1; transform: translateX(0); }
        }
      `}</style>
      <div className="mx-auto max-w-lg">
        <h2 className="text-2xl font-bold sm:text-3xl">Descubra o plano NR-01 ideal</h2>
        <p className="mt-2 text-sm opacity-90">
          Responda em menos de 2 minutos. No final, mostramos o tier recomendado e o próximo passo.
        </p>

        {progressLabel ? (
          <div className="mt-8">
            <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
              {progressLabel}
            </p>
            <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full transition-all duration-300 ease-out"
                style={{
                  backgroundColor: ACCENT,
                  width: `${(Number(step) / 4) * 100}%`,
                }}
              />
            </div>
          </div>
        ) : null}

        <div key={transitionKey} className={STEP_ANIMATION}>
          {step === 1 ? (
            <StepOptions
              question="Quantos colaboradores tem a sua empresa?"
              options={HEADCOUNT_OPTIONS.map((o) => ({ id: o.id, label: o.label }))}
              selected={headcount}
              onSelect={(id) => {
                setHeadcount(id as HeadcountBand)
                goTo(2)
              }}
            />
          ) : null}

          {step === 2 ? (
            <>
              <StepOptions
                question="Qual é a situação da sua empresa em relação à NR-01?"
                options={URGENCY_OPTIONS}
                selected={urgency}
                onSelect={(id) => {
                  setUrgency(id)
                  goTo(3)
                }}
              />
              <BackButton onClick={goBack} />
            </>
          ) : null}

          {step === 3 ? (
            <>
              <StepOptions
                question="Qual é a sua expectativa de investimento para esta adequação?"
                options={BUDGET_OPTIONS}
                selected={budget}
                onSelect={(id) => {
                  setBudget(id as BudgetExpectation)
                  goTo(4)
                }}
              />
              <BackButton onClick={goBack} />
            </>
          ) : null}

          {step === 4 ? (
            <>
              <ContactStep
                name={name}
                email={email}
                company={company}
                phone={phone}
                consent={consent}
                loading={loading}
                error={error}
                onNameChange={setName}
                onEmailChange={setEmail}
                onCompanyChange={setCompany}
                onPhoneChange={setPhone}
                onConsentChange={setConsent}
                onSubmit={(e) => {
                  e.preventDefault()
                  void submitLead()
                }}
              />
              <BackButton onClick={goBack} />
            </>
          ) : null}

          {step === 'result' && tier && resultMode ? (
            <ResultScreen tier={tier} mode={resultMode} submitted={submitted} />
          ) : null}
        </div>
      </div>
    </section>
  )
}

function StepOptions({
  question,
  options,
  selected,
  onSelect,
}: {
  question: string
  options: { id: string; label: string }[]
  selected: string | null
  onSelect: (id: string) => void
}) {
  return (
    <div>
      <h3 className="text-lg font-semibold leading-snug">{question}</h3>
      <ul className="mt-6 space-y-3" role="listbox" aria-label={question}>
        {options.map((opt) => {
          const active = selected === opt.id
          return (
            <li key={opt.id}>
              <button
                type="button"
                role="option"
                aria-selected={active}
                onClick={() => onSelect(opt.id)}
                className="flex min-h-[52px] w-full items-center rounded-xl border px-4 py-3 text-left text-sm font-medium transition sm:text-base"
                style={{
                  borderColor: active ? ACCENT : 'rgba(255,255,255,0.15)',
                  backgroundColor: active ? 'rgba(184,148,90,0.15)' : 'rgba(255,255,255,0.05)',
                  color: TEXT,
                }}
              >
                {opt.label}
              </button>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

function ContactStep({
  name,
  email,
  company,
  phone,
  consent,
  loading,
  error,
  onNameChange,
  onEmailChange,
  onCompanyChange,
  onPhoneChange,
  onConsentChange,
  onSubmit,
}: {
  name: string
  email: string
  company: string
  phone: string
  consent: boolean
  loading: boolean
  error: string | null
  onNameChange: (v: string) => void
  onEmailChange: (v: string) => void
  onCompanyChange: (v: string) => void
  onPhoneChange: (v: string) => void
  onConsentChange: (v: boolean) => void
  onSubmit: (e: FormEvent) => void
}) {
  const inputClass =
    'mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/40'

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="text-lg font-semibold">Os seus dados de contacto</h3>
      <p className="text-sm opacity-80">Última etapa — enviamos o resultado na hora.</p>
      <div>
        <label className="block text-sm font-medium" htmlFor="wiz-name">
          Nome completo *
        </label>
        <input
          id="wiz-name"
          required
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          className={inputClass}
          autoComplete="name"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="wiz-email">
          Email corporativo *
        </label>
        <input
          id="wiz-email"
          type="email"
          required
          value={email}
          onChange={(e) => onEmailChange(e.target.value)}
          className={inputClass}
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
          onChange={(e) => onCompanyChange(e.target.value)}
          className={inputClass}
          autoComplete="organization"
        />
      </div>
      <div>
        <label className="block text-sm font-medium" htmlFor="wiz-phone">
          Telefone / WhatsApp
        </label>
        <input
          id="wiz-phone"
          value={phone}
          onChange={(e) => onPhoneChange(e.target.value)}
          className={inputClass}
          autoComplete="tel"
        />
      </div>
      <label className="flex items-start gap-3 text-sm">
        <input
          type="checkbox"
          checked={consent}
          onChange={(e) => onConsentChange(e.target.checked)}
          className="mt-1 h-4 w-4 shrink-0 rounded border-white/30"
          style={{ accentColor: ACCENT }}
        />
        <span>
          Aceito o tratamento dos meus dados para contacto comercial, nos termos da{' '}
          <a href="/privacidade" className="underline underline-offset-2" style={{ color: ACCENT }}>
            política de privacidade
          </a>{' '}
          e dos{' '}
          <a href="/termos" className="underline underline-offset-2" style={{ color: ACCENT }}>
            termos de uso
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
        {loading ? 'A analisar…' : 'Ver o meu plano recomendado'}
      </button>
    </form>
  )
}

function ResultScreen({
  tier,
  mode,
  submitted,
}: {
  tier: WizardTier
  mode: ResultMode
  submitted: boolean
}) {
  const meta = TIER_META[tier]

  if (mode === 'incompatible') {
    return (
      <div className="space-y-6">
        <h3 className="text-xl font-bold">Proposta com escopo ajustado</h3>
        <p className="text-sm leading-relaxed opacity-90">
          Pelo porte da sua operação, o investimento típico está acima da expectativa que indicou. Podemos preparar
          uma proposta com escopo ajustado.
        </p>
        <PrimaryButton href={JOVANE_MAILTO}>Receber proposta personalizada</PrimaryButton>
        {submitted ? <SubmittedNote /> : null}
      </div>
    )
  }

  if (mode === 'high_ticket') {
    return (
      <div className="space-y-6">
        <TierCard tier={tier} price={meta.price} period={meta.period} highlight />
        <p className="text-sm leading-relaxed opacity-90">
          Pelo porte e complexidade da sua operação, preparamos uma proposta detalhada com escopo, cronograma e
          condições específicas para a sua empresa.
        </p>
        <PrimaryButton href={JOVANE_MAILTO}>Quero uma proposta personalizada</PrimaryButton>
        <SecondaryButton href={JOVANE_MAILTO}>Falar com Jovane Borlini</SecondaryButton>
        {submitted ? <SubmittedNote /> : null}
      </div>
    )
  }

  return (
    <div id="checkout" className="scroll-mt-24 space-y-6">
      <TierCard tier={tier} price={meta.price} period={meta.period} highlight />
      <PrimaryButton href="#checkout">Contratar agora</PrimaryButton>
      <SecondaryButton href={JOVANE_MAILTO}>Tenho dúvidas — falar com consultor</SecondaryButton>
      {submitted ? <SubmittedNote /> : null}
    </div>
  )
}

function TierCard({
  tier,
  price,
  period,
  highlight,
}: {
  tier: WizardTier
  price: string
  period: string
  highlight?: boolean
}) {
  return (
    <div
      className="rounded-2xl border p-6"
      style={{
        backgroundColor: highlight ? 'rgba(184,148,90,0.08)' : 'rgba(255,255,255,0.06)',
        borderColor: ACCENT,
        boxShadow: highlight ? `0 0 0 1px ${ACCENT}` : undefined,
      }}
    >
      <p className="text-xs font-semibold uppercase tracking-widest" style={{ color: ACCENT }}>
        Plano recomendado
      </p>
      <h3 className="mt-2 text-2xl font-bold">{tier}</h3>
      <p className="mt-3">
        <span className="text-3xl font-bold" style={{ color: ACCENT }}>
          {price}
        </span>
        <span className="ml-2 text-sm opacity-80">{period}</span>
      </p>
    </div>
  )
}

function PrimaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="flex min-h-[52px] w-full items-center justify-center rounded-lg px-4 text-center text-base font-semibold transition hover:opacity-95"
      style={{ backgroundColor: ACCENT, color: BG }}
    >
      {children}
    </a>
  )
}

function SecondaryButton({ href, children }: { href: string; children: ReactNode }) {
  return (
    <a
      href={href}
      className="flex min-h-[48px] w-full items-center justify-center rounded-lg border-2 px-4 text-center text-sm font-semibold transition hover:bg-white/5"
      style={{ borderColor: ACCENT, color: TEXT }}
    >
      {children}
    </a>
  )
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="mt-6 text-sm font-medium underline underline-offset-2 opacity-80 hover:opacity-100"
      style={{ color: ACCENT }}
    >
      ← Voltar
    </button>
  )
}

function SubmittedNote() {
  return (
    <p className="rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-xs opacity-80">
      Pedido registado. A equipa comercial pode contactá-lo com base nos dados enviados.
    </p>
  )
}
