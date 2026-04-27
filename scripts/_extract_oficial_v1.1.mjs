#!/usr/bin/env node
/**
 * Patch 007 — Extrai as 80 questões oficiais de docs/audit/NR01_GRO.md
 * e gera SQL de seed para instrument_version = 'v1.1'.
 *
 * Formato do markdown:
 *   BLOCO 2 – CARGA DE TRABALHO E PRESSÃO
 *
 *   Percebo que o volume de trabalho é excessivo para minha função.
 *
 *   Sinto dificuldade em cumprir minhas tarefas dentro do horário normal.
 *
 * Estratégia: identifica linhas de bloco via regex; dentro de um bloco
 * ativo, coleta todas as linhas não-vazias como questões até encontrar
 * outro marcador. Aborta se total ≠ 80 ou se qualquer dimensão ≠ 8.
 *
 * Saídas:
 *   - supabase/nr01_patch_007_questoes_v1.1.sql
 *   - docs/audit/instrument_v1.1_hash.txt
 *
 * Todas as 80 questões do doc são em sentido negativo (maior = pior).
 * Logo reverse_scored = false em todas (sem inversão no motor, alinhado
 * com orientação oficial).
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const __filename = fileURLToPath(import.meta.url)
const __dirname  = dirname(__filename)
const root       = resolve(__dirname, '..')

const DOC_PATH    = resolve(root, 'docs/audit/NR01_GRO.md')
const OUT_SQL     = resolve(root, 'supabase/nr01_patch_007_questoes_v1.1.sql')
const OUT_HASH    = resolve(root, 'docs/audit/instrument_v1.1_hash.txt')

// Bloco do doc → dimension_code do banco
// (Bloco 1 = identificação e Bloco 12 = abertas, ambos fora do escopo de Likert)
const BLOCO_TO_DIMENSION = {
  2:  'carga_trabalho',
  3:  'controle_autonomia',
  4:  'exigencias_emocionais',
  5:  'reconhecimento',
  6:  'relacoes_interpessoais',
  7:  'estabilidade_seguranca',
  8:  'assedio_violencia',
  9:  'organizacao_trabalho',
  10: 'lideranca_gestao',
  11: 'saude_bem_estar',
}

const BLOCO_RE = /^BLOCO\s+(\d+)\s*[–-]\s*(.+)$/i
// Linha que NÃO é bloco e que parece ser outro marcador/título (sai do modo coleta)
// Usa heurística: linhas em caixa alta que não são BLOCO e têm pelo menos 5 caracteres
// são títulos de seção (CLASSIFICAÇÃO FINAL, O QUE SIGNIFICA, etc.)
function isSectionHeader(line) {
  const t = line.trim()
  if (!t) return false
  if (BLOCO_RE.test(t)) return false
  // Pelo menos 5 caracteres e 70%+ uppercase letras → título
  const letters = t.replace(/[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]/g, '')
  if (letters.length < 5) return false
  const upper = letters.replace(/[^A-ZÁÀÂÃÉÊÍÓÔÕÚÇ]/g, '')
  return upper.length / letters.length >= 0.7
}

function extractQuestions(content) {
  const lines = content.split('\n')
  const questions = []

  let currentBloco = null
  let ordInDimension = 0

  for (const raw of lines) {
    const line = raw.trim()

    // Detecta início de bloco
    const m = line.match(BLOCO_RE)
    if (m) {
      const n = parseInt(m[1], 10)
      if (BLOCO_TO_DIMENSION[n]) {
        currentBloco = n
        ordInDimension = 0
      } else {
        // Bloco 1 (identificação) ou 12 (abertas) — sai do modo coleta
        currentBloco = null
      }
      continue
    }

    // Fora de bloco válido: ignora
    if (currentBloco == null) continue

    // Linha vazia: separador entre questões, ignora
    if (!line) continue

    // Outro título/seção que não é BLOCO: sai do modo coleta
    if (isSectionHeader(line)) {
      currentBloco = null
      continue
    }

    // Dentro de bloco válido + linha não-vazia + não é header → é questão
    ordInDimension += 1
    questions.push({
      bloco: currentBloco,
      dimension_code: BLOCO_TO_DIMENSION[currentBloco],
      ord: ordInDimension,
      text: line,
    })
  }

  return questions
}

function computeHash(questions) {
  const sorted = [...questions].sort((a, b) => {
    if (a.dimension_code !== b.dimension_code) {
      return a.dimension_code.localeCompare(b.dimension_code)
    }
    return a.ord - b.ord
  })
  const payload = sorted.map((q) => `${q.dimension_code}|${q.ord}|${q.text}`).join('\n')
  return crypto.createHash('sha256').update(payload, 'utf-8').digest('hex')
}

function buildSQL(questions, hash) {
  const values = questions
    .map((q) => {
      const escaped = q.text.replace(/'/g, "''")
      return `  ('${q.dimension_code}', ${q.ord}, E'${escaped}', false, 'v1.1', true)`
    })
    .join(',\n')

  return `-- ============================================================
-- QUANTUM5G — Patch 007: Questões oficiais v1.1
-- Versão: 0.7.0 | Data: ${new Date().toISOString().split('T')[0]}
-- Gerado por: scripts/_extract_oficial_v1.1.mjs
--
-- Fonte literal: docs/audit/NR01_GRO.md (= NR01_GRO.docx)
-- Total: ${questions.length} questões (10 dimensões × 8 questões).
-- reverse_scored = FALSE em todas (doc é 100% negativa, maior = pior).
-- Hash SHA-256 do conjunto: ${hash}
--
-- Estratégia v1.1 paralela:
-- - v1.0 é desativada (is_active=false) — preserva rastreabilidade
-- - v1.1 fica ativa e é o default para novas avaliações
-- - Avaliações em COLETANDO continuam em v1.0 via trigger version_guard
-- ============================================================

BEGIN;

-- 1. Desativar v1.0 (sem deletar)
UPDATE nr01_questions
   SET is_active = false
 WHERE instrument_version = 'v1.0';

-- 2. Inserir 80 questões oficiais v1.1
INSERT INTO nr01_questions
  (dimension_code, ord, text, reverse_scored, instrument_version, is_active)
VALUES
${values}
ON CONFLICT (dimension_code, ord, instrument_version) DO UPDATE SET
  text = EXCLUDED.text,
  reverse_scored = EXCLUDED.reverse_scored,
  is_active = EXCLUDED.is_active;

-- 3. Verificação interna
DO $$
DECLARE
  n_v11_active   int;
  n_v10_active   int;
  n_reverse_v11  int;
  n_dims_v11     int;
BEGIN
  SELECT COUNT(*) INTO n_v11_active
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND is_active = true;

  SELECT COUNT(*) INTO n_v10_active
    FROM nr01_questions
   WHERE instrument_version = 'v1.0' AND is_active = true;

  SELECT COUNT(*) INTO n_reverse_v11
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND reverse_scored = true;

  SELECT COUNT(DISTINCT dimension_code) INTO n_dims_v11
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND is_active = true;

  IF n_v11_active <> 80 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 deveria ter 80 questões ativas, tem %', n_v11_active;
  END IF;

  IF n_v10_active <> 0 THEN
    RAISE EXCEPTION 'Patch 007: v1.0 deveria ter 0 questões ativas, tem %', n_v10_active;
  END IF;

  IF n_reverse_v11 <> 0 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 não deveria ter questões reverse_scored (todas negativas), tem %', n_reverse_v11;
  END IF;

  IF n_dims_v11 <> 10 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 deveria cobrir 10 dimensões, cobre %', n_dims_v11;
  END IF;

  RAISE NOTICE 'Patch 007: OK (80 ativas v1.1, 10 dimensões, 0 reverse, 0 ativas v1.0)';
END $$;

COMMIT;
`
}

// ============================================================
// EXECUÇÃO
// ============================================================
const doc = fs.readFileSync(DOC_PATH, 'utf-8')
const questions = extractQuestions(doc)

// Validação dura: 80 questões total, 8 por dimensão, 10 dimensões
if (questions.length !== 80) {
  console.error(`❌ ERRO: extraídas ${questions.length} questões, esperado 80.`)
  const byDim = {}
  for (const q of questions) byDim[q.dimension_code] = (byDim[q.dimension_code] ?? 0) + 1
  console.error('Distribuição encontrada:')
  for (const [dim, n] of Object.entries(byDim)) {
    console.error(`  ${dim}: ${n} (esperado 8)`)
  }
  process.exit(1)
}

const byDim = {}
for (const q of questions) byDim[q.dimension_code] = (byDim[q.dimension_code] ?? 0) + 1
for (const [dim, n] of Object.entries(byDim)) {
  if (n !== 8) {
    console.error(`❌ ERRO: dimensão ${dim} tem ${n} questões, esperado 8.`)
    process.exit(1)
  }
}
if (Object.keys(byDim).length !== 10) {
  console.error(`❌ ERRO: ${Object.keys(byDim).length} dimensões extraídas, esperado 10.`)
  process.exit(1)
}

const hash = computeHash(questions)
const sql = buildSQL(questions, hash)

fs.writeFileSync(OUT_SQL, sql, 'utf-8')
fs.writeFileSync(OUT_HASH, hash + '\n', 'utf-8')

console.log(`✓ Extração OK: 80 questões em 10 dimensões (8 cada)`)
console.log(`✓ Hash do conjunto: ${hash}`)
console.log(`✓ SQL gerado em: ${OUT_SQL}`)
console.log(`✓ Hash gravado em: ${OUT_HASH}`)

// Amostra 5 questões aleatórias (determinístico via hash da lista)
const sampleIdx = [
  Math.floor(questions.length * 0.10),
  Math.floor(questions.length * 0.25),
  Math.floor(questions.length * 0.50),
  Math.floor(questions.length * 0.75),
  Math.floor(questions.length * 0.95),
]
console.log(`\n--- 5 amostras para inspeção visual ---`)
for (const i of sampleIdx) {
  const q = questions[i]
  console.log(`  [${q.dimension_code}/${q.ord}] ${q.text}`)
}
console.log(`\nConfronte cada uma com o NR01_GRO.md antes de aplicar.`)
