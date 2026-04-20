import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const doc = fs.readFileSync(resolve(root, 'docs/audit/NR01_GRO.md'), 'utf-8')
const lines = doc.split('\n')

function isMicroSectionHeader(line) {
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
}

// Trace execution
let mode = null
let count = 0
for (let i = 265; i < 280; i++) {
  const line = lines[i].trim()
  const isMicro = isMicroSectionHeader(line)
  const isMacro = isMacroSectionHeader(line)
  const isEnd = isEndOfLaudosSection(line)
  console.log(`L${i+1} mode=${mode} micro=${isMicro} macro=${isMacro} end=${isEnd}: "${line}"`)
  if (isMicro) { mode = 'micro'; continue }
  if (isMacro) { mode = 'macro'; continue }
  if (isEnd) { mode = null; break }
  if (mode == null) continue
  count++
}
console.log(`\nLinhas processadas no modo ativo: ${count}`)
