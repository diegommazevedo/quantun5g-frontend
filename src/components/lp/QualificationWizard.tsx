'use client'

import { useEffect, useState, type FormEvent } from 'react'
import { getOfferByTier, NR01_RT_LAUDO_NOTICE, type Nr01WizardTier } from '@/constants/lp-nr01-offers'
import { PlanOfferDetail } from '@/components/lp/PlanOfferDetail'
import { buildNr01CheckoutUrl } from '@/lib/billing/checkout-url'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

const CHECKOUT_PREFILL_KEY = 'lp_nr01_checkout_prefill'

function buildUtmContent(tier: Nr01WizardTier, collaborators: number, cnpj: string): string {
  return JSON.stringify({
    wizard_tier: tier,
    collaborators_count: collaborators,
    company_cnpj: cnpj.replace(/\D/g, ''),
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

function normalizeCnpj(value: string): string {
  return value.replace(/\D/g, '')
}

function isValidCnpjDigits(digits: string): boolean {
  return digits.length === 14
}

export function QualificationWizard({
  tier,
  collaborators,
  onChangePlan,
}: {
  tier: Nr01WizardTier | null
  collaborators: number | null
  onChangePlan: () => void
}) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [cnpj, setCnpj] = useState('')
  const [phone, setPhone] = useState('')
  const [consent, setConsent] = useState(false)
  const [acceptedOffer, setAcceptedOffer] = useState(false)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [utms, setUtms] = useState<ReturnType<typeof readUtmsFromUrl>>({})

  useEffect(() => {
    setUtms(readUtmsFromUrl())
  }, [])

  const offer = tier ? getOfferByTier(tier) : null

  async function submitAndCheckout(e: FormEvent) {
    e.preventDefault()
    if (!tier || !offer || collaborators == null) return
    setError(null)

    const cnpjDigits = normalizeCnpj(cnpj)
    if (!isValidCnpjDigits(cnpjDigits)) {
      setError('Informe o CNPJ da empresa (14 dígitos).')
      return
    }
    if (!phone.trim()) {
      setError('Informe o telefone do responsável.')
      return
    }
    if (!acceptedOffer) {
      setError('Confirme que leu e aceita a oferta publicada antes de continuar.')
      return
    }
    if (!consent) {
      setError('É necessário aceitar o tratamento de dados para continuar.')
      return
    }

    setLoading(true)
    const checkoutUrl = buildNr01CheckoutUrl({ tierId: tier })

    try {
      const res = await fetch('/api/lp/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          collaborators_count: collaborators,
          consent_lgpd: true,
          source: 'lp_wizard',
          utm_source: utms.utm_source,
          utm_medium: utms.utm_medium,
          utm_campaign: utms.utm_campaign,
          utm_content: buildUtmContent(tier, collaborators, cnpjDigits),
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Não foi possível validar os dados.')

      try {
        sessionStorage.setItem(
          CHECKOUT_PREFILL_KEY,
          JSON.stringify({
            name: name.trim(),
            email: email.trim(),
            phone: phone.trim(),
            cpfCnpj: cnpjDigits,
            headcountDeclared: collaborators,
            tierId: tier,
          }),
        )
      } catch {
        /* sessionStorage indisponível */
      }

      window.location.href = checkoutUrl
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao continuar.')
      setLoading(false)
    }
  }

  return (
    <section
      id="captura-diagnostico"
      className="scroll-mt-20 px-4 py-12 sm:py-16"
      style={{ backgroundColor: 'transparent', color: TEXT }}
    >
      <div className="mx-auto max-w-xl">
        <p className="text-xs font-medium uppercase tracking-wider" style={{ color: ACCENT }}>
          Confirmação · passo final
        </p>
        <h2 className="mt-2 text-2xl font-bold sm:text-3xl">Aceitar oferta e validar dados</h2>
        <p className="mt-2 text-sm leading-relaxed opacity-90">
          Valide a empresa e o responsável. Em seguida, login (se necessário) e pagamento seguro no checkout.
        </p>

        {!tier || !offer || collaborators == null ? (
          <div className="mt-8 rounded-xl border border-white/10 bg-white/5 p-6 text-sm opacity-90">
            <p>Selecione o plano na secção acima (botão &quot;Contratar&quot;) para continuar.</p>
            <button
              type="button"
              onClick={onChangePlan}
              className="mt-4 text-sm font-medium underline underline-offset-2"
              style={{ color: ACCENT }}
            >
              Ver plano recomendado
            </button>
          </div>
        ) : (
          <div className="mt-8 space-y-6">
            <button
              type="button"
              onClick={onChangePlan}
              className="text-sm font-medium underline underline-offset-2 opacity-80"
              style={{ color: ACCENT }}
            >
              ← Alterar plano / escala
            </button>

            <PlanOfferDetail offer={offer} collaborators={collaborators} compact />
            <GuaranteeBlock />

            <form
              onSubmit={(e) => void submitAndCheckout(e)}
              className="space-y-4 rounded-xl border border-white/10 bg-white/5 p-5"
            >
              <h3 className="text-lg font-semibold">Dados para contratação</h3>
              <p className="text-sm opacity-85">
                Usamos estes dados para a fatura e para associar o plano <strong>{tier}</strong> à sua empresa.
                O mesmo CNPJ será usado no pagamento.
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
                  Li e aceito a oferta do plano <strong>{tier}</strong> ({offer.price} · {offer.period}) para a
                  faixa <strong>{offer.audienceRange}</strong>, com o escopo listado e a obrigação de cadastrar o
                  responsável técnico habilitado para assinatura do laudo, nos{' '}
                  <a href="/termos" className="underline" style={{ color: ACCENT }}>
                    termos de uso
                  </a>
                  .
                </span>
              </label>

              <div>
                <label className="block text-sm font-medium" htmlFor="wiz-company">
                  Razão social / nome da empresa *
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
                <label className="block text-sm font-medium" htmlFor="wiz-cnpj">
                  CNPJ da empresa *
                </label>
                <input
                  id="wiz-cnpj"
                  required
                  inputMode="numeric"
                  value={cnpj}
                  onChange={(e) => setCnpj(e.target.value)}
                  placeholder="00.000.000/0000-00"
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white placeholder:text-white/40"
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

              <div>
                <label className="block text-sm font-medium" htmlFor="wiz-phone">
                  Telefone / WhatsApp do responsável *
                </label>
                <input
                  id="wiz-phone"
                  type="tel"
                  required
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white"
                  autoComplete="tel"
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
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-3 text-base text-white"
                  autoComplete="email"
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
                Checkout seguro · plano <strong>{offer.planId}</strong> · {collaborators} colaboradores na escala
                indicada.
              </p>
            </form>
          </div>
        )}
      </div>
    </section>
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
        <li>{NR01_RT_LAUDO_NOTICE}</li>
        <li>Material informativo; não substitui assessoria jurídica ou médica do trabalho da sua empresa.</li>
        <li>Após o pagamento confirmado, acesso ao módulo NR-01 conforme o plano contratado.</li>
      </ul>
    </div>
  )
}
