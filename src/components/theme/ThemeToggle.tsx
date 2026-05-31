'use client'

import { useEffect, useState } from 'react'

export type QuantumTheme = 'quantum-dark' | 'light'

const STORAGE_KEY = 'quantum5g-theme'

function applyTheme(theme: QuantumTheme) {
  document.documentElement.setAttribute('data-theme', theme)
}

export function ThemeToggle() {
  const [theme, setTheme] = useState<QuantumTheme>('quantum-dark')

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY) as QuantumTheme | null
    const initial =
      stored === 'light' || stored === 'quantum-dark' ? stored : 'quantum-dark'
    setTheme(initial)
    applyTheme(initial)
  }, [])

  function toggle() {
    const next: QuantumTheme = theme === 'quantum-dark' ? 'light' : 'quantum-dark'
    setTheme(next)
    localStorage.setItem(STORAGE_KEY, next)
    applyTheme(next)
  }

  return (
    <button
      type="button"
      onClick={toggle}
      className="w-full rounded-lg border border-[var(--q-border)] bg-[var(--q-surface-elevated)] px-3 py-2 text-xs font-medium text-[var(--q-text-muted)] transition hover:text-[var(--q-text)]"
      title={theme === 'quantum-dark' ? 'Alternar para paleta clara' : 'Alternar para paleta escura'}
    >
      {theme === 'quantum-dark' ? '◐ Paleta escura (ativa)' : '○ Paleta clara (ativa)'}
    </button>
  )
}
