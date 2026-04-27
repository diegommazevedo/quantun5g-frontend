#!/usr/bin/env node
/**
 * Patch 008 — Extrai 50 laudos micro (10 dim × 5 níveis) + 5 macros
 * de docs/audit/NR01_GRO.md.
 *
 * Formato real:
 *   🔵 LAUDO MICRO
 *   🔵 DIMENSÃO: CARGA DE TRABALHO E PRESSÃO
 *
 *   RISCO MUITO BAIXO
 *
 *   <parágrafo principal — análise>
 *
 *   <parágrafo recomendação — começa com "Recomenda-se" geralmente>
 *
 *   RISCO BAIXO
 *   ...
 *
 *   🔵 LAUDO MACRO (MÉDIA GERAL)
 *
 *   RISCO MUITO BAIXO (1,0 – 1,8)
 *   ...
 *
 *   🔵 MODELO DE LAUDO ROBUSTO     ← marca fim das seções de laudo
 *
 * Heurística de separação: cada laudo tem exatamente 2 parágrafos (linhas
 * separadas por linha em branco). Primeiro = principal, segundo = recomendação.
 * Se houver mais que 2, junta os primeiros como principal e o último é
 * recomendação. Aborta se houver < 2.
 *
 * Saídas:
 *   supabase/nr01_patch_008b_laudos_seed.sql
 *   docs/audit/laudos_v1.1_hash.txt
 */

import fs from 'node:fs'
import crypto from 'node:crypto'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const DOC_PATH    = resolve(root, 'docs/audit/NR01_GRO.md')
const OUT_SQL     = resolve(root, 'supabase/nr01_patch_008b_laudos_seed.sql')
const OUT_HASH    = resolve(root, 'docs/audit/laudos_v1.1_hash.txt')

// Nome no doc (uppercase, sem prefixo emoji) → code do banco
const DIM_BY_NAME = {
  'CARGA DE TRABALHO E PRESSÃO': 'carga_trabalho',
  'CONTROLE E AUTONOMIA SOBRE AS TAREFAS': 'controle_autonomia',
  // OBS: o doc usa EM-DASH (–) entre "TRABALHO" e "VIDA". Normalizado abaixo.
  'EXIGÊNCIAS EMOCIONAIS E EQUILÍBRIO TRABALHO-VIDA': 'exigencias_emocionais',
  'RECONHECIMENTO E RECOMPENSA': 'reconhecimento',
  'RELAÇÕES INTERPESSOAIS E CLIMA ORGANIZACIONAL': 'relacoes_interpessoais',
  'SEGURANÇA E ESTABILIDADE': 'estabilidade_seguranca',
  'VIOLÊNCIA E ASSÉDIO': 'assedio_violencia',
  'ORGANIZAÇÃO DO TRABALHO': 'organizacao_trabalho',
  'LIDERANÇA E GESTÃO': 'lideranca_gestao',
  'SAÚDE E BEM-ESTAR RELACIONADOS AO TRABALHO': 'saude_bem_estar',
}

// Nome de nível (uppercase, sem range) → code
const NIVEL_BY_NAME = {
  'RISCO MUITO BAIXO': 'muito_baixo',
  'RISCO BAIXO':       'baixo',
  'ZONA DE ATENÇÃO':   'atencao',
  'ATENÇÃO':           'atencao',     // alternativa não-encontrada no doc atual; defensivo
  'RISCO ELEVADO':     'elevado',
  'RISCO CRÍTICO':     'critico',
}

function normalizeName(s) {
  // Remove emoji 🔵 (chars não-ASCII no início), prefixo "DIMENSÃO:",
  // traços longos (en-dash, em-dash), colapsa espaços, uppercase.
  return s
    .replace(/^[^A-Za-zÁÀÂÃÉÊÍÓÔÕÚÇáàâãéêíóôõúç]+/g, '') // remove tudo não-letra do início (emoji + espaço)
    .replace(/^DIMENSÃO\s*:\s*/i, '')
    .replace(/[–—]/g, '-')
    .trim()
    .toUpperCase()
    .replace(/\s+/g, ' ')
}

function stripNivelRange(s) {
  // 'RISCO MUITO BAIXO (1,0 – 1,8)' → 'RISCO MUITO BAIXO'
  return s.replace(/\s*\([^)]+\)\s*$/, '').trim()
}

function isDimHeader(line) {
  // Inicia com 🔵 DIMENSÃO: ou tem o nome direto
  if (!line.includes('DIMENSÃO')) return null
  const nm = normalizeName(line)
  return DIM_BY_NAME[nm] ?? null
}

function isMicroSectionHeader(line) {
  // Match "LAUDO MICRO" no início (após eventual emoji/prefixo).
  // Não usa regex com emoji por problema de surrogate pair em JS.
  const t = line.toUpperCase().trim()
  return t.endsWith('LAUDO MICRO') || t === 'LAUDO MICRO' || /\bLAUDO\s+MICRO\b/.test(t)
}

function isMacroSectionHeader(line) {
  const t = line.toUpperCase().trim()
  return /\bLAUDO\s+MACRO\b/.test(t)
}

function isEndOfLaudosSection(line) {
  const t = line.toUpperCase().trim()
  return /\bMODELO\s+DE\s+LAUDO\s+ROBUSTO\b/.test(t)
    || /^LAUDO\s+TÉCNICO\s+DE\s+AVALIAÇÃO/.test(t)
}

function isNivelHeader(line) {
  const t = stripNivelRange(line.trim()).toUpperCase()
  return NIVEL_BY_NAME[t] ?? null
}

function extract(content) {
  const lines = content.split('\n')

  /** @type {Array<{dimension_code:string, nivel_risco:string, texto_principal:string, texto_recomendacao:string}>} */
  const microLaudos = []
  /** @type {Array<{nivel_risco:string, texto_principal:string, texto_recomendacao:string}>} */
  const macroLaudos = []

  let mode = null   // null | 'micro' | 'macro'
  let currentDim = null
  let currentNivel = null
  let buffer = []   // parágrafos do laudo corrente

  function flush() {
    if (currentNivel == null) { buffer = []; return }
    if (buffer.length < 2) {
      // Laudo incompleto — ignora (será detectado pela validação de contagem)
      buffer = []
      return
    }
    const recomendacao = buffer[buffer.length - 1].trim()
    const principal = buffer.slice(0, -1).join('\n\n').trim()
    if (mode === 'micro') {
      if (!currentDim) { buffer = []; return }
      microLaudos.push({
        dimension_code: currentDim,
        nivel_risco: currentNivel,
        texto_principal: principal,
        texto_recomendacao: recomendacao,
      })
    } else if (mode === 'macro') {
      macroLaudos.push({
        nivel_risco: currentNivel,
        texto_principal: principal,
        texto_recomendacao: recomendacao,
      })
    }
    buffer = []
  }

  for (const raw of lines) {
    const line = raw.trim()

    if (isMicroSectionHeader(line)) {
      flush()
      mode = 'micro'
      currentDim = null
      currentNivel = null
      continue
    }
    if (isMacroSectionHeader(line)) {
      flush()
      mode = 'macro'
      currentDim = null
      currentNivel = null
      continue
    }
    if (isEndOfLaudosSection(line)) {
      flush()
      mode = null
      break
    }

    if (mode == null) continue

    // Detecta header de dimensão (só relevante em modo 'micro')
    if (mode === 'micro') {
      const dim = isDimHeader(line)
      if (dim) {
        flush()
        currentDim = dim
        currentNivel = null
        continue
      }
    }

    // Detecta header de nível (vale tanto micro quanto macro)
    const niv = isNivelHeader(line)
    if (niv) {
      flush()
      currentNivel = niv
      buffer = []
      continue
    }

    // Acumula linha como parágrafo (cada linha não-vazia é um parágrafo,
    // já que markdown convertido tem linhas em branco entre parágrafos).
    if (currentNivel && line.length > 0) {
      buffer.push(line)
    }
  }
  flush()

  return { microLaudos, macroLaudos }
}

function computeHash(micros, macros) {
  const sm = [...micros].sort((a, b) =>
    a.dimension_code === b.dimension_code
      ? a.nivel_risco.localeCompare(b.nivel_risco)
      : a.dimension_code.localeCompare(b.dimension_code),
  )
  const sM = [...macros].sort((a, b) => a.nivel_risco.localeCompare(b.nivel_risco))

  const microPayload = sm
    .map((l) => `MICRO|${l.dimension_code}|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')
  const macroPayload = sM
    .map((l) => `MACRO|${l.nivel_risco}|${l.texto_principal}|${l.texto_recomendacao}`)
    .join('\n')

  return crypto
    .createHash('sha256')
    .update(microPayload + '\n---\n' + macroPayload, 'utf-8')
    .digest('hex')
}

function buildSQL(micros, macros, hash) {
  const esc = (s) => s.replace(/\\/g, '\\\\').replace(/'/g, "''")
  const microRows = micros
    .map((l) => `  ('${l.dimension_code}', '${l.nivel_risco}', E'${esc(l.texto_principal)}', E'${esc(l.texto_recomendacao)}', 'v1.1', true)`)
    .join(',\n')
  const macroRows = macros
    .map((l) => `  ('${l.nivel_risco}', E'${esc(l.texto_principal)}', E'${esc(l.texto_recomendacao)}', 'v1.1', true)`)
    .join(',\n')

  return `-- ============================================================
-- QUANTUM5G — Patch 008b: Seed dos 55 laudos oficiais v1.1
-- Versão: 0.8.0 | Data: ${new Date().toISOString().split('T')[0]}
-- Gerado por: scripts/_extract_laudos_v1.1.mjs
--
-- Fonte literal: docs/audit/NR01_GRO.md (= NR01_GRO.docx)
-- Total: ${micros.length} laudos micro + ${macros.length} laudos macro
-- Hash SHA-256 do conjunto: ${hash}
-- ============================================================

BEGIN;

INSERT INTO nr01_laudo_textos
  (dimension_code, nivel_risco, texto_principal, texto_recomendacao, instrument_version, is_active)
VALUES
${microRows}
ON CONFLICT (dimension_code, nivel_risco, instrument_version) DO UPDATE SET
  texto_principal    = EXCLUDED.texto_principal,
  texto_recomendacao = EXCLUDED.texto_recomendacao,
  is_active          = EXCLUDED.is_active;

INSERT INTO nr01_laudo_macros
  (nivel_risco, texto_principal, texto_recomendacao, instrument_version, is_active)
VALUES
${macroRows}
ON CONFLICT (nivel_risco, instrument_version) DO UPDATE SET
  texto_principal    = EXCLUDED.texto_principal,
  texto_recomendacao = EXCLUDED.texto_recomendacao,
  is_active          = EXCLUDED.is_active;

DO $$
DECLARE
  n_micros int;
  n_macros int;
  n_dims_micros int;
BEGIN
  SELECT COUNT(*) INTO n_micros
    FROM nr01_laudo_textos
   WHERE instrument_version = 'v1.1' AND is_active = true;

  SELECT COUNT(*) INTO n_macros
    FROM nr01_laudo_macros
   WHERE instrument_version = 'v1.1' AND is_active = true;

  SELECT COUNT(DISTINCT dimension_code) INTO n_dims_micros
    FROM nr01_laudo_textos
   WHERE instrument_version = 'v1.1' AND is_active = true;

  IF n_micros <> 50 THEN
    RAISE EXCEPTION 'Patch 008b: esperados 50 micros v1.1 ativos, encontrados %', n_micros;
  END IF;
  IF n_macros <> 5 THEN
    RAISE EXCEPTION 'Patch 008b: esperados 5 macros v1.1 ativos, encontrados %', n_macros;
  END IF;
  IF n_dims_micros <> 10 THEN
    RAISE EXCEPTION 'Patch 008b: esperadas 10 dimensões nos micros, encontradas %', n_dims_micros;
  END IF;

  RAISE NOTICE 'Patch 008b: OK (50 micros + 5 macros, 10 dimensões cobertas)';
END $$;

COMMIT;
`
}

// ============================================================
// EXECUÇÃO
// ============================================================
const doc = fs.readFileSync(DOC_PATH, 'utf-8')
const { microLaudos, macroLaudos } = extract(doc)

// Validações duras
if (microLaudos.length !== 50) {
  console.error(`✗ Esperados 50 laudos micro, extraídos ${microLaudos.length}`)
  const byDim = {}
  for (const l of microLaudos) byDim[l.dimension_code] = (byDim[l.dimension_code] ?? 0) + 1
  for (const [d, n] of Object.entries(byDim)) console.error(`  ${d}: ${n} (esperado 5)`)
  process.exit(1)
}

if (macroLaudos.length !== 5) {
  console.error(`✗ Esperados 5 laudos macro, extraídos ${macroLaudos.length}`)
  process.exit(1)
}

const byDim = {}
for (const l of microLaudos) byDim[l.dimension_code] = (byDim[l.dimension_code] ?? 0) + 1
for (const [d, n] of Object.entries(byDim)) {
  if (n !== 5) {
    console.error(`✗ Dimensão ${d} tem ${n} níveis (esperado 5)`)
    process.exit(1)
  }
}

// Asserção literal (defesa contra reformatação silenciosa do md)
const sentinela = microLaudos.find(
  (l) => l.dimension_code === 'carga_trabalho' && l.nivel_risco === 'muito_baixo',
)
if (!sentinela || !sentinela.texto_principal.includes('classificada como risco muito baixo')) {
  console.error(`✗ Asserção literal falhou: laudo carga_trabalho/muito_baixo não bate com texto esperado.`)
  console.error(`  Encontrado: "${sentinela?.texto_principal?.slice(0, 100) ?? '(vazio)'}…"`)
  process.exit(1)
}

const hash = computeHash(microLaudos, macroLaudos)
const sql = buildSQL(microLaudos, macroLaudos, hash)

fs.writeFileSync(OUT_SQL, sql, 'utf-8')
fs.writeFileSync(OUT_HASH, hash + '\n', 'utf-8')

console.log(`✓ Extração OK: 50 micros (10 dim × 5 níveis) + 5 macros`)
console.log(`✓ Hash do conjunto: ${hash}`)
console.log(`✓ SQL gerado em: ${OUT_SQL}`)
console.log(`✓ Hash gravado em: ${OUT_HASH}`)

// 3 amostras estratégicas (cada extremo + meio) para inspeção visual
const samples = [
  microLaudos.find((l) => l.dimension_code === 'carga_trabalho'    && l.nivel_risco === 'muito_baixo'),
  microLaudos.find((l) => l.dimension_code === 'assedio_violencia' && l.nivel_risco === 'critico'),
  macroLaudos.find((l) => l.nivel_risco === 'atencao'),
]
console.log(`\n--- 3 amostras para inspeção visual ---`)
for (const s of samples) {
  if (!s) continue
  const tag = s.dimension_code ? `[MICRO ${s.dimension_code}/${s.nivel_risco}]` : `[MACRO ${s.nivel_risco}]`
  console.log(`\n${tag}`)
  console.log(`  PRINCIPAL: ${s.texto_principal.slice(0, 200)}…`)
  console.log(`  RECOMENDAÇÃO: ${s.texto_recomendacao.slice(0, 200)}…`)
}
console.log(`\nConfronte com NR01_GRO.md antes de aplicar.`)
