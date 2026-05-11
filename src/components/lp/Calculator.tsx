'use client'

import { useState } from 'react'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

type TierResult = { tier: string; summary: string; range: string }

export function Calculator() {
  const [collaborators, setCollaborators] = useState(50)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<TierResult | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function run() {
    setLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/lp/calculator', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ collaborators }),
      })
      const data = (await res.json()) as TierResult & { error?: string }
      if (!res.ok) throw new Error(data.error || 'Erro ao calcular')
      setResult({ tier: data.tier, summary: data.summary, range: data.range })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Erro')
      setResult(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="px-4 py-16" style={{ backgroundColor: BG, color: TEXT }}>
      <div className="mx-auto max-w-xl rounded-2xl border border-white/10 p-6 sm:p-8" style={{ backgroundColor: 'rgba(255,255,255,0.04)' }}>
        <h2 className="text-xl font-bold sm:text-2xl">Calculadora de escala</h2>
        <p className="mt-2 text-sm opacity-90">
          Indicativo comercial — número de colaboradores na população-alvo da avaliação.
        </p>
        <label className="mt-6 block text-sm font-medium" htmlFor="collab-range">
          Colaboradores (estimativa)
        </label>
        <input
          id="collab-range"
          type="range"
          min={10}
          max={5000}
          step={10}
          value={collaborators}
          onChange={(e) => setCollaborators(Number(e.target.value))}
          className="mt-2 w-full accent-amber-700"
          style={{ accentColor: ACCENT }}
        />
        <div className="mt-1 flex justify-between text-xs opacity-80">
          <span>10</span>
          <span className="text-base font-semibold tabular-nums" style={{ color: ACCENT }}>
            {collaborators}
          </span>
          <span>5000</span>
        </div>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="mt-6 w-full min-h-[44px] rounded-lg font-semibold transition disabled:opacity-60"
          style={{ backgroundColor: ACCENT, color: BG }}
        >
          {loading ? 'A calcular…' : 'Ver sugestão de tier'}
        </button>
        {error ? <p className="mt-4 text-sm text-red-300">{error}</p> : null}
        {result ? (
          <div className="mt-6 rounded-lg border border-white/10 p-4 text-sm leading-relaxed">
            <p className="font-semibold" style={{ color: ACCENT }}>
              {result.tier}
            </p>
            <p className="mt-2 opacity-95">{result.summary}</p>
            <p className="mt-2 text-xs opacity-75">Faixa indicativa: {result.range}</p>
          </div>
        ) : null}
      </div>
    </section>
  )
}
