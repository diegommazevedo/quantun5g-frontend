/**
 * QUANTUM5G — NR-01 · Computação dos 5 estados públicos + frase de próxima ação
 *
 * Recebe LaudoData (já carregado por loadLaudoData) → devolve 5 itens com
 * cor verde/amarelo/vermelho/cinza + frase de próxima ação obrigatória.
 *
 * Regras (Diego, P5):
 *  - Avaliação: verde se status='CONCLUIDO' e fechamento < 1 ano atrás
 *  - Plano: verde se status='aprovado'
 *  - Micro-pulsos: verde se enabled=true AND última semana < 14 dias
 *  - Revisão 90d: verde se next_review_at > hoje; amarelo < 14d; vermelho atrasado
 *  - Reavaliação anual: verde < 10 meses; amarelo 10-12; vermelho > 12
 */

import type { LaudoData } from '@/lib/nr01/pdf-data'
import type { PublicStatusItem } from '@/types/nr01'

// ============================================================
// HELPERS
// ============================================================

const ONE_DAY_MS = 86_400_000

function daysBetween(a: Date, b: Date): number {
  return Math.round((a.getTime() - b.getTime()) / ONE_DAY_MS)
}

function fmtBR(d: string | Date | null | undefined): string {
  if (!d) return '—'
  const dt = typeof d === 'string' ? new Date(d) : d
  return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
}

function addDays(base: Date, days: number): Date {
  const d = new Date(base)
  d.setDate(d.getDate() + days)
  return d
}

// ============================================================
// CÁLCULO POR ITEM
// ============================================================

function computeAvaliacao(d: LaudoData): PublicStatusItem {
  const a = d.assessment
  const closedAt = d.result?.calculated_at ?? a.collection_closes_at
  const now = new Date()

  if (a.status !== 'CONCLUIDO' || !closedAt) {
    return {
      key: 'avaliacao',
      label: 'Avaliação completa realizada',
      color: 'vermelho',
      caption: `Status atual: ${a.status}. Conclusão pendente.`,
      next_action_if_pending: 'Concluir o processamento da avaliação NR-01.',
      pending_priority: 1,
    }
  }

  const closed = new Date(closedAt)
  const daysSince = daysBetween(now, closed)

  if (daysSince > 365) {
    return {
      key: 'avaliacao',
      label: 'Avaliação completa realizada',
      color: 'vermelho',
      caption: `Concluída em ${fmtBR(closed)} — vencida há ${daysSince - 365} dia(s).`,
      next_action_if_pending: 'Iniciar nova avaliação anual com urgência (a vigente está vencida).',
      pending_priority: 1,
      due_date: addDays(closed, 365).toISOString(),
    }
  }

  return {
    key: 'avaliacao',
    label: 'Avaliação completa realizada',
    color: 'verde',
    caption: `Concluída em ${fmtBR(closed)}.`,
    due_date: addDays(closed, 365).toISOString(),
  }
}

function computePlano(d: LaudoData): PublicStatusItem {
  const p = d.actionPlan
  if (!p) {
    return {
      key: 'plano',
      label: 'Plano de ação aprovado pela liderança',
      color: 'vermelho',
      caption: 'Plano de ação ainda não criado.',
      next_action_if_pending: 'Construir e aprovar plano de ação a partir do laudo.',
      pending_priority: 2,
    }
  }
  if (p.status === 'aprovado' || p.status === 'em_execucao' || p.status === 'concluido') {
    return {
      key: 'plano',
      label: 'Plano de ação aprovado pela liderança',
      color: 'verde',
      caption: p.approved_at
        ? `Aprovado em ${fmtBR(p.approved_at)}.`
        : `Status: ${p.status}.`,
    }
  }
  return {
    key: 'plano',
    label: 'Plano de ação aprovado pela liderança',
    color: 'amarelo',
    caption: `Status: ${p.status}. Aprovação pendente da liderança.`,
    next_action_if_pending: 'Aprovar plano de ação com a liderança.',
    pending_priority: 2,
  }
}

function computeMicroPulsos(d: LaudoData): PublicStatusItem {
  const c = d.pulse.config
  if (!c || !c.enabled) {
    return {
      key: 'micro_pulsos',
      label: 'Micro-pulsos ativos',
      color: 'vermelho',
      caption: 'Monitoramento contínuo desativado.',
      next_action_if_pending: 'Ativar micro-pulsos semanais para cumprir requisito de monitoramento contínuo NR-01.',
      pending_priority: 3,
    }
  }
  const last = c.last_dispatched_at ? new Date(c.last_dispatched_at) : null
  const now = new Date()

  if (!last) {
    return {
      key: 'micro_pulsos',
      label: 'Micro-pulsos ativos',
      color: 'amarelo',
      caption: `Ativo, mas nenhum pulso disparado ainda. ${c.recipient_emails?.length ?? 0} destinatários cadastrados.`,
      next_action_if_pending: 'Disparar o primeiro pulso semanal.',
      pending_priority: 4,
    }
  }

  const daysSinceLast = daysBetween(now, last)
  if (daysSinceLast > 14) {
    return {
      key: 'micro_pulsos',
      label: 'Micro-pulsos ativos',
      color: 'vermelho',
      caption: `Inativo há ${daysSinceLast} dia(s). Último pulso em ${fmtBR(last)}.`,
      next_action_if_pending: 'Retomar disparo semanal de micro-pulsos.',
      pending_priority: 3,
    }
  }
  if (daysSinceLast > 7) {
    return {
      key: 'micro_pulsos',
      label: 'Micro-pulsos ativos',
      color: 'amarelo',
      caption: `Último pulso em ${fmtBR(last)}. Atraso de ${daysSinceLast - 7} dia(s).`,
      next_action_if_pending: 'Disparar o pulso desta semana.',
      pending_priority: 5,
    }
  }
  return {
    key: 'micro_pulsos',
    label: 'Micro-pulsos ativos',
    color: 'verde',
    caption: `Último pulso em ${fmtBR(last)}. ${d.pulse.weeksDispatched} semana(s) acumulada(s).`,
  }
}

function computeRevisao90d(d: LaudoData): PublicStatusItem {
  const p = d.actionPlan
  const next = p?.next_review_at ?? null
  const now = new Date()

  if (!next) {
    if (!p || p.status !== 'aprovado') {
      // Sem revisão agendada faz sentido se o plano nem foi aprovado.
      return {
        key: 'revisao_90d',
        label: 'Revisão de 90 dias agendada',
        color: 'cinza',
        caption: 'Aguardando aprovação do plano para agendar a primeira revisão.',
      }
    }
    return {
      key: 'revisao_90d',
      label: 'Revisão de 90 dias agendada',
      color: 'amarelo',
      caption: 'Plano aprovado mas próxima revisão não agendada.',
      next_action_if_pending: 'Agendar revisão dos 90 dias do plano de ação.',
      pending_priority: 6,
    }
  }

  const dueDate = new Date(next)
  const daysToGo = daysBetween(dueDate, now)

  if (daysToGo < 0) {
    return {
      key: 'revisao_90d',
      label: 'Revisão de 90 dias agendada',
      color: 'vermelho',
      caption: `Atrasada em ${Math.abs(daysToGo)} dia(s). Estava agendada para ${fmtBR(dueDate)}.`,
      next_action_if_pending: 'Realizar a revisão dos 90 dias com urgência (atrasada).',
      pending_priority: 4,
      due_date: next,
    }
  }
  if (daysToGo <= 14) {
    return {
      key: 'revisao_90d',
      label: 'Revisão de 90 dias agendada',
      color: 'amarelo',
      caption: `Próxima revisão em ${fmtBR(dueDate)} (em ${daysToGo} dia(s)).`,
      next_action_if_pending: `Preparar revisão dos 90 dias agendada para ${fmtBR(dueDate)}.`,
      pending_priority: 7,
      due_date: next,
    }
  }
  return {
    key: 'revisao_90d',
    label: 'Revisão de 90 dias agendada',
    color: 'verde',
    caption: `Próxima revisão em ${fmtBR(dueDate)} (em ${daysToGo} dias).`,
    due_date: next,
  }
}

function computeReavaliacaoAnual(d: LaudoData): PublicStatusItem {
  const closedAt = d.result?.calculated_at ?? d.assessment.collection_closes_at
  const now = new Date()
  if (!closedAt) {
    return {
      key: 'reavaliacao_anual',
      label: 'Reavaliação completa anual agendada',
      color: 'cinza',
      caption: 'Aguardando conclusão da avaliação atual.',
    }
  }
  const closed = new Date(closedAt)
  const dueDate = addDays(closed, 365)
  const monthsSince = daysBetween(now, closed) / 30

  if (monthsSince > 12) {
    return {
      key: 'reavaliacao_anual',
      label: 'Reavaliação completa anual agendada',
      color: 'vermelho',
      caption: `Atrasada — última avaliação em ${fmtBR(closed)} (há ${monthsSince.toFixed(0)} meses).`,
      next_action_if_pending: 'Iniciar nova avaliação anual NR-01 (vencida).',
      pending_priority: 1,
      due_date: dueDate.toISOString(),
    }
  }
  if (monthsSince >= 10) {
    return {
      key: 'reavaliacao_anual',
      label: 'Reavaliação completa anual agendada',
      color: 'amarelo',
      caption: `Janela de reavaliação aberta. Última em ${fmtBR(closed)}; nova até ${fmtBR(dueDate)}.`,
      next_action_if_pending: 'Programar reavaliação anual NR-01 nas próximas semanas.',
      pending_priority: 8,
      due_date: dueDate.toISOString(),
    }
  }
  return {
    key: 'reavaliacao_anual',
    label: 'Reavaliação completa anual agendada',
    color: 'verde',
    caption: `Próxima até ${fmtBR(dueDate)}.`,
    due_date: dueDate.toISOString(),
  }
}

// ============================================================
// API PRINCIPAL
// ============================================================

export interface PublicStatusSnapshot {
  items: PublicStatusItem[]
  next_action: string                 // sempre uma frase
  next_action_due_date: string | null // se a ação tem prazo
  has_pdf_available: boolean
}

export function computePublicStatus(d: LaudoData): PublicStatusSnapshot {
  const items: PublicStatusItem[] = [
    computeAvaliacao(d),
    computePlano(d),
    computeMicroPulsos(d),
    computeRevisao90d(d),
    computeReavaliacaoAnual(d),
  ]

  // Pendência mais urgente: menor pending_priority
  const pendings = items
    .filter((i) => i.pending_priority != null && i.next_action_if_pending)
    .sort((a, b) => (a.pending_priority ?? 99) - (b.pending_priority ?? 99))

  let next_action = 'Aguardar fechamento do ciclo de micro-pulsos.'
  let next_action_due_date: string | null = null

  if (pendings.length > 0) {
    next_action = `Próxima ação obrigatória: ${pendings[0].next_action_if_pending}`
    next_action_due_date = pendings[0].due_date ?? null
  } else {
    // Tudo verde — aponta a próxima atividade programada (ex: revisão ou reavaliação)
    const nextScheduled = items
      .filter((i) => i.due_date)
      .sort((a, b) => new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime())[0]
    if (nextScheduled) {
      next_action = `Próxima ação obrigatória: ${nextScheduled.label} em ${fmtBR(nextScheduled.due_date!)}.`
      next_action_due_date = nextScheduled.due_date!
    } else {
      next_action = 'Próxima ação obrigatória: manter monitoramento contínuo até a próxima revisão programada.'
    }
  }

  return {
    items,
    next_action,
    next_action_due_date,
    has_pdf_available: !!d.evidencePack?.pdf_sha256,
  }
}
