/**
 * QUANTUM5G — Módulo NR-01 | Pacote de Evidências
 *
 * Gera o pacote auditável imutável que:
 *   1. Prova qual instrumento foi aplicado (hash SHA-256)
 *   2. Documenta a metodologia (texto oficial anexado ao PGR)
 *   3. Registra adesão e janela de coleta
 *   4. Calcula hash global do pacote (todos os campos + lista ordenada de hashes de respostas)
 *
 * Este pacote é o que o auditor fiscal abre primeiro — tem que estar pronto em 3 cliques.
 */

import { createHash, createHmac } from 'crypto'
import {
  Nr01Question,
  Nr01Response,
  Nr01ResponseAnswer,
} from '@/types/nr01'

// ============================================================
// METODOLOGIA OFICIAL v1.1 — Patch 007 (2026-04-19); P014: léxico
// Texto literal anexado ao PGR. Reflete fidedignidade ao
// instrumento oficial NR01_GRO.docx.
// Hash SHA-256 das 80 questões: ver docs/audit/instrument_v1.1_hash.txt
// ============================================================

export const METHODOLOGY_TEXT_V1_1 = `
## Metodologia da avaliação dos Fatores de Risco Psicossocial Relacionados ao Trabalho (FRPRT)

A presente avaliação foi conduzida em conformidade com a NR-01 (item 1.5.3.2)
e suas atualizações pelas Portarias MTE 1.419/2024 e 765/2025.

### Instrumento
Foi aplicado o instrumento **Pentagrama NR-01 v1.1**, composto por 80 questões
distribuídas em 10 dimensões (Carga de Trabalho e Pressão; Controle e Autonomia
sobre as Tarefas; Exigências Emocionais e Equilíbrio Trabalho-Vida; Reconhecimento
e Recompensa; Relações Interpessoais e Clima Organizacional; Segurança e
Estabilidade; Violência e Assédio; Organização do Trabalho; Liderança e Gestão;
Saúde e Bem-Estar Relacionados ao Trabalho), em escala Likert de 5 pontos.

A integridade do conjunto de questões aplicado é atestada pelo hash SHA-256
registrado no pacote de evidências (campo \`instrument_sha256\`), permitindo
verificar a qualquer momento que o instrumento aplicado corresponde
literalmente à versão oficial autorizada pelo responsável técnico.

### Escala e classificação
Conforme o instrumento oficial, MAIOR valor na escala Likert indica MAIOR risco
percebido. A média de cada dimensão é classificada nas seguintes faixas:

- 1,0 – 1,8 → Risco muito baixo / condição favorável
- 1,9 – 2,6 → Risco baixo
- 2,7 – 3,4 → Atenção
- 3,5 – 4,2 → Risco elevado
- 4,3 – 5,0 → Risco crítico

### Confidencialidade e pseudonimização
A coleta é anônima por construção: respostas individuais não são acessíveis pelo
empregador. Apenas agregados respeitando k-anonymity ≥ 5 são divulgados, conforme
recomendação da ANPD para tratamento de dados sensíveis em saúde ocupacional.

Para fins de trilha auditável (controle de duplicidade e detecção de abuso), o
sistema mantém hashes pseudonimizados de identificadores técnicos (IP de origem
e email de convite, quando aplicável). A pseudonimização emprega HMAC-SHA256 com
chave secreta de 256 bits mantida exclusivamente em ambiente controlado de
produção, separada do código-fonte e sob escopo "Sensitive" no provedor de
hospedagem, em conformidade com o Art. 13 da LGPD. A reversão desses hashes para
identificadores originais é computacionalmente inviável sem acesso simultâneo ao
banco e à chave secreta.

### Análise
O score por dimensão é a média aritmética das respostas Likert (escala 1-5).
O Índice de Saúde Organizacional (ISO) é a média aritmética das médias das
10 dimensões, com peso uniforme (1,00) para todas as dimensões (P013, alinhado
ao RT e ao NR01_GRO). A criticidade relativa a violência e assédio — inclusive
no âmbito da Lei nº 14.457/2022 — é refletida nos textos oficiais do laudo,
não por meio de ponderação extra na fórmula do ISO.

### Validade técnica
Esta avaliação é assinada pelo responsável técnico abaixo e mantém pacote de
evidências (instrumento aplicado, datas, adesão, hashes do instrumento e do
pacote) imutável para fins de auditoria fiscal e de defesa em eventual
contencioso. A trilha de auditoria das operações realizadas na plataforma é
preservada em log append-only.

Os textos interpretativos oficiais (50 micro-laudos por dimensão × nível
e 5 macro-laudos por nível geral) aplicados nesta avaliação são rastreados
pelo hash SHA-256 registrado no campo \`laudos_pack_sha256\` do pacote de
evidências, garantindo prova de qual versão dos textos oficiais foi
utilizada na emissão deste laudo.
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
 * Hash de IP para audit log com pseudonimização forte (HMAC-SHA256).
 *
 * Pseudonimização conforme Art. 13 LGPD: a chave (NR01_IP_HASH_SALT) é mantida
 * separadamente do código-fonte, em ambiente controlado (variável de ambiente
 * Vercel marcada como Sensitive, scope Production). Sem essa env var, a função
 * lança erro em vez de cair em hash fraco.
 *
 * O assessmentId compõe o escopo do payload — o mesmo IP gera hashes diferentes
 * em avaliações diferentes, bloqueando correlação cruzada entre clientes.
 *
 * @throws Error se NR01_IP_HASH_SALT ausente ou < 64 chars hex (32 bytes).
 */
export function hashIp(
  ip: string | null | undefined,
  assessmentId?: string | null,
): string | null {
  if (!ip) return null

  const key = process.env.NR01_IP_HASH_SALT
  if (!key) {
    throw new Error(
      'NR01_IP_HASH_SALT não configurado. ' +
      'Pseudonimização de IP exige chave HMAC em variável de ambiente. ' +
      'Gerar com `openssl rand -hex 32` e adicionar em Vercel (Production, Sensitive).',
    )
  }
  if (key.length < 64) {
    throw new Error(
      'NR01_IP_HASH_SALT muito curto. Esperado: ≥64 caracteres hex (32 bytes). ' +
      'Gerar novo salt com `openssl rand -hex 32`.',
    )
  }

  const scope = assessmentId ?? 'global'
  return createHmac('sha256', key)
    .update(`${ip}|${scope}`, 'utf-8')
    .digest('hex')
}

// ============================================================
// HASH DOS LAUDOS OFICIAIS (Patch 008; P014: léxico)
// ============================================================

/**
 * Computa SHA-256 do conjunto oficial de laudos vigente para a versão
 * de instrumento informada (default v1.1). Retorna o mesmo formato de
 * hash gerado pelo extrator (scripts/_extract_laudos_v1.1.mjs), permitindo
 * comparação direta com docs/audit/laudos_v1.1_hash.txt.
 *
 * Usado em gerarPacoteEvidencias para popular nr01_evidence_pack.laudos_pack_sha256
 * — prova imutável de qual versão dos textos oficiais foi aplicada.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function hashLaudosOficiais(supabase: any, instrumentVersion: string = 'v1.1'): Promise<string> {
  const [{ data: micros, error: errM }, { data: macros, error: errMa }] = await Promise.all([
    supabase
      .from('nr01_laudo_textos')
      .select('dimension_code, nivel_risco, texto_principal, texto_recomendacao')
      .eq('instrument_version', instrumentVersion)
      .eq('is_active', true)
      .order('dimension_code')
      .order('nivel_risco'),
    supabase
      .from('nr01_laudo_macros')
      .select('nivel_risco, texto_principal, texto_recomendacao')
      .eq('instrument_version', instrumentVersion)
      .eq('is_active', true)
      .order('nivel_risco'),
  ])

  if (errM || errMa || !micros || !macros) {
    throw new Error('Falha ao carregar laudos oficiais para hash')
  }

  const microPayload = (micros as Array<{
    dimension_code: string
    nivel_risco: string
    texto_principal: string
    texto_recomendacao: string
  }>)
    .map((l) => `MICRO|${l.dimension_code}|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')
  const macroPayload = (macros as Array<{
    nivel_risco: string
    texto_principal: string
    texto_recomendacao: string
  }>)
    .map((l) => `MACRO|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')

  return sha256(microPayload + '\n---\n' + macroPayload)
}
