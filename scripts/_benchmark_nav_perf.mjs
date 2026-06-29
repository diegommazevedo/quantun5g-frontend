/**
 * Benchmark: waterfall de navegação contratante (Pasola) — antes vs depois af4248c4
 * Mede queries Supabase e tempo acumulado (simulação fiel ao código).
 */

import { readFile } from 'node:fs/promises'
import { performance } from 'node:perf_hooks'
import { createClient } from '@supabase/supabase-js'

const envText = await readFile('.env.local', 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.trim().startsWith('#'))
    .map((l) => {
      const i = l.indexOf('=')
      return [l.slice(0, i).trim(), l.slice(i + 1).trim()]
    }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const GERENCIA_ID = 'd88d61f8-19e2-4450-abb0-e43860fffa4b'

async function timed(label, fn) {
  const t0 = performance.now()
  const result = await fn()
  return { label, ms: performance.now() - t0, result }
}

/** Antes: StaffShell auth + page auth + org duplicada + dashboard list */
async function simulateBeforeDashboard() {
  let queries = 0
  const steps = []

  // StaffShell: getUser (network) + profiles
  steps.push(await timed('StaffShell profiles', async () => {
    queries += 1
    return admin.from('profiles').select('name, role, module_nr01').eq('id', GERENCIA_ID).single()
  }))

  // Page: getUser + profiles (duplicado — sem cache compartilhado)
  steps.push(await timed('Page profiles (dup)', async () => {
    queries += 1
    return admin.from('profiles').select('name, role').eq('id', GERENCIA_ID).single()
  }))

  // userHasNr01License: profile SR (dup de novo)
  steps.push(await timed('License check profile', async () => {
    queries += 1
    const { data } = await admin.from('profiles').select('role, module_nr01').eq('id', GERENCIA_ID).maybeSingle()
    return data?.module_nr01 === true
  }))

  // loadCompanyIdsForContratante OLD: org + companies
  steps.push(await timed('companyIds org (1)', async () => {
    queries += 1
    return admin.from('org_accounts').select('id').eq('owner_user_id', GERENCIA_ID).maybeSingle()
  }))
  const org = steps.at(-1).result.data
  steps.push(await timed('companyIds companies', async () => {
    queries += 1
    return admin.from('companies').select('id').eq('org_account_id', org.id)
  }))
  const companyIds = (steps.at(-1).result.data ?? []).map((c) => c.id)

  steps.push(await timed('assessments list', async () => {
    queries += 1
    return admin
      .from('nr01_assessments')
      .select('id, name, status, company_id')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })
  }))
  const assessments = steps.at(-1).result.data ?? []

  if (assessments.length) {
    steps.push(await timed('responses all rows', async () => {
      queries += 1
      return admin
        .from('nr01_responses')
        .select('assessment_id')
        .in(
          'assessment_id',
          assessments.map((a) => a.id),
        )
    }))
  }

  return { queries, steps, totalMs: steps.reduce((s, x) => s + x.ms, 0) }
}

/** Depois: getPageActor 1x (layout+page cache) + scope cache + skip license if module flag */
async function simulateAfterDashboard() {
  let queries = 0
  const steps = []

  // getPageActor once (StaffShell + page share cache — medimos 1x)
  steps.push(await timed('getPageActor (1x cached)', async () => {
    queries += 1
    return admin
      .from('profiles')
      .select('role, module_pentagrama, module_nr01, is_active, name')
      .eq('id', GERENCIA_ID)
      .maybeSingle()
  }))
  const profile = steps.at(-1).result.data
  const licensed = profile?.module_nr01 === true // sem query SR extra

  // loadContratanteOrgScope (cached): org + companies
  steps.push(await timed('contratanteScope org', async () => {
    queries += 1
    return admin
      .from('org_accounts')
      .select('id, name, owner_user_id, consultant_id')
      .eq('owner_user_id', GERENCIA_ID)
      .maybeSingle()
  }))
  const org = steps.at(-1).result.data
  steps.push(await timed('contratanteScope companies', async () => {
    queries += 1
    return admin.from('companies').select('id').eq('org_account_id', org.id)
  }))
  const companyIds = (steps.at(-1).result.data ?? []).map((c) => c.id)

  steps.push(await timed('assessments list', async () => {
    queries += 1
    return admin
      .from('nr01_assessments')
      .select('id, name, status, company_id')
      .in('company_id', companyIds)
      .order('created_at', { ascending: false })
  }))
  const assessments = steps.at(-1).result.data ?? []

  if (assessments.length) {
    steps.push(await timed('responses all rows', async () => {
      queries += 1
      return admin
        .from('nr01_responses')
        .select('assessment_id')
        .in(
          'assessment_id',
          assessments.map((a) => a.id),
        )
    }))
  }

  return { queries, steps, totalMs: steps.reduce((s, x) => s + x.ms, 0), licensed }
}

/** Antes: detalhe avaliação — auth triplicada + org duplicada */
async function simulateBeforeDetail(assessmentId) {
  let queries = 0
  const steps = []

  for (const label of ['StaffShell profile', 'getPageActor profile', 'loadOrgActorContext']) {
    steps.push(
      await timed(label, async () => {
        queries += 1
        return admin.from('org_accounts').select('id, name, owner_user_id, consultant_id').eq('owner_user_id', GERENCIA_ID).maybeSingle()
      }),
    )
  }
  // loadCompanyIdsForContratante — org DE NOVO
  steps.push(await timed('companyIds org (dup)', async () => {
    queries += 1
    return admin.from('org_accounts').select('id').eq('owner_user_id', GERENCIA_ID).maybeSingle()
  }))
  const org = steps.at(-1).result.data
  steps.push(await timed('companyIds companies', async () => {
    queries += 1
    return admin.from('companies').select('id').eq('org_account_id', org.id)
  }))
  const companyIds = (steps.at(-1).result.data ?? []).map((c) => c.id)

  steps.push(await timed('assessment + companies join', async () => {
    queries += 1
    const select = `*, companies:companies!nr01_assessments_company_id_fkey ( id, name )`
    return admin
      .from('nr01_assessments')
      .select(select)
      .eq('id', assessmentId)
      .in('company_id', companyIds)
      .maybeSingle()
  }))

  const parallel = await Promise.all([
    timed('results', async () => {
      queries += 1
      return admin.from('nr01_assessment_results').select('*').eq('assessment_id', assessmentId).maybeSingle()
    }),
    timed('scores', async () => {
      queries += 1
      return admin.from('nr01_dimension_scores').select('*').eq('assessment_id', assessmentId)
    }),
    timed('resp count', async () => {
      queries += 1
      return admin.from('nr01_responses').select('id', { count: 'exact', head: true }).eq('assessment_id', assessmentId)
    }),
    timed('evidence pack', async () => {
      queries += 1
      return admin.from('nr01_evidence_pack').select('id').eq('assessment_id', assessmentId).maybeSingle()
    }),
    timed('public tokens', async () => {
      queries += 1
      return admin.from('nr01_public_status_tokens').select('*').eq('assessment_id', assessmentId)
    }),
  ])
  steps.push(...parallel)

  return { queries, steps, totalMs: steps.reduce((s, x) => s + x.ms, 0) }
}

async function simulateAfterDetail(assessmentId) {
  let queries = 0
  const steps = []

  steps.push(await timed('getPageActor (1x cached)', async () => {
    queries += 1
    return admin.from('profiles').select('role, module_nr01, is_active, name').eq('id', GERENCIA_ID).maybeSingle()
  }))

  steps.push(await timed('contratanteScope org', async () => {
    queries += 1
    return admin
      .from('org_accounts')
      .select('id, name, owner_user_id, consultant_id')
      .eq('owner_user_id', GERENCIA_ID)
      .maybeSingle()
  }))
  const org = steps.at(-1).result.data
  steps.push(await timed('contratanteScope companies', async () => {
    queries += 1
    return admin.from('companies').select('id').eq('org_account_id', org.id)
  }))
  const companyIds = (steps.at(-1).result.data ?? []).map((c) => c.id)

  steps.push(await timed('assessment + companies join', async () => {
    queries += 1
    const select = `*, companies:companies!nr01_assessments_company_id_fkey ( id, name )`
    return admin
      .from('nr01_assessments')
      .select(select)
      .eq('id', assessmentId)
      .in('company_id', companyIds)
      .maybeSingle()
  }))

  const parallel = await Promise.all([
    timed('results', async () => {
      queries += 1
      return admin.from('nr01_assessment_results').select('*').eq('assessment_id', assessmentId).maybeSingle()
    }),
    timed('scores', async () => {
      queries += 1
      return admin.from('nr01_dimension_scores').select('*').eq('assessment_id', assessmentId)
    }),
    timed('resp count', async () => {
      queries += 1
      return admin.from('nr01_responses').select('id', { count: 'exact', head: true }).eq('assessment_id', assessmentId)
    }),
    timed('evidence pack', async () => {
      queries += 1
      return admin.from('nr01_evidence_pack').select('id').eq('assessment_id', assessmentId).maybeSingle()
    }),
    timed('public tokens', async () => {
      queries += 1
      return admin.from('nr01_public_status_tokens').select('*').eq('assessment_id', assessmentId)
    }),
  ])
  steps.push(...parallel)

  return { queries, steps, totalMs: steps.reduce((s, x) => s + x.ms, 0) }
}

const { data: sampleAssessment } = await admin
  .from('nr01_assessments')
  .select('id, name')
  .eq('company_id', (await admin.from('companies').select('id').eq('org_account_id', '6292eca3-7eaa-4270-a5ad-807caa17afd9').limit(1).single()).data.id)
  .limit(1)
  .maybeSingle()

const assessmentId = sampleAssessment?.id
console.log('=== Pasola contratante (gerencia) — benchmark Supabase ===\n')
console.log('Avaliação amostra:', sampleAssessment?.name ?? '—', assessmentId?.slice(0, 8) ?? '')

const runs = 3
const dashBefore = []
const dashAfter = []
const detBefore = []
const detAfter = []

for (let i = 0; i < runs; i++) {
  dashBefore.push(await simulateBeforeDashboard())
  dashAfter.push(await simulateAfterDashboard())
  if (assessmentId) {
    detBefore.push(await simulateBeforeDetail(assessmentId))
    detAfter.push(await simulateAfterDetail(assessmentId))
  }
}

function avg(arr, key) {
  return arr.reduce((s, x) => s + x[key], 0) / arr.length
}

function fmtMs(n) {
  return `${n.toFixed(0)} ms`
}

function pct(oldV, newV) {
  if (!oldV) return '—'
  return `${(((oldV - newV) / oldV) * 100).toFixed(0)}%`
}

console.log('\n--- /nr01/dashboard (média de', runs, 'runs) ---')
console.log('Queries Supabase  ANTES:', avg(dashBefore, 'queries').toFixed(1), '→ DEPOIS:', avg(dashAfter, 'queries').toFixed(1))
console.log('Tempo DB-only    ANTES:', fmtMs(avg(dashBefore, 'totalMs')), '→ DEPOIS:', fmtMs(avg(dashAfter, 'totalMs')), `(${pct(avg(dashBefore, 'totalMs'), avg(dashAfter, 'totalMs'))} menor)`)

if (assessmentId) {
  console.log('\n--- /nr01/avaliacao/[id] (média de', runs, 'runs) ---')
  console.log('Queries Supabase  ANTES:', avg(detBefore, 'queries').toFixed(1), '→ DEPOIS:', avg(detAfter, 'queries').toFixed(1))
  console.log('Tempo DB-only    ANTES:', fmtMs(avg(detBefore, 'totalMs')), '→ DEPOIS:', fmtMs(avg(detAfter, 'totalMs')), `(${pct(avg(detBefore, 'totalMs'), avg(detAfter, 'totalMs'))} menor)`)
}

console.log('\n--- Nota: tempo DB não inclui ---')
console.log('  • proxy auth (getUser + profile) ~1–2 RTT fixos por request')
console.log('  • cold start Vercel (0–800 ms 1º hit do dia)')
console.log('  • RSC serialize + TTFB rede BR→US')
