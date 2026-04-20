import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, resolve } from 'node:path'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const doc = fs.readFileSync(resolve(root, 'docs/audit/NR01_GRO.md'), 'utf-8')
const lines = doc.split('\n')

// 1. Localizar primeiras ocorrências relevantes
let foundMicro = -1, foundDim = -1, foundNivel = -1, foundMacro = -1, foundFim = -1
for (let i = 0; i < lines.length; i++) {
  const t = lines[i].trim().toUpperCase()
  if (foundMicro < 0 && t.includes('LAUDO MICRO')) foundMicro = i
  if (foundDim < 0 && t.includes('DIMENSÃO') && t.includes('CARGA')) foundDim = i
  if (foundNivel < 0 && t === 'RISCO MUITO BAIXO') foundNivel = i
  if (foundMacro < 0 && t.includes('LAUDO MACRO')) foundMacro = i
  if (foundFim < 0 && t.includes('MODELO DE LAUDO')) foundFim = i
}
console.log({ foundMicro, foundDim, foundNivel, foundMacro, foundFim })

// 2. Mostrar as linhas brutas em volta
for (const idx of [foundMicro, foundDim, foundNivel]) {
  if (idx < 0) continue
  console.log(`\nLinha ${idx + 1} (raw):`, JSON.stringify(lines[idx]))
  console.log(`Linha ${idx + 1} (trim+upper):`, JSON.stringify(lines[idx].trim().toUpperCase()))
}
