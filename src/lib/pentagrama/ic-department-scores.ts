/**
 * Scores IC agregados por departamento (mesmo motor do calculate_diagnostic).
 * Respeita amostra mínima para exibir percentuais (k-anonimato).
 */

export type DimKey = 'fisica' | 'afetiva' | 'racional' | 'social' | 'cultural'

export const DIM_KEYS: DimKey[] = ['fisica', 'afetiva', 'racional', 'social', 'cultural']

export const DIM_LABELS: Record<DimKey, string> = {
  fisica: 'Física',
  afetiva: 'Afetiva',
  racional: 'Racional',
  social: 'Social',
  cultural: 'Cultural',
}

const QUESTOES_POR_DIM: Record<DimKey, number[]> = {
  fisica: Array.from({ length: 25 }, (_, i) => i + 1),
  afetiva: Array.from({ length: 25 }, (_, i) => i + 26),
  racional: Array.from({ length: 25 }, (_, i) => i + 51),
  social: Array.from({ length: 25 }, (_, i) => i + 76),
  cultural: Array.from({ length: 25 }, (_, i) => i + 101),
}

const MAX_DIM = 25 * 5 // Likert 1–5

export type IcResponseRow = Record<string, unknown> & {
  department_id: string | null
  department_label: string | null
}

export interface DepartmentIcScore {
  departmentId: string | null
  departmentLabel: string
  n: number
  /** false quando N < minSample — scores ocultos por confidencialidade */
  scoresVisible: boolean
  /** true quando  minSample <= N < 3 — leitura indicativa */
  indicative: boolean
  fisica: number | null
  afetiva: number | null
  racional: number | null
  social: number | null
  cultural: number | null
  global: number | null
  nivel: 'critico' | 'vulneravel' | 'saudavel' | 'excelente' | 'sem_dados'
}

export interface DepartmentIcSummary {
  departments: DepartmentIcScore[]
  commentary: string
  minSample: number
  hasAnyScores: boolean
}

function qVal(row: Record<string, unknown>, n: number): number | null {
  const v = row[`q${n}`]
  if (v === null || v === undefined) return null
  const num = Number(v)
  return Number.isNaN(num) ? null : num
}

function r1(v: number): number {
  return Math.round(v * 10) / 10
}

function nivelFromPct(pct: number | null): DepartmentIcScore['nivel'] {
  if (pct === null) return 'sem_dados'
  if (pct < 40) return 'critico'
  if (pct < 60) return 'vulneravel'
  if (pct < 80) return 'saudavel'
  return 'excelente'
}

function scoreGroup(rows: IcResponseRow[]): Omit<
  DepartmentIcScore,
  'departmentId' | 'departmentLabel' | 'n' | 'scoresVisible' | 'indicative'
> {
  if (rows.length === 0) {
    return {
      fisica: null,
      afetiva: null,
      racional: null,
      social: null,
      cultural: null,
      global: null,
      nivel: 'sem_dados',
    }
  }

  const medias: Record<number, number | null> = {}
  for (let q = 1; q <= 125; q++) {
    const vals = rows.map((r) => qVal(r, q)).filter((v): v is number => v !== null)
    medias[q] = vals.length > 0 ? vals.reduce((a, b) => a + b, 0) / vals.length : null
  }

  const dims = {} as Record<DimKey, number | null>
  for (const dim of DIM_KEYS) {
    const vals = QUESTOES_POR_DIM[dim]
      .map((q) => medias[q])
      .filter((v): v is number => v !== null)
    dims[dim] = vals.length > 0 ? r1((vals.reduce((a, b) => a + b, 0) / MAX_DIM) * 100) : null
  }

  const present = DIM_KEYS.map((d) => dims[d]).filter((v): v is number => v !== null)
  const global = present.length ? r1(present.reduce((a, b) => a + b, 0) / present.length) : null

  return { ...dims, global, nivel: nivelFromPct(global) }
}

/** Amostra mínima para exibir % (padrão 2 — N=1 fica oculto). */
export function summarizeIcByDepartment(
  rows: IcResponseRow[],
  opts?: { minSample?: number },
): DepartmentIcSummary {
  const minSample = opts?.minSample ?? 2
  const map = new Map<string, { label: string; rows: IcResponseRow[] }>()

  for (const r of rows) {
    const key = r.department_id ?? `__label:${(r.department_label ?? '').trim() || 'none'}`
    const label = r.department_label?.trim() || 'Sem departamento'
    const cur = map.get(key) ?? { label, rows: [] }
    cur.rows.push(r)
    map.set(key, cur)
  }

  const departments: DepartmentIcScore[] = [...map.entries()]
    .map(([key, v]) => {
      const scored = scoreGroup(v.rows)
      const scoresVisible = v.rows.length >= minSample
      return {
        departmentId: key.startsWith('__label:') ? null : key,
        departmentLabel: v.label,
        n: v.rows.length,
        scoresVisible,
        indicative: scoresVisible && v.rows.length < 3,
        fisica: scoresVisible ? scored.fisica : null,
        afetiva: scoresVisible ? scored.afetiva : null,
        racional: scoresVisible ? scored.racional : null,
        social: scoresVisible ? scored.social : null,
        cultural: scoresVisible ? scored.cultural : null,
        global: scoresVisible ? scored.global : null,
        nivel: scoresVisible ? scored.nivel : ('sem_dados' as const),
      }
    })
    .sort((a, b) => {
      if (a.scoresVisible !== b.scoresVisible) return a.scoresVisible ? -1 : 1
      const ga = a.global ?? -1
      const gb = b.global ?? -1
      if (ga !== gb) return gb - ga
      return a.departmentLabel.localeCompare(b.departmentLabel, 'pt-BR')
    })

  return {
    departments,
    commentary: buildDepartmentCommentary(departments, minSample),
    minSample,
    hasAnyScores: departments.some((d) => d.scoresVisible),
  }
}

function buildDepartmentCommentary(depts: DepartmentIcScore[], minSample: number): string {
  const visible = depts.filter((d) => d.scoresVisible && d.global !== null)
  const hidden = depts.filter((d) => !d.scoresVisible)

  if (depts.length === 0) {
    return 'Não há respostas IC vinculadas a departamentos neste diagnóstico.'
  }

  if (visible.length === 0) {
    const names = depts.map((d) => `${d.departmentLabel} (N=${d.n})`).join(', ')
    return (
      `Há respostas em ${depts.length} departamento(s) — ${names}. ` +
      `Nenhum atingiu a amostra mínima de ${minSample} para exibir scores com segurança ` +
      `(confidencialidade / leitura estável). A leitura permanece no agregado da empresa.`
    )
  }

  const parts: string[] = []

  if (visible.length === 1) {
    const d = visible[0]!
    parts.push(
      `${d.departmentLabel} (N=${d.n}) é o único departamento com amostra suficiente para leitura` +
        `${d.indicative ? ' indicativa' : ''}: IC global ${Math.round(d.global!)}% (${labelNivel(d.nivel)}).`,
    )
  } else {
    const sorted = [...visible].sort((a, b) => (b.global ?? 0) - (a.global ?? 0))
    const top = sorted[0]!
    const bottom = sorted[sorted.length - 1]!
    const spread = (top.global ?? 0) - (bottom.global ?? 0)

    if (spread < 3) {
      parts.push(
        `Os departamentos com amostra suficiente apresentam perfil homogêneo ` +
          `(IC global entre ${Math.round(bottom.global!)}% e ${Math.round(top.global!)}%, variação < 3pp).`,
      )
    } else {
      parts.push(
        `${top.departmentLabel} lidera o IC global (${Math.round(top.global!)}%, N=${top.n}); ` +
          `${bottom.departmentLabel} fica abaixo (${Math.round(bottom.global!)}%, N=${bottom.n}) — ` +
          `diferença de ${Math.round(spread)}pp.`,
      )
    }

    // Dimensão com maior contraste entre depts
    let maxGap = 0
    let gapDim: DimKey | null = null
    let gapHi: DepartmentIcScore | null = null
    let gapLo: DepartmentIcScore | null = null
    for (const dim of DIM_KEYS) {
      const withVal = visible.filter((d) => d[dim] !== null)
      if (withVal.length < 2) continue
      const hi = withVal.reduce((a, b) => ((a[dim] ?? 0) >= (b[dim] ?? 0) ? a : b))
      const lo = withVal.reduce((a, b) => ((a[dim] ?? 0) <= (b[dim] ?? 0) ? a : b))
      const gap = (hi[dim] ?? 0) - (lo[dim] ?? 0)
      if (gap > maxGap) {
        maxGap = gap
        gapDim = dim
        gapHi = hi
        gapLo = lo
      }
    }
    if (gapDim && gapHi && gapLo && maxGap >= 5) {
      parts.push(
        `Maior contraste na dimensão ${DIM_LABELS[gapDim]}: ` +
          `${gapHi.departmentLabel} ${Math.round(gapHi[gapDim]!)}% vs ` +
          `${gapLo.departmentLabel} ${Math.round(gapLo[gapDim]!)}% (${Math.round(maxGap)}pp).`,
      )
    }
  }

  if (visible.some((d) => d.indicative)) {
    parts.push(
      `Departamentos com N < 3 entram como leitura indicativa (não substituem o agregado da empresa).`,
    )
  }

  if (hidden.length > 0) {
    parts.push(
      `Scores ocultos por confidencialidade (N < ${minSample}): ` +
        `${hidden.map((d) => `${d.departmentLabel} (N=${d.n})`).join(', ')}.`,
    )
  }

  return parts.join(' ')
}

function labelNivel(n: DepartmentIcScore['nivel']): string {
  const map = {
    critico: 'Crítico',
    vulneravel: 'Vulnerável',
    saudavel: 'Saudável',
    excelente: 'Excelente',
    sem_dados: 'Sem dados',
  }
  return map[n]
}

/** Colunas q1–q125 + dept para select Supabase. */
export function icResponseSelectWithQuestions(): string {
  const qs = Array.from({ length: 125 }, (_, i) => `q${i + 1}`).join(',')
  return `department_id, department_label, ${qs}`
}
