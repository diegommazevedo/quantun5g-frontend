/**
 * Migra valores que estavam em job_title (campo "Cargo" usado como departamento)
 * para a coluna department — só quando department está vazio.
 * Não apaga job_title (preserva histórico).
 *
 * node --env-file=.env.local scripts/migrate-job-title-to-department.mjs
 * Dry-run: node --env-file=.env.local scripts/migrate-job-title-to-department.mjs --dry-run
 */

import { readFile } from 'node:fs/promises'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const DRY = process.argv.includes('--dry-run')

async function loadEnv() {
  const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
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

async function main() {
  const env = await loadEnv()
  const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  const { data: rows, error } = await admin
    .from('company_contacts')
    .select('id, full_name, email, job_title, department')
    .not('job_title', 'is', null)

  if (error) throw error

  const toMigrate = (rows ?? []).filter((r) => {
    const job = (r.job_title ?? '').trim()
    const dept = (r.department ?? '').trim()
    return job.length > 0 && dept.length === 0
  })

  console.log(DRY ? '=== DRY RUN ===' : '=== MIGRATE job_title → department ===')
  console.log(`Candidatos: ${toMigrate.length}`)

  let ok = 0
  for (const r of toMigrate) {
    const department = String(r.job_title).trim()
    console.log(`  ${r.full_name} <${r.email}> → department="${department}"`)
    if (DRY) continue
    const { error: upErr } = await admin
      .from('company_contacts')
      .update({ department })
      .eq('id', r.id)
    if (upErr) throw upErr
    ok += 1
  }

  console.log(DRY ? `\nDry-run: ${toMigrate.length} seriam migrados` : `\n✅ Migrados: ${ok}`)
}

main().catch((e) => {
  console.error('ERRO:', e.message ?? e)
  process.exit(1)
})
