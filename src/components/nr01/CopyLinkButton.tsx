'use client'

/**
 * Copia URL para o clipboard com feedback visual.
 */

import { useState } from 'react'

interface Props {
  url: string
  label?: string
}

export function CopyLinkButton({ url, label = 'Copiar link' }: Props) {
  const [copied, setCopied] = useState(false)

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(url)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback
      const ta = document.createElement('textarea')
      ta.value = url
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="rounded border border-zinc-300 px-2 py-1 text-xs text-zinc-700 hover:border-zinc-500 hover:text-zinc-900"
    >
      {copied ? '✓ Copiado' : label}
    </button>
  )
}
