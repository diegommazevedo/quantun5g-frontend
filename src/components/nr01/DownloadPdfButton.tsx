'use client'

/**
 * QUANTUM5G — NR-01 · Botão de download do laudo PDF
 *
 * POST /api/nr01/avaliacao/[id]/pdf → blob → trigger download.
 * Mostra estado loading + erro inline. Não recarrega a página.
 */

import { useState } from 'react'

interface Props {
  assessmentId: string
  label?: string
  className?: string
}

export function DownloadPdfButton({
  assessmentId,
  label = 'Baixar laudo técnico (PDF)',
  className,
}: Props) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function handleClick() {
    setError(null)
    setLoading(true)
    try {
      const res = await fetch(`/api/nr01/avaliacao/${assessmentId}/pdf`, {
        method: 'POST',
      })
      if (!res.ok) {
        const txt = await res.text().catch(() => '')
        let msg = `HTTP ${res.status}`
        try {
          const json = JSON.parse(txt)
          msg = json.error || msg
          if (json.detail) msg += ` — ${json.detail}`
          if (json.hint) msg += ` (${json.hint})`
        } catch {
          if (txt) msg = txt.slice(0, 200)
        }
        setError(msg)
        return
      }

      const blob = await res.blob()
      const filename =
        res.headers.get('Content-Disposition')?.match(/filename="(.+?)"/)?.[1] ??
        `laudo-nr01-${assessmentId.slice(0, 8)}.pdf`

      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className={
          className ??
          'rounded-lg bg-zinc-900 px-4 py-2 text-sm font-semibold text-white hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60'
        }
      >
        {loading ? 'Gerando PDF (até 30s)…' : label}
      </button>
      {error && (
        <p className="max-w-md text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}
