/**
 * Insere UMA resposta fictícia NR-01 para treinamento/demo.
 *
 * Uso:
 *   node --env-file=.env.local scripts/inject-training-response.mjs
 *   node --env-file=.env.local scripts/inject-training-response.mjs <assessment_id>
 */

import { randomUUID } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')

async function loadEnv() {
  const env = {}
  const text = await readFile(join(root, '.env.local'), 'utf-8')
  for (const raw of text.split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const eq = line.indexOf('=')
    if (eq < 0) continue
    env[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
  }
  return env
}

function pickValue(dimensionCode, reverseScored, idx) {
  const baseByDim = {
    carga_trabalho: 4,
    exigencias_emocionais: 4,
    saude_bem_estar: 3,
    lideranca_gestao: 3,
    controle_autonomia: 3,
    organizacao_trabalho: 2,
    reconhecimento: 2,
    relacoes_interpessoais: 2,
    estabilidade_seguranca: 2,
    assedio_violencia: 1,
  }
  const healthy = baseByDim[dimensionCode] ?? 3
  const jitter = (idx % 3) - 1
  const clamped = Math.max(1, Math.min(5, healthy + jitter))
  return reverseScored ? 6 - clamped : clamped
}

function rest(env, method, path, body) {
  const url = `${env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/${path}`
  const args = [
    '-sS',
    '--connect-timeout',
    '30',
    '--max-time',
    '120',
    '-X',
    method,
    '-H',
    `apikey: ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    '-H',
    `Authorization: Bearer ${env.SUPABASE_SERVICE_ROLE_KEY}`,
    '-H',
    'Content-Type: application/json',
  ]
  if (method === 'POST' || method === 'PATCH') {
    args.push('-H', 'Prefer: return=representation')
  }
  if (body !== undefined) {
    args.push('-d', JSON.stringify(body))
  }
  args.push(url)
  const out = execFileSync('curl.exe', args, { encoding: 'utf-8' })
  if (!out.trim()) return null
  try {
    return JSON.parse(out)
  } catch {
    return out
  }
}

const env = await loadEnv()
if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
  console.error('Configure NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY em .env.local')
  process.exit(2)
}

const assessmentArg = process.argv[2]
const countArg = parseInt(process.argv[3] ?? '1', 10)
const count = Number.isFinite(countArg) && countArg > 0 ? Math.min(countArg, 50) : 1
let assessment

if (assessmentArg) {
  if (!UUID_RE.test(assessmentArg)) {
    console.error('assessment_id inválido')
    process.exit(2)
  }
  const rows = rest(
    env,
    'GET',
    `nr01_assessments?id=eq.${assessmentArg}&select=id,name,status,instrument_version,collection_token,company_id`,
  )
  assessment = Array.isArray(rows) ? rows[0] : null
} else {
  const rows = rest(
    env,
    'GET',
    'nr01_assessments?status=in.(COLETANDO,CRIADO)&select=id,name,status,instrument_version,collection_token,company_id&order=created_at.desc',
  )
  const list = Array.isArray(rows) ? rows : []
  assessment =
    list.find((a) => /teste para jovani/i.test(a.name ?? '')) ??
    list[0] ??
    null
}

if (!assessment) {
  console.error('Nenhuma avaliação em COLETANDO/CRIADO encontrada.')
  process.exit(1)
}

const questions = rest(
  env,
  'GET',
  `nr01_questions?instrument_version=eq.${assessment.instrument_version}&is_active=eq.true&select=id,dimension_code,reverse_scored,ord&order=ord`,
)
if (!Array.isArray(questions) || !questions.length) {
  console.error(`Nenhuma questão ativa para ${assessment.instrument_version}`)
  process.exit(1)
}

const SETORES = ['Administrativo', 'Comercial', 'Operações', 'RH', 'Atendimento']
const FUNCOES = ['Analista', 'Assistente', 'Coordenador', 'Técnico', 'Atendente']
const VINCULOS = ['CLT', 'CLT', 'PJ', 'estagio', 'terceirizado']
const TEMPOS = ['<1a', '1-3a', '3-5a', '5-10a', '>10a']

function buildResponsePayload(assessment, i) {
  return {
    assessment_id: assessment.id,
    anon_id: randomUUID(),
    setor: SETORES[i % SETORES.length],
    funcao: FUNCOES[i % FUNCOES.length],
    vinculo: VINCULOS[i % VINCULOS.length],
    tempo_casa: TEMPOS[i % TEMPOS.length],
    is_leader: i % 5 === 4,
    open_q1: `Treinamento ${i + 1}: carga de trabalho e prazos.`,
    open_q2: `Treinamento ${i + 1}: feedback da liderança.`,
    open_q3: `Treinamento ${i + 1}: comunicação entre setores.`,
    instrument_version: assessment.instrument_version,
    client_locale: 'pt-BR',
  }
}

function insertOneResponse(env, assessment, questions, i) {
  const inserted = rest(env, 'POST', 'nr01_responses', buildResponsePayload(assessment, i))
  const response = Array.isArray(inserted) ? inserted[0] : inserted
  if (!response?.id) {
    throw new Error(`Falha ao inserir resposta ${i + 1}: ${JSON.stringify(inserted)}`)
  }
  const answers = questions.map((q, idx) => ({
    response_id: response.id,
    question_id: q.id,
    value: pickValue(q.dimension_code, q.reverse_scored, idx + i),
  }))
  const ansResult = rest(env, 'POST', 'nr01_response_answers', answers)
  if (!Array.isArray(ansResult)) {
    rest(env, 'DELETE', `nr01_responses?id=eq.${response.id}`)
    throw new Error(`Falha nas respostas ${i + 1}: ${JSON.stringify(ansResult)}`)
  }
  rest(env, 'POST', 'nr01_audit_log', {
    assessment_id: assessment.id,
    actor_id: null,
    actor_role: 'admin',
    event_type: 'RESPONSE_SUBMITTED',
    payload: {
      response_id: response.id,
      n_answers: answers.length,
      source: 'inject-training-response.mjs',
      training: true,
    },
    user_agent: 'script/inject-training-response',
  })
  return response.id
}

const insertedIds = []
for (let i = 0; i < count; i++) {
  insertedIds.push(insertOneResponse(env, assessment, questions, i))
}

const totalRows = rest(
  env,
  'GET',
  `nr01_responses?assessment_id=eq.${assessment.id}&select=id`,
)
const total = Array.isArray(totalRows) ? totalRows.length : insertedIds.length

const base = env.NEXT_PUBLIC_APP_URL ?? 'https://www.quantun5g.app'
console.log(`\n✓ ${insertedIds.length} resposta(s) fictícia(s) inserida(s) para treinamento\n`)
console.log({
  assessment_id: assessment.id,
  assessment_name: assessment.name,
  status: assessment.status,
  instrument_version: assessment.instrument_version,
  inserted_now: insertedIds.length,
  total_in_assessment: total,
  response_ids: insertedIds,
  company_id: assessment.company_id,
})
console.log(`\nColeta: ${base}/nr01/coleta/${assessment.collection_token}`)
console.log(`Painel: ${base}/nr01/avaliacao/${assessment.id}`)

