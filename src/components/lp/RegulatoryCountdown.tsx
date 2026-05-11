'use client'

import { useEffect, useMemo, useState } from 'react'
import { LP_NR01_TARGET_DATE } from '@/constants/lp-nr01'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'
const ALERT = '#B8423E'

function pad(n: number) {
  return n.toString().padStart(2, '0')
}

export function RegulatoryCountdown() {
  const target = useMemo(() => LP_NR01_TARGET_DATE.getTime(), [])
  const [now, setNow] = useState(() => Date.now())

  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  const diff = Math.max(0, target - now)
  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24)
  const minutes = Math.floor((diff / (1000 * 60)) % 60)
  const seconds = Math.floor((diff / 1000) % 60)
  const passed = diff === 0

  return (
    <section className="border-y border-white/10 px-4 py-12" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-4xl text-center">
        <h2 className="text-xl font-bold sm:text-2xl">Contagem para o marco regulatório</h2>
        <p className="mt-2 text-sm opacity-90">26 de maio de 2026 — janela de conformidade punitiva (MTE)</p>
        <div
          className="mx-auto mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4"
          role="timer"
          aria-live="polite"
          aria-atomic="true"
        >
          {[
            { label: 'Dias', value: pad(days) },
            { label: 'Horas', value: pad(hours) },
            { label: 'Min', value: pad(minutes) },
            { label: 'Seg', value: pad(seconds) },
          ].map((u) => (
            <div
              key={u.label}
              className="rounded-xl border border-white/10 px-3 py-4"
              style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}
            >
              <div className="text-3xl font-bold tabular-nums sm:text-4xl" style={{ color: passed ? ALERT : ACCENT }}>
                {u.value}
              </div>
              <div className="mt-1 text-xs uppercase tracking-wide opacity-80">{u.label}</div>
            </div>
          ))}
        </div>
        {passed ? (
          <p className="mt-6 text-sm font-medium" style={{ color: ALERT }}>
            Prazo decorrido — priorize conformidade e evidências agora.
          </p>
        ) : null}
      </div>
    </section>
  )
}
