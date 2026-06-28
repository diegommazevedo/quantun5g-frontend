'use client'

/**
 * Finaliza convite/recuperação: PKCE (?code=), OTP (?token_hash=) ou hash (#access_token=).
 * Suporta os três fluxos do Supabase Auth para garantir compatibilidade com
 * implicit flow (Site URL localhost) e PKCE flow (produção).
 */

import { Suspense, useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { safeRedirectPath } from '@/lib/auth/safe-redirect'

function AuthCallbackInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [message, setMessage] = useState('Validando seu link de acesso…')

  useEffect(() => {
    let cancelled = false

    async function finish() {
      const next = safeRedirectPath(searchParams.get('next')) ?? '/convite/ativar'
      const supabase = createClient()

      // Caso 1: hash fragment (#access_token=...) — implicit flow / Supabase v1
      const hashRaw = window.location.hash.replace(/^#/, '')
      if (hashRaw) {
        const hp = new URLSearchParams(hashRaw)
        const access_token = hp.get('access_token')
        const refresh_token = hp.get('refresh_token')
        if (access_token && refresh_token) {
          const { error } = await supabase.auth.setSession({ access_token, refresh_token })
          if (cancelled) return
          if (!error) {
            // Remove hash da URL antes de navegar
            window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`)
            // Força navegação completa para garantir que os cookies sejam lidos pelo servidor
            window.location.replace(next)
            return
          }
          setMessage(error.message)
          window.setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2800)
          return
        }
      }

      // Caso 2: PKCE code (?code=...) — fluxo padrão Supabase v2
      const code = searchParams.get('code')
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(code)
        if (cancelled) return
        if (!error) {
          window.location.replace(next)
          return
        }
        setMessage(error.message)
        window.setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2800)
        return
      }

      // Caso 3: OTP hash (?token_hash=...&type=...)
      const tokenHash = searchParams.get('token_hash')
      const type = searchParams.get('type')
      if (tokenHash && type) {
        const { error } = await supabase.auth.verifyOtp({
          token_hash: tokenHash,
          type: type as 'invite' | 'recovery' | 'signup' | 'email' | 'magiclink',
        })
        if (cancelled) return
        if (!error) {
          window.location.replace(next)
          return
        }
        setMessage(error.message)
        window.setTimeout(() => router.replace(`/login?error=${encodeURIComponent(error.message)}`), 2800)
        return
      }

      setMessage('Link inválido ou expirado.')
      window.setTimeout(() => router.replace('/login?error=link_invalido'), 2800)
    }

    finish()
    return () => {
      cancelled = true
    }
  }, [router, searchParams])

  return (
    <div className="flex min-h-dvh flex-col items-center justify-center bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 px-4 text-center text-white">
      <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-400">Quantum5G</p>
      <p className="mt-4 text-sm text-slate-200">{message}</p>
    </div>
  )
}

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-dvh items-center justify-center bg-slate-950 text-sm text-slate-300">
          Carregando…
        </div>
      }
    >
      <AuthCallbackInner />
    </Suspense>
  )
}
