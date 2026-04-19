/**
 * QUANTUM5G — Módulo NR-01 | Pacote de Evidências
 *
 * Gera o pacote auditável imutável que:
 *   1. Prova qual instrumento foi aplicado (hash SHA-256)
 *   2. Documenta a metodologia (texto canônico anexado ao PGR)
 *   3. Registra adesão e janela de coleta
 *   4. Calcula hash global do pacote (todos os campos + lista ordenada de hashes de respostas)
 *
 * Este pacote é o que o auditor fiscal abre primeiro — tem que estar pronto em 3 cliques.
 */

import { createHash } from 'crypto'
import {
  Nr01Question,
  Nr01Response,
  Nr01ResponseAnswer,
} from '@/types/nr01'

// ============================================================
// METODOLOGIA CANÔNICA — texto que vai literal para o PGR
// ============================================================

export const METHODOLOGY_TEXT_V1_0 = `
## Metodologia da avaliação dos Fatores de Risco Psicossocial Relacionados ao Trabalho (FRPRT)

A presente avaliação foi conduzida em conformidade com a NR-01 (item 1.5.3.2),
suas atualizações pelas Portarias MTE 1.419/2024 e 765/2025, e o Guia Técnico
sobre Fatores de Risco Psicossocial relacionados ao Trabalho (MTE/SIT, 2024).

### Instrumento
Foi aplicado o instrumento **Pentagrama NR-01 v1.0**, composto por 80 questões
distribuídas em 10 dimensões (Carga, Controle, Exigências Emocionais,
Reconhecimento, Relações Interpessoais, Estabilidade, Assédio, Organização,
Liderança e Saúde), em escala Likert de 5 pontos. As dimensões cobrem os FRPRT
explicitados no Anexo I do Guia MTE e mantêm pontes com o modelo de Maslach
(Carga, Controle, Recompensa, Comunidade, Justiça e Valores).

### Confidencialidade
A coleta é anônima por construção: respostas individuais não são acessíveis pelo
empregador; apenas agregados com k-anonymity ≥ 5 são divulgados, conforme
recomendação da ANPD para tratamento de dados sensíveis em saúde ocupacional.

### Análise
O score por dimensão é a média Likert (1.0 a 5.0) das questões respondidas,
com inversão prévia (6 - v) das questões em sentido positivo para preservar
a orientação canônica do instrumento (maior valor = maior risco percebido,
conforme NR01_GRO). A classificação de risco segue cinco faixas conforme
fronteiras do instrumento canônico (1.0–1.8 muito baixo · 1.9–2.6 baixo ·
2.7–3.4 atenção · 3.5–4.2 elevado · 4.3–5.0 crítico). O Índice de Saúde
Organizacional (ISO) é a média aritmética das médias de cada dimensão, com
peso diferenciado para a dimensão Violência e Assédio (fator 1,30) em função
da Lei 14.457/2022. As demais dimensões têm peso uniforme (1,00).

### Validade técnica
Esta avaliação é assinada pelo responsável técnico abaixo e mantém pacote de
evidências (instrumento aplicado, datas, adesão, hashes) imutável para fins
de auditoria fiscal e de defesa em eventual contencioso.
`.trim()

// ============================================================
// HASH DO INSTRUMENTO
// ============================================================

export function hashInstrument(questions: Nr01Question[], version: string): string {
  const normalized = questions
    .filter((q) => q.instrument_version === version && q.is_active)
    .sort((a, b) => {
      if (a.dimension_code !== b.dimension_code) {
        return a.dimension_code.localeCompare(b.dimension_code)
      }
      return a.ord - b.ord
    })
    .map((q) => `${q.dimension_code}|${q.ord}|${q.reverse_scored}|${q.text}`)
    .join('\n')
  return sha256(`v=${version}\n${normalized}`)
}

// ============================================================
// HASH POR RESPOSTA (sem expor anon_id)
// ============================================================

export function hashResponse(
  response: Nr01Response,
  answers: Nr01ResponseAnswer[],
): string {
  const responseAnswers = answers
    .filter((a) => a.response_id === response.id)
    .sort((a, b) => a.question_id.localeCompare(b.question_id))
    .map((a) => `${a.question_id}=${a.value}`)
    .join(';')
  // Não inclui anon_id no payload — apenas o id da resposta para trilha
  return sha256(`${response.id}|${response.submitted_at}|${responseAnswers}`)
}

// ============================================================
// HASH GLOBAL DO PACOTE
// ============================================================

export interface EvidencePackInputs {
  assessmentId: string
  instrumentSha256: string
  collectionStartedAt: string
  collectionEndedAt: string
  totalInvitesSent: number
  totalResponsesComplete: number
  adherencePct: number
  methodologyText: string
  methodologyVersion: string
  technicalLeadName: string
  technicalLeadCrp: string | null
  responseHashes: string[]      // ordenados
}

export function hashPack(inp: EvidencePackInputs): string {
  const lines = [
    `assessment=${inp.assessmentId}`,
    `instrument=${inp.instrumentSha256}`,
    `started=${inp.collectionStartedAt}`,
    `ended=${inp.collectionEndedAt}`,
    `invites=${inp.totalInvitesSent}`,
    `responses=${inp.totalResponsesComplete}`,
    `adherence=${inp.adherencePct}`,
    `methodology_v=${inp.methodologyVersion}`,
    `lead=${inp.technicalLeadName}|${inp.technicalLeadCrp ?? ''}`,
    `responses_root=${sha256(inp.responseHashes.sort().join('\n'))}`,
  ]
  return sha256(lines.join('\n'))
}

// ============================================================
// UTILS
// ============================================================

export function sha256(value: string): string {
  return createHash('sha256').update(value, 'utf-8').digest('hex')
}

/**
 * Hash de IP com sal por-avaliação. O mesmo IP gera hashes diferentes em
 * avaliações diferentes — bloqueia correlação cruzada entre clientes
 * (pseudonimização forte exigida pela ANPD).
 *
 * Use SEMPRE com assessmentId. O fallback global existe apenas para audit
 * log de eventos que não estejam atrelados a um assessment (ex.: erros
 * de plataforma); ele NÃO deve ser usado para dados de respondente.
 */
export function hashIp(
  ip: string | null | undefined,
  assessmentId?: string | null,
): string | null {
  if (!ip) return null
  const salt = assessmentId
    ? `${assessmentId}|nr01-quantum5g`
    : 'global|nr01-quantum5g'
  return sha256(`${ip}|${salt}`)
}
