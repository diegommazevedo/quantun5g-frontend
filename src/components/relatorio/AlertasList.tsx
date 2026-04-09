/**
 * QUANTUM5G — AlertasList
 * Exibe todos os alertas do diagnóstico com ícone e descrição.
 */

import type { DiagnosticAlert } from '@/types/database'

const ALERT_CONFIG: Record<string, { icon: string; label: string; color: string }> = {
  BOLHA_SISTEMICA:    { icon: '🫧', label: 'Bolha Sistêmica',       color: 'bg-red-50   border-red-200   text-red-800'    },
  QUESTAO_ANCORA:     { icon: '⚓', label: 'Questão Âncora',        color: 'bg-amber-50  border-amber-200  text-amber-800'  },
  BLOCO_CRITICO_OCULTO: { icon: '🔍', label: 'Bloco Crítico Oculto', color: 'bg-orange-50 border-orange-200 text-orange-800' },
  BAIXA_AMOSTRAGEM:   { icon: '📊', label: 'Baixa Amostragem',      color: 'bg-zinc-50   border-zinc-200   text-zinc-700'   },
}

interface Props {
  alerts: DiagnosticAlert[]
}

export function AlertasList({ alerts }: Props) {
  if (!alerts || alerts.length === 0) {
    return (
      <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
        <span>✅</span>
        <span className="text-sm text-green-800">Nenhum alerta identificado neste diagnóstico.</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, i) => {
        const cfg = ALERT_CONFIG[alert.tipo] ?? {
          icon: '⚠️', label: alert.tipo, color: 'bg-zinc-50 border-zinc-200 text-zinc-700',
        }
        return (
          <div
            key={i}
            className={`rounded-lg border px-4 py-3.5 ${cfg.color}`}
          >
            <div className="flex items-start gap-3">
              <span className="text-xl leading-none mt-0.5">{cfg.icon}</span>
              <div>
                <p className="text-sm font-semibold">{cfg.label}</p>
                <p className="text-sm mt-0.5">{alert.descricao}</p>
                {alert.dimensoes && alert.dimensoes.length > 0 && (
                  <p className="text-xs mt-1 opacity-75">
                    Dimensões afetadas: {alert.dimensoes.join(', ')}
                  </p>
                )}
                {alert.questao && (
                  <p className="text-xs mt-1 opacity-75">
                    Questão Q{alert.questao}
                    {typeof alert.questao === 'number' && ` · Dimensão: ${alert.dimensao ?? ''}`}
                  </p>
                )}
                {alert.bloco && (
                  <p className="text-xs mt-1 opacity-75">
                    Bloco: {alert.bloco} · Dimensão: {alert.dimensao ?? ''}
                  </p>
                )}
                {typeof alert.n === 'number' && (
                  <p className="text-xs mt-1 opacity-75">
                    Respondentes: {alert.n}
                  </p>
                )}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
