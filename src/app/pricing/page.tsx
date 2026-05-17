/**
 * QUANTUM5G — Página de Pricing
 * Pública — sem autenticação.
 * 4 planos: Solo · Profissional · Empresa · Enterprise
 */

import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Planos e Preços | Quantum5G — Pentagrama de Ginger',
  description: 'Escolha o plano ideal para aplicar o Diagnóstico Pentagrama de Ginger na sua organização. 14 dias gratuitos, sem cartão de crédito.',
}

// ─── Dados dos planos ───────────────────────────────────────────

const PLANOS = [
  {
    id:       'solo',
    nome:     'Solo',
    preco:    'R$ 297',
    periodo:  '/mês',
    subtitulo:'Para consultores autônomos',
    popular:  false,
    dark:     false,
    enterprise: false,
    features: [
      'Até 5 diagnósticos por mês',
      '1 usuário',
      'Relatório PDF completo',
      'Suporte por e-mail',
    ],
    cta: 'Começar grátis',
    href: '/login',
  },
  {
    id:       'profissional',
    nome:     'Profissional',
    preco:    'R$ 597',
    periodo:  '/mês',
    subtitulo:'Para consultores estabelecidos',
    popular:  true,
    dark:     false,
    enterprise: false,
    features: [
      'Diagnósticos ilimitados',
      'Até 3 usuários',
      'Histórico completo de aplicações',
      'Suporte prioritário',
    ],
    cta: 'Começar grátis',
    href: '/login',
  },
  {
    id:       'empresa',
    nome:     'Empresa',
    preco:    'R$ 497',
    periodo:  '/mês',
    subtitulo:'Para PMEs autosserviço',
    popular:  false,
    dark:     false,
    enterprise: false,
    features: [
      'Diagnósticos ilimitados',
      'Até 10 gestores',
      'Painel comparativo entre diagnósticos',
      'Sem necessidade de consultor externo',
    ],
    cta: 'Começar grátis',
    href: '/login',
  },
  {
    id:       'enterprise',
    nome:     'Enterprise',
    preco:    'Sob consulta',
    periodo:  '',
    subtitulo:'Para redes, franquias e grandes empresas',
    popular:  false,
    dark:     true,
    enterprise: true,
    features: [
      'Tudo dos planos anteriores',
      'API de integração',
      'Multi-unidade com comparativo',
      'Onboarding dedicado',
      'SLA garantido',
    ],
    cta: 'Falar com especialista',
    href: 'mailto:contato@quantun5g.com',
  },
]

// ─── Componente principal ───────────────────────────────────────

export default function PricingPage() {
  return (
    <div className="min-h-screen bg-zinc-50 flex flex-col">

      {/* ── Header ────────────────────────────────────────────── */}
      <header className="border-b border-zinc-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 items-center justify-between">
            <Link href="/" className="flex items-center gap-3">
              <span className="text-zinc-900 font-semibold text-base tracking-tight">
                Quantum5G
              </span>
              <span className="hidden sm:inline text-zinc-300">|</span>
              <span className="hidden sm:inline text-zinc-500 text-sm">
                Pentagrama de Ginger
              </span>
            </Link>
            <div className="flex items-center gap-3">
              <Link
                href="/login"
                className="rounded-lg border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 transition-colors"
              >
                Entrar
              </Link>
              <Link
                href="/login"
                className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 transition-colors"
              >
                Começar grátis
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="py-16 sm:py-20 text-center px-4">
        <div className="mx-auto max-w-2xl">
          <span className="inline-flex items-center rounded-full border border-purple-200 bg-purple-50 px-3 py-1 text-xs font-medium text-purple-700 mb-4">
            14 dias grátis · sem cartão de crédito
          </span>
          <h1 className="text-3xl sm:text-4xl font-black text-zinc-900 leading-tight mb-4">
            Escolha o plano certo para o seu contexto
          </h1>
          <p className="text-zinc-500 text-base sm:text-lg leading-relaxed">
            O Pentagrama de Ginger já transformou organizações de todos os tamanhos.
            Comece hoje e veja o diagnóstico em ação.
          </p>
        </div>
      </section>

      {/* ── Cards de planos ───────────────────────────────────── */}
      <section className="pb-20 px-4">
        <div className="mx-auto max-w-7xl">
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 xl:grid-cols-4 items-start">
            {PLANOS.map(plano => (
              <PlanCard key={plano.id} plano={plano} />
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ rápido ────────────────────────────────────────── */}
      <section className="border-t border-zinc-200 bg-white py-16 px-4">
        <div className="mx-auto max-w-3xl">
          <h2 className="text-xl font-bold text-zinc-900 text-center mb-10">
            Perguntas frequentes
          </h2>
          <div className="space-y-6">
            {[
              {
                q: 'O período de teste é realmente gratuito?',
                a: 'Sim. 14 dias completos, com acesso a todos os recursos do plano escolhido. Sem cartão de crédito para começar.',
              },
              {
                q: 'Posso trocar de plano depois?',
                a: 'Sim, a qualquer momento. O ajuste é proporcional ao período restante do ciclo de faturamento.',
              },
              {
                q: 'O que é o Pentagrama de Ginger?',
                a: 'É uma metodologia de diagnóstico organizacional em 5 dimensões (Física, Afetiva, Racional, Social e Cultural), desenvolvida para revelar a saúde real de equipes e organizações.',
              },
              {
                q: 'Preciso de consultor externo para usar?',
                a: 'Depende do plano. O plano Empresa foi desenhado para uso autosserviço. Os planos Solo e Profissional são voltados para consultores que atendem clientes.',
              },
            ].map(item => (
              <div key={item.q} className="border-b border-zinc-100 pb-5">
                <p className="font-semibold text-zinc-800 mb-1.5">{item.q}</p>
                <p className="text-zinc-500 text-sm leading-relaxed">{item.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA final ─────────────────────────────────────────── */}
      <section className="bg-zinc-900 py-16 px-4 text-center">
        <div className="mx-auto max-w-xl">
          <h2 className="text-2xl font-black text-white mb-3">
            Pronto para diagnosticar sua organização?
          </h2>
          <p className="text-zinc-400 text-sm mb-8">
            14 dias grátis. Sem cartão. Cancele quando quiser.
          </p>
          <Link
            href="/login"
            className="inline-flex items-center rounded-xl bg-white px-8 py-3.5 text-base font-bold text-zinc-900 hover:bg-zinc-100 transition-colors"
          >
            Começar gratuitamente →
          </Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="border-t border-zinc-800 bg-zinc-900 py-8 px-4">
        <div className="mx-auto max-w-7xl flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-zinc-500">
          <div className="flex items-center gap-2">
            <span className="font-medium text-zinc-400">Quantum5G</span>
            <span>·</span>
            <span>Pentagrama de Ginger</span>
          </div>
          <p>Metodologia desenvolvida por Jovane Borlini da Silva</p>
          <div className="flex items-center gap-4">
            <Link href="/login" className="hover:text-zinc-300 transition-colors">Entrar</Link>
            <a href="mailto:contato@quantun5g.com" className="hover:text-zinc-300 transition-colors">
              contato@quantun5g.com
            </a>
          </div>
        </div>
      </footer>

    </div>
  )
}

// ─── PlanCard ───────────────────────────────────────────────────

function PlanCard({ plano }: {
  plano: typeof PLANOS[number]
}) {
  const isExternal = plano.href.startsWith('mailto:')

  const containerClass = [
    'relative flex flex-col rounded-2xl border p-7 transition-shadow',
    plano.dark
      ? 'bg-zinc-900 border-zinc-700 text-white'
      : plano.popular
        ? 'bg-white border-purple-300 shadow-lg shadow-purple-100 ring-2 ring-purple-500'
        : 'bg-white border-zinc-200',
  ].join(' ')

  const ctaClass = [
    'mt-auto w-full rounded-xl py-3 text-sm font-bold transition-colors text-center block',
    plano.dark
      ? 'bg-white text-zinc-900 hover:bg-zinc-100'
      : plano.popular
        ? 'bg-purple-700 text-white hover:bg-purple-800'
        : 'bg-zinc-900 text-white hover:bg-zinc-700',
  ].join(' ')

  const checkColor = plano.dark
    ? 'text-zinc-400'
    : plano.popular
      ? 'text-purple-500'
      : 'text-zinc-400'

  return (
    <div className={containerClass}>
      {/* Badge popular */}
      {plano.popular && (
        <div className="absolute -top-3.5 left-0 right-0 flex justify-center">
          <span className="rounded-full bg-purple-700 px-4 py-1 text-xs font-bold text-white shadow">
            ★ Mais popular
          </span>
        </div>
      )}

      {/* Nome e subtítulo */}
      <div className="mb-6 mt-1">
        <h3 className={`text-lg font-black mb-1 ${plano.dark ? 'text-white' : 'text-zinc-900'}`}>
          {plano.nome}
        </h3>
        <p className={`text-xs leading-relaxed ${plano.dark ? 'text-zinc-400' : 'text-zinc-500'}`}>
          {plano.subtitulo}
        </p>
      </div>

      {/* Preço */}
      <div className="mb-7">
        {plano.enterprise ? (
          <p className={`text-2xl font-black ${plano.dark ? 'text-white' : 'text-zinc-900'}`}>
            Sob consulta
          </p>
        ) : (
          <div className="flex items-end gap-1">
            <span className={`text-3xl font-black tabular-nums ${plano.dark ? 'text-white' : 'text-zinc-900'}`}>
              {plano.preco}
            </span>
            <span className={`text-sm mb-1 ${plano.dark ? 'text-zinc-400' : 'text-zinc-400'}`}>
              {plano.periodo}
            </span>
          </div>
        )}
      </div>

      {/* Features */}
      <ul className="space-y-3 mb-8 flex-1">
        {plano.features.map(f => (
          <li key={f} className="flex items-start gap-2.5 text-sm">
            <span className={`mt-0.5 shrink-0 text-base leading-none ${checkColor}`}>✓</span>
            <span className={plano.dark ? 'text-zinc-300' : 'text-zinc-600'}>{f}</span>
          </li>
        ))}
      </ul>

      {/* CTA */}
      {isExternal ? (
        <a href={plano.href} className={ctaClass}>
          {plano.cta}
        </a>
      ) : (
        <Link href={plano.href} className={ctaClass}>
          {plano.cta}
        </Link>
      )}

      {/* Trial note */}
      {!plano.enterprise && (
        <p className={`mt-3 text-center text-xs ${plano.dark ? 'text-zinc-500' : 'text-zinc-400'}`}>
          14 dias grátis · sem cartão
        </p>
      )}
    </div>
  )
}
