'use client'

/**
 * QUANTUM5G — useAgenteContext
 * Detecta pathname e retorna contexto + chips do agente por página.
 */

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

export type AgenteContextType = 'dashboard' | 'diagnostic' | 'report' | 'general'

export interface AgenteChip {
  label: string
  prompt: string
}

export interface AgenteContext {
  type:         AgenteContextType
  diagnosticId: string | null
  chips:        AgenteChip[]
  systemHint:   string
}

const CHIPS: Record<AgenteContextType, AgenteChip[]> = {
  dashboard: [
    { label: 'Diagnóstico prioritário', prompt: 'Qual diagnóstico precisa de atenção urgente no meu painel?' },
    { label: 'Alertas ativos',          prompt: 'Resuma os alertas críticos ativos nos diagnósticos do meu painel' },
    { label: 'Próximas ações',          prompt: 'Quais são as próximas ações prioritárias na minha agenda de diagnósticos?' },
    { label: 'Criar diagnóstico',       prompt: 'Quero criar um novo diagnóstico' },
  ],
  diagnostic: [
    { label: 'Status da coleta',        prompt: 'Qual o status atual da coleta de respostas neste diagnóstico?' },
    { label: 'Respostas faltantes',     prompt: 'Quantas respostas ainda faltam para gerar o relatório?' },
    { label: 'Quando posso gerar?',     prompt: 'Quando posso gerar o relatório com base nas respostas atuais?' },
    { label: 'Enviar lembretes',        prompt: 'Como devo enviar lembretes para quem ainda não respondeu?' },
  ],
  report: [
    { label: 'Dimensão mais crítica',   prompt: 'Aprofunde a análise da dimensão mais crítica' },
    { label: 'Questões âncora',         prompt: 'Quais questões âncora merecem atenção imediata?' },
    { label: 'Padrão sistêmico',        prompt: 'Explique o padrão sistêmico encontrado entre as dimensões' },
    { label: 'Gap de percepção',        prompt: 'O que o gap de percepção revela sobre esta liderança?' },
    { label: '30/60/90 dias',           prompt: 'Monte um plano de 30/60/90 dias para esta empresa' },
    { label: 'Primeira ação',           prompt: 'Qual a primeira ação que o líder deve tomar amanhã?' },
    { label: 'Abertura da devolutiva',  prompt: 'Sugira como abrir a reunião de devolutiva' },
    { label: 'Ferramenta urgente',      prompt: 'Explique como aplicar a ferramenta prescrita mais urgente' },
  ],
  general: [
    { label: 'Criar diagnóstico',       prompt: 'Quero criar um novo diagnóstico' },
    { label: 'Fluxo de coleta',         prompt: 'Como funciona o fluxo de coleta do Pentagrama de Ginger?' },
    { label: 'Níveis do Pentagrama',    prompt: 'Explique os níveis de resultado do Pentagrama de Ginger' },
    { label: 'IL vs IC',                prompt: 'O que é o instrumento IL e como ele difere do IC?' },
  ],
}

export function useAgenteContext(): AgenteContext {
  const pathname = usePathname() ?? ''

  return useMemo(() => {
    // /relatorio/[id] (ignora /relatorio/[id]/agente — redireciona)
    const reportMatch = pathname.match(/^\/relatorio\/([^/]+)/)
    if (reportMatch) {
      return {
        type:         'report',
        diagnosticId: reportMatch[1],
        chips:        CHIPS.report,
        systemHint:   `O usuário está visualizando o relatório do diagnóstico ID: ${reportMatch[1]}.`,
      }
    }

    // /diagnostico/[id]
    const diagMatch = pathname.match(/^\/diagnostico\/([^/]+)/)
    if (diagMatch) {
      return {
        type:         'diagnostic',
        diagnosticId: diagMatch[1],
        chips:        CHIPS.diagnostic,
        systemHint:   `O usuário está no painel do diagnóstico ID: ${diagMatch[1]}.`,
      }
    }

    // /dashboard
    if (pathname.startsWith('/dashboard')) {
      return {
        type:         'dashboard',
        diagnosticId: null,
        chips:        CHIPS.dashboard,
        systemHint:   'O usuário está no dashboard principal, visualizando a lista de diagnósticos.',
      }
    }

    // Qualquer outra página autenticada
    return {
      type:         'general',
      diagnosticId: null,
      chips:        CHIPS.general,
      systemHint:   `O usuário está na página ${pathname}.`,
    }
  }, [pathname])
}
