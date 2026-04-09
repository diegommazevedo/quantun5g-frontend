'use client'

/**
 * QUANTUM5G — ExportButtons
 * Grupo de botões de exportação para a Seção 10 e página do agente.
 * XLSX disponível agora; PDF e JPG nas próximas entregas.
 */

import { useState } from 'react'
import { exportPlanoAcaoXlsx } from '@/lib/ai/export-xlsx'
import type { AiReport } from '@/types/database'

interface Props {
  report:      AiReport
  companyName: string
  size?:       'sm' | 'md'
}

export function ExportButtons({ report, companyName, size = 'md' }: Props) {
  const [loadingXlsx, setLoadingXlsx] = useState(false)

  const btnBase = size === 'sm'
    ? 'rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors flex items-center gap-1.5'
    : 'rounded-lg border px-3.5 py-2 text-sm font-medium transition-colors flex items-center gap-1.5'

  async function handleXlsx() {
    if (loadingXlsx) return
    setLoadingXlsx(true)
    try {
      await exportPlanoAcaoXlsx(report, companyName)
    } catch (e) {
      console.error('[xlsx export]', e)
      alert('Erro ao exportar XLSX. Verifique o console.')
    } finally {
      setLoadingXlsx(false)
    }
  }

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {/* XLSX — Plano de Ação */}
      <button
        onClick={handleXlsx}
        disabled={loadingXlsx}
        title="Exportar Plano de Ação como planilha Excel"
        className={`${btnBase} border-green-300 bg-green-50 text-green-800 hover:bg-green-100 disabled:opacity-50`}
      >
        <span>{loadingXlsx ? '⟳' : '↓'}</span>
        <span>{loadingXlsx ? 'Gerando…' : 'XLS Plano'}</span>
      </button>

      {/* PDF — placeholder para Entrega 7b */}
      <button
        disabled
        title="Em breve — Exportar Análise IA como PDF"
        className={`${btnBase} border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed`}
      >
        <span>↓</span>
        <span>PDF Análise</span>
      </button>

      {/* JPG — placeholder para Entrega 7c */}
      <button
        disabled
        title="Em breve — Exportar Pentagrama como JPG"
        className={`${btnBase} border-zinc-200 bg-zinc-50 text-zinc-400 cursor-not-allowed`}
      >
        <span>↓</span>
        <span>JPG Radar</span>
      </button>
    </div>
  )
}
