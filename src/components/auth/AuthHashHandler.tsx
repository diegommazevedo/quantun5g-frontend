'use client'

/**
 * Supabase às vezes redireciona para a Site URL (ex.: /) com tokens no hash.
 * Encaminha para /auth/callback, que cria a sessão no navegador.
 */

import { useEffect } from 'react'

export function AuthHashHandler() {
  useEffect(() => {
    const hash = window.location.hash
    if (!hash || !hash.includes('access_token')) return

    const path = window.location.pathname
    if (path === '/auth/callback') return

    const hp = new URLSearchParams(hash.replace(/^#/, ''))
    const type = hp.get('type') ?? 'recovery'
    const next =
      type === 'recovery' || type === 'invite' || type === 'signup'
        ? '/convite/ativar'
        : '/dashboard'

    const target = `/auth/callback?next=${encodeURIComponent(next)}${hash}`
    window.location.replace(target)
  }, [])

  return null
}
