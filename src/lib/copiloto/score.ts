/**
 * Copiloto Comercial — scoring determinístico da fila do dia.
 */

export interface CrmAccountScoreInput {
  id: string
  name: string
  avgTicket: number | null
  purchaseCycleDays: number | null
  lastPurchaseAt: string | null // date
  lastContactAt: string | null
  openDealNextStepAt: string | null
  openDealTitle: string | null
  daysSinceProposal?: number | null
}

export interface CrmScoreResult {
  accountId: string
  score: number
  reasons: string[]
  suggestedAction: string
}

function daysSince(dateIso: string | null | undefined, today = new Date()): number | null {
  if (!dateIso) return null
  const d = new Date(dateIso)
  if (Number.isNaN(d.getTime())) return null
  return Math.floor((today.getTime() - d.getTime()) / 86400000)
}

export function scoreCrmAccount(input: CrmAccountScoreInput, today = new Date()): CrmScoreResult {
  const reasons: string[] = []
  let score = 0

  const cycle = input.purchaseCycleDays && input.purchaseCycleDays > 0 ? input.purchaseCycleDays : 30
  const silencePurchase = daysSince(input.lastPurchaseAt, today)
  const silenceContact = daysSince(input.lastContactAt, today)

  if (silencePurchase != null) {
    if (silencePurchase > cycle * 1.5) {
      score += 40
      reasons.push(
        `Costumava comprar a cada ~${cycle} dias. Está há ${silencePurchase} sem comprar.`,
      )
    } else if (silencePurchase > cycle) {
      score += 25
      reasons.push(`Ciclo de compra estourado (${silencePurchase} dias sem compra; ciclo ${cycle}).`)
    }
  } else {
    score += 10
    reasons.push('Sem histórico de compra cadastrado — priorize descoberta.')
  }

  if (silenceContact == null || silenceContact >= 14) {
    score += 20
    reasons.push(
      silenceContact == null
        ? 'Nenhum contato registrado.'
        : `Sem contato há ${silenceContact} dias.`,
    )
  }

  if (input.openDealNextStepAt) {
    const next = new Date(input.openDealNextStepAt)
    if (next <= today) {
      score += 35
      reasons.push(
        `Próximo passo vencido (${input.openDealTitle ?? 'oportunidade'} — ${input.openDealNextStepAt}).`,
      )
    } else {
      const daysTo = Math.floor((next.getTime() - today.getTime()) / 86400000)
      if (daysTo <= 3) {
        score += 15
        reasons.push(`Próximo passo em ${daysTo} dia(s): ${input.openDealTitle ?? 'oportunidade'}.`)
      }
    }
  }

  if (input.daysSinceProposal != null && input.daysSinceProposal >= 3) {
    score += 30
    reasons.push(`Proposta/orçamento há ${input.daysSinceProposal} dias sem retorno.`)
  }

  if (input.avgTicket && input.avgTicket >= 5000) {
    score += 5
    reasons.push('Ticket médio relevante.')
  }

  let suggestedAction = 'Registrar um contato rápido e atualizar o próximo passo.'
  if (silencePurchase != null && silencePurchase > cycle) {
    suggestedAction = 'Reativar: ligar perguntando sobre reposição / necessidade atual.'
  }
  if (input.daysSinceProposal != null && input.daysSinceProposal >= 3) {
    suggestedAction = 'Cobrar retorno do orçamento com follow-up curto.'
  }
  if (input.openDealNextStepAt && new Date(input.openDealNextStepAt) <= today) {
    suggestedAction = 'Executar o próximo passo da oportunidade aberta hoje.'
  }

  return {
    accountId: input.id,
    score,
    reasons: reasons.slice(0, 4),
    suggestedAction,
  }
}
