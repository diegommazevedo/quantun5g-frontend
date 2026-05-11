'use client'

import { useState } from 'react'
import { LP_FAQ_ITEMS } from '@/constants/lp-nr01'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export function FAQ() {
  const [open, setOpen] = useState<number | null>(0)

  return (
    <section className="px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-3xl">
        <h2 className="text-center text-2xl font-bold sm:text-3xl">Perguntas frequentes</h2>
        <ul className="mt-10 space-y-2">
          {LP_FAQ_ITEMS.map((item, i) => {
            const isOpen = open === i
            return (
              <li key={item.q} className="rounded-xl border border-white/10" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
                <button
                  type="button"
                  className="flex w-full items-center justify-between gap-4 px-4 py-4 text-left text-sm font-semibold sm:text-base"
                  aria-expanded={isOpen}
                  onClick={() => setOpen(isOpen ? null : i)}
                >
                  <span>{item.q}</span>
                  <span className="shrink-0 text-lg" style={{ color: ACCENT }} aria-hidden>
                    {isOpen ? '−' : '+'}
                  </span>
                </button>
                {isOpen ? (
                  <div className="border-t border-white/10 px-4 pb-4 text-sm leading-relaxed opacity-90">{item.a}</div>
                ) : null}
              </li>
            )
          })}
        </ul>
      </div>
    </section>
  )
}
