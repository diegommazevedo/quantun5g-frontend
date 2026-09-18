'use client'

import { useEffect } from 'react'

/** Força tema claro na rota de impressão (PDF legível). */
export function ForceLightTheme() {
  useEffect(() => {
    const html = document.documentElement
    const prev = html.getAttribute('data-theme')
    html.setAttribute('data-theme', 'light')
    return () => {
      if (prev) html.setAttribute('data-theme', prev)
      else html.removeAttribute('data-theme')
    }
  }, [])

  return null
}
