'use client'

import { useRouter } from 'next/navigation'
import { useState } from 'react'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

export function LeadCaptureForm() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [company, setCompany] = useState('')
  const [phone, setPhone] = useState('')
  const [collaborators, setCollaborators] = useState('100')
  const [message, setMessage] = useState('')
  const [consent, setConsent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (!consent) {
      setError('É necessário aceitar o tratamento de dados para continuar.')
      return
    }
    setLoading(true)
    try {
      const res = await fetch('/api/lp/lead', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.trim(),
          company: company.trim(),
          phone: phone.trim(),
          collaborators: collaborators.trim(),
          message: message.trim(),
          source: 'lp_nr01',
        }),
      })
      const data = (await res.json()) as { error?: string }
      if (!res.ok) throw new Error(data.error || 'Não foi possível enviar.')
      const q = encodeURIComponent(email.trim())
      router.push(`/lp/nr01/obrigado?e=${q}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section id="captura-diagnostico" className="scroll-mt-20 px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-lg">
        <h2 className="text-2xl font-bold">Pedir diagnóstico NR-01</h2>
        <p className="mt-2 text-sm opacity-90">
          A equipa comercial retorna em até 1 dia útil. Os dados são usados só para contacto comercial, conforme a
          política de privacidade.
        </p>
        <form onSubmit={onSubmit} className="mt-8 space-y-4">
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-name">
              Nome completo *
            </label>
            <input
              id="lp-name"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
              autoComplete="name"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-email">
              E-mail corporativo *
            </label>
            <input
              id="lp-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
              autoComplete="email"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-company">
              Empresa *
            </label>
            <input
              id="lp-company"
              required
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
              autoComplete="organization"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-phone">
              Telefone / WhatsApp
            </label>
            <input
              id="lp-phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
              autoComplete="tel"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-collab">
              Colaboradores (ordem de grandeza) *
            </label>
            <input
              id="lp-collab"
              required
              value={collaborators}
              onChange={(e) => setCollaborators(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
            />
          </div>
          <div>
            <label className="block text-sm font-medium" htmlFor="lp-msg">
              Mensagem (opcional)
            </label>
            <textarea
              id="lp-msg"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="mt-1 w-full rounded-lg border border-white/20 bg-white/5 px-3 py-2 text-white placeholder:text-white/40"
            />
          </div>
          <label className="flex items-start gap-3 text-sm">
            <input
              type="checkbox"
              checked={consent}
              onChange={(e) => setConsent(e.target.checked)}
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
            className="w-full min-h-[48px] rounded-lg font-semibold transition disabled:opacity-60"
            style={{ backgroundColor: ACCENT, color: BG }}
          >
            {loading ? 'A enviar…' : 'Enviar pedido'}
          </button>
        </form>
      </div>
    </section>
  )
}
