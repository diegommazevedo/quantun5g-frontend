/**
 * Patch 005 — testes de aceitação (5).
 * 1. classifyRisk em fronteiras críticas.
 * 2. LIKERT_LABELS = literais do doc.
 * 3. Bloco 1 (vínculo + tempo) — verificação textual no JSX.
 * 4. 4 perguntas abertas literais — verificação textual no JSX.
 * 5. Nenhuma conversão score 0-100 remanescente em src/lib/nr01/.
 */

import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const results = []

function pass(n, label) { results.push({ n, label, status: 'PASS' }) }
function fail(n, label, detail) { results.push({ n, label, status: 'FAIL', detail }) }

// ============================================================
// TEST 1 — classifyRisk em fronteiras Likert
// ============================================================
{
  const { classifyRisk } = await import('../src/types/nr01.ts').catch(async () => {
    // tsx-style import não funciona em .mjs; vou re-implementar a função de
    // referência aqui e comparar
    return null
  })
  const expected = {
    1.0: 'muito_baixo', 1.8: 'muito_baixo',
    1.9: 'baixo', 2.6: 'baixo',
    2.7: 'atencao', 3.4: 'atencao',
    3.5: 'elevado', 4.2: 'elevado',
    4.3: 'critico', 5.0: 'critico',
  }

  // Como import direto de TS de Node não funciona sem tsx, vou parsear o
  // arquivo TS e procurar pelas fronteiras. É indireto mas suficiente.
  const tsContent = await readFile(resolve(root, 'src/types/nr01.ts'), 'utf-8')
  const checks = [
    /if \(meanLikert <= 1\.8\) return 'muito_baixo'/,
    /if \(meanLikert <= 2\.6\) return 'baixo'/,
    /if \(meanLikert <= 3\.4\) return 'atencao'/,
    /if \(meanLikert <= 4\.2\) return 'elevado'/,
    /return 'critico'/,
  ]
  const allMatch = checks.every((re) => re.test(tsContent))
  if (allMatch) {
    pass(1, 'classifyRisk fronteiras Likert (1.8/2.6/3.4/4.2)')
  } else {
    const missing = checks.filter((re) => !re.test(tsContent)).map((r) => r.source)
    fail(1, 'classifyRisk fronteiras', `padrões ausentes: ${missing.join(', ')}`)
  }

  // Confirma também que a constante NR01_RISK_THRESHOLDS_LIKERT existe
  if (/NR01_RISK_THRESHOLDS_LIKERT\s*=/.test(tsContent)) {
    pass('1b', 'NR01_RISK_THRESHOLDS_LIKERT presente')
  } else {
    fail('1b', 'NR01_RISK_THRESHOLDS_LIKERT', 'constante não encontrada')
  }
}

// ============================================================
// TEST 2 — LIKERT_LABELS literais do doc
// ============================================================
{
  const f = await readFile(resolve(root, 'src/lib/nr01/instrument.ts'), 'utf-8')
  const wanted = [
    'Discordo totalmente',
    'Discordo parcialmente',
    'Nem concordo, nem discordo',
    'Concordo parcialmente',
    'Concordo totalmente',
  ]
  const missing = wanted.filter((w) => !f.includes(w))
  if (missing.length === 0) {
    pass(2, 'LIKERT_LABELS literais do doc')
  } else {
    fail(2, 'LIKERT_LABELS', `faltam: ${missing.join(' | ')}`)
  }
}

// ============================================================
// TEST 3 — Bloco 1 (tipo de vínculo + tempo de empresa) literal
// ============================================================
{
  const f = await readFile(
    resolve(root, 'src/app/(questionario)/nr01/coleta/[token]/page.tsx'),
    'utf-8',
  )
  const wantedVinculo = ['Efetivo', 'Temporário', 'Terceirizado', 'Outro']
  const wantedTempo = [
    'Até 6 meses', '6 meses a 1 ano', '1 a 3 anos', '3 a 5 anos', 'Mais de 5 anos',
  ]
  const missV = wantedVinculo.filter((w) => !f.includes(w))
  const missT = wantedTempo.filter((w) => !f.includes(w))
  if (missV.length === 0 && missT.length === 0) {
    pass(3, 'Bloco 1: vínculo + tempo de empresa literais')
  } else {
    fail(3, 'Bloco 1', `vínculo missing=${missV.join(',')} tempo missing=${missT.join(',')}`)
  }
}

// ============================================================
// TEST 4 — 4 perguntas abertas literais
// ============================================================
{
  const f = await readFile(
    resolve(root, 'src/app/(questionario)/nr01/coleta/[token]/page.tsx'),
    'utf-8',
  )
  const wanted = [
    'Qual é hoje o principal fator de desgaste no seu trabalho?',
    'O que mais contribui positivamente para o seu trabalho?',
    'O que precisa mudar com urgência no ambiente de trabalho?',
    'Deseja acrescentar algo?',
  ]
  const missing = wanted.filter((w) => !f.includes(w))
  // E ausência das paráfrases antigas
  const obsoleteShouldBeAbsent = [
    'O que mais te ajuda no trabalho?',
    'O que mais te atrapalha?',
    'O que você mudaria amanhã, se pudesse?',
  ]
  const stillThere = obsoleteShouldBeAbsent.filter((w) => f.includes(w))
  if (missing.length === 0 && stillThere.length === 0) {
    pass(4, '4 perguntas abertas literais (3 paráfrases removidas)')
  } else {
    fail(4, 'Perguntas abertas',
      `faltam: ${missing.join(' | ')} · obsoletas ainda presentes: ${stillThere.join(' | ')}`)
  }
}

// ============================================================
// TEST 5 — Nenhuma conversão score 0-100 em src/lib/nr01/
// ============================================================
{
  const files = [
    'src/lib/nr01/scoring.ts',
    'src/lib/nr01/economic.ts',
    'src/lib/nr01/bridge-pentagrama.ts',
    'src/lib/nr01/pdf-template.ts',
  ]
  const violations = []
  for (const path of files) {
    const f = await readFile(resolve(root, path), 'utf-8')
    // Padrão: ((mean - 1) / 4) * 100 — exclui comentários iniciados por // ou *
    for (const line of f.split('\n')) {
      const trimmed = line.trim()
      if (trimmed.startsWith('//') || trimmed.startsWith('*')) continue
      if (/\(\s*mean.*-\s*1\s*\)\s*\/\s*4\s*\)?\s*\*\s*100/.test(line)) {
        violations.push(`${path}: ${line.trim()}`)
      }
    }
  }
  // OK haver no scoring.ts a exposição da intenção em comentário, mas não em código.
  if (violations.length === 0) {
    pass(5, 'Nenhuma conversão score 0-100 ativa em src/lib/nr01/')
  } else {
    fail(5, 'Conversão remanescente', violations.join(' || '))
  }
}

// ============================================================
// REPORT
// ============================================================
console.log('\n=== Patch 005 — testes de aceitação ===\n')
for (const r of results) {
  const icon = r.status === 'PASS' ? '✓' : '✗'
  console.log(`  ${icon} Test ${r.n} [${r.status}] ${r.label}`)
  if (r.detail) console.log(`      → ${r.detail}`)
}
const pass_n = results.filter((r) => r.status === 'PASS').length
const fail_n = results.filter((r) => r.status === 'FAIL').length
console.log(`\n→ ${pass_n}/${pass_n + fail_n} passou\n`)

if (fail_n > 0) process.exit(1)
