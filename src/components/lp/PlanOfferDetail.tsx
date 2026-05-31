'use client'

import {
  NR01_PLATFORM_NOTICE,
  NR01_RT_LAUDO_NOTICE,
  type Nr01Offer,
} from '@/constants/lp-nr01-offers'

const ACCENT = '#B8945A'

export function PlanOfferDetail({
  offer,
  collaborators,
  compact = false,
}: {
  offer: Nr01Offer
  collaborators?: number | null
  compact?: boolean
}) {
  return (
    <article
      className={`rounded-2xl border-2 ${compact ? 'p-5' : 'p-6 sm:p-8'}`}
      style={{
        borderColor: ACCENT,
        backgroundColor: 'rgba(184,148,90,0.1)',
      }}
    >
      <div
        className="rounded-xl px-4 py-3 text-center"
        style={{ backgroundColor: 'rgba(11,26,47,0.85)', border: `1px solid ${ACCENT}` }}
      >
        <p className="text-xs font-semibold uppercase tracking-widest opacity-80">
          Faixa de colaboradores (critério do plano)
        </p>
        <p className="mt-1 text-lg font-bold sm:text-xl" style={{ color: ACCENT }}>
          {offer.audienceRange}
        </p>
        {collaborators != null ? (
          <p className="mt-1 text-xs opacity-75">
            A sua estimativa na calculadora: <strong>{collaborators}</strong> colaboradores
          </p>
        ) : null}
      </div>

      <header className="mt-6">
        <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: ACCENT }}>
          Plano {offer.tier}
        </p>
        <h3 className="mt-2 text-2xl font-bold sm:text-3xl">{offer.headline}</h3>
        <p className="mt-4">
          <span className="text-3xl font-bold sm:text-4xl" style={{ color: ACCENT }}>
            {offer.price}
          </span>
          <span className="ml-2 text-sm opacity-85">{offer.period}</span>
        </p>
        <p className="mt-2 text-sm font-medium opacity-90">{offer.modality}</p>
      </header>

      <p className="mt-5 text-sm leading-relaxed opacity-95 sm:text-base">{offer.summary}</p>

      <p className="mt-4 text-sm italic opacity-85">
        <strong className="not-italic opacity-100">Perfil indicado:</strong> {offer.idealFor}
      </p>

      <div className="mt-6">
        <h4 className="text-sm font-semibold uppercase tracking-wide" style={{ color: ACCENT }}>
          O que está incluído na licença
        </h4>
        <ul className="mt-3 space-y-2.5 text-sm leading-relaxed opacity-95">
          {offer.deliverables.map((item) => (
            <li key={item} className="flex gap-2.5">
              <span className="mt-0.5 shrink-0 font-bold" style={{ color: ACCENT }} aria-hidden>
                ✓
              </span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </div>

      <NoticeBox title="Responsável técnico do laudo" className="mt-6">
        {NR01_RT_LAUDO_NOTICE}
      </NoticeBox>

      {!compact ? (
        <NoticeBox title="Natureza do serviço" className="mt-4">
          {NR01_PLATFORM_NOTICE}
        </NoticeBox>
      ) : null}
    </article>
  )
}

function NoticeBox({
  title,
  children,
  className = '',
}: {
  title: string
  children: string
  className?: string
}) {
  return (
    <div
      className={`rounded-lg border border-white/15 bg-white/5 p-4 text-sm leading-relaxed opacity-95 ${className}`}
    >
      <p className="font-semibold" style={{ color: ACCENT }}>
        {title}
      </p>
      <p className="mt-2">{children}</p>
    </div>
  )
}
