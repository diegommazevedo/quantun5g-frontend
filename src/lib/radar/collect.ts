/**
 * Radar Empresarial — coleta e materializa sinais contínuos.
 */

import type { SupabaseClient } from '@supabase/supabase-js'
import { createHash } from 'crypto'

export type RadarSource = 'pentagrama' | 'nr01' | 'pdca' | 'pulse' | 'system'

export interface RadarSignalInput {
  companyId: string | null
  orgAccountId?: string | null
  source: RadarSource
  kind: string
  severity: 1 | 2 | 3 | 4 | 5
  title: string
  message: string
  payload?: Record<string, unknown>
}

function fingerprint(input: RadarSignalInput): string {
  const raw = [
    input.companyId ?? '',
    input.source,
    input.kind,
    input.title,
    // bucket by day so same issue refreshes daily without spam
    new Date().toISOString().slice(0, 10),
  ].join('|')
  return createHash('sha256').update(raw).digest('hex').slice(0, 40)
}

/** Supabase tipa joins 1:1 como array — normaliza para objeto único. */
function one<T>(value: T | T[] | null | undefined): T | null {
  if (value == null) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export async function upsertRadarSignal(
  sb: SupabaseClient,
  input: RadarSignalInput,
): Promise<boolean> {
  const fp = fingerprint(input)
  const { error } = await sb.from('radar_signals').upsert(
    {
      company_id: input.companyId,
      org_account_id: input.orgAccountId ?? null,
      source: input.source,
      kind: input.kind,
      severity: input.severity,
      title: input.title,
      message: input.message,
      payload: input.payload ?? {},
      fingerprint: fp,
      detected_at: new Date().toISOString(),
    } as never,
    { onConflict: 'fingerprint' },
  )
  return !error
}

/** Varre PDCA atrasado, avaliações sem pulso recente e gaps simples. */
export async function collectRadarSignals(sb: SupabaseClient): Promise<{
  written: number
  errors: string[]
}> {
  let written = 0
  const errors: string[] = []
  const today = new Date()
  const todayIso = today.toISOString().slice(0, 10)

  // 1) Itens PDCA atrasados
  try {
    const { data: overdue } = await sb
      .from('nr01_action_items')
      .select(
        `
        id, title, due_date, status, owner_name,
        action_plan:nr01_action_plans!inner (
          assessment_id,
          assessment:nr01_assessments!inner ( id, name, company_id, status )
        )
      `,
      )
      .lt('due_date', todayIso)
      .not('status', 'in', '("done","completed","concluido","cancelled","cancelado")')
      .limit(200)

    for (const row of overdue ?? []) {
      const r = row as {
        id: string
        title: string
        due_date: string
        owner_name: string | null
        action_plan:
          | {
              assessment:
                | { id: string; name: string; company_id: string; status: string }
                | { id: string; name: string; company_id: string; status: string }[]
                | null
            }
          | {
              assessment:
                | { id: string; name: string; company_id: string; status: string }
                | { id: string; name: string; company_id: string; status: string }[]
                | null
            }[]
          | null
      }
      const plan = one(r.action_plan)
      const assessment = one(plan?.assessment)
      if (!assessment || assessment.status === 'ARQUIVADO') continue
      const days = Math.max(
        1,
        Math.floor((today.getTime() - new Date(r.due_date).getTime()) / 86400000),
      )
      const ok = await upsertRadarSignal(sb, {
        companyId: assessment.company_id,
        source: 'pdca',
        kind: 'action_overdue',
        severity: days >= 30 ? 5 : days >= 14 ? 4 : 3,
        title: `Ação atrasada: ${r.title}`,
        message: `${r.owner_name ?? 'Responsável'} — prazo ${r.due_date} (${days} dia(s) em atraso) na avaliação ${assessment.name}.`,
        payload: {
          action_item_id: r.id,
          assessment_id: assessment.id,
          days_overdue: days,
        },
      })
      if (ok) written++
    }
  } catch (e) {
    errors.push(`pdca: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 2) Monitoramento ativo sem disparo há > 10 dias
  try {
    const { data: configs } = await sb
      .from('nr01_pulse_config')
      .select('assessment_id, last_dispatched_at, enabled, assessment:nr01_assessments(id, name, company_id, status)')
      .eq('enabled', true)
      .limit(200)

    const tenDaysAgo = new Date(today.getTime() - 10 * 86400000)
    for (const cfg of configs ?? []) {
      const c = cfg as {
        assessment_id: string
        last_dispatched_at: string | null
        assessment:
          | { id: string; name: string; company_id: string; status: string }
          | { id: string; name: string; company_id: string; status: string }[]
          | null
      }
      const assessment = one(c.assessment)
      if (!assessment || assessment.status !== 'CONCLUIDO') continue
      const last = c.last_dispatched_at ? new Date(c.last_dispatched_at) : null
      if (last && last > tenDaysAgo) continue
      const ok = await upsertRadarSignal(sb, {
        companyId: assessment.company_id,
        source: 'pulse',
        kind: 'pulse_stale',
        severity: 3,
        title: 'Monitoramento NR-01 sem pulso recente',
        message: last
          ? `Último pulso em ${last.toISOString().slice(0, 10)} — ${assessment.name}.`
          : `Monitoramento ativo sem nenhum pulso disparado — ${assessment.name}.`,
        payload: { assessment_id: c.assessment_id },
      })
      if (ok) written++
    }
  } catch (e) {
    errors.push(`pulse: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 3) Avaliações CONCLUIDO com risco alto (se results existir)
  try {
    const { data: risky } = await sb
      .from('nr01_assessment_results')
      .select('assessment_id, iso_risk_level, iso_score, assessment:nr01_assessments(id, name, company_id, status)')
      .in('iso_risk_level', ['elevado', 'critico'])
      .limit(100)

    for (const row of risky ?? []) {
      const r = row as {
        assessment_id: string
        iso_risk_level: string
        iso_score: number | null
        assessment:
          | { id: string; name: string; company_id: string; status: string }
          | { id: string; name: string; company_id: string; status: string }[]
          | null
      }
      const assessment = one(r.assessment)
      if (!assessment || assessment.status === 'ARQUIVADO') continue
      const ok = await upsertRadarSignal(sb, {
        companyId: assessment.company_id,
        source: 'nr01',
        kind: 'iso_high_risk',
        severity: 5,
        title: `Risco ISO ${r.iso_risk_level}`,
        message: `${assessment.name}: score ISO ${r.iso_score ?? '—'} — acompanhe plano e pulsos.`,
        payload: { assessment_id: r.assessment_id, iso_risk_level: r.iso_risk_level },
      })
      if (ok) written++
    }
  } catch (e) {
    errors.push(`iso: ${e instanceof Error ? e.message : String(e)}`)
  }

  // 4) Diagnósticos Pentagrama abertos há > 21 dias sem relatório
  try {
    const cutoff = new Date(today.getTime() - 21 * 86400000).toISOString()
    const { data: staleDiags } = await sb
      .from('diagnostics')
      .select('id, name, status, company_id, created_at')
      .lt('created_at', cutoff)
      .not('status', 'in', '("RELATORIO_GERADO","ENCERRADO","ARQUIVADO")')
      .limit(100)

    for (const d of staleDiags ?? []) {
      const diag = d as {
        id: string
        name: string
        status: string
        company_id: string
        created_at: string
      }
      const days = Math.floor(
        (today.getTime() - new Date(diag.created_at).getTime()) / 86400000,
      )
      const ok = await upsertRadarSignal(sb, {
        companyId: diag.company_id,
        source: 'pentagrama',
        kind: 'diagnostic_stale',
        severity: 3,
        title: `Diagnóstico aberto há ${days} dias`,
        message: `${diag.name} ainda em ${diag.status} — finalize IL/IC ou encerre a coleta.`,
        payload: { diagnostic_id: diag.id, status: diag.status, days_open: days },
      })
      if (ok) written++
    }
  } catch (e) {
    errors.push(`pentagrama: ${e instanceof Error ? e.message : String(e)}`)
  }

  return { written, errors }
}

export function bulletsFromSignals(
  signals: Array<{ title: string; message: string; severity: number; company_name?: string }>,
): string[] {
  return signals
    .sort((a, b) => b.severity - a.severity)
    .slice(0, 5)
    .map((s) => {
      const co = s.company_name ? `[${s.company_name}] ` : ''
      return `${co}${s.title} — ${s.message}`
    })
}
