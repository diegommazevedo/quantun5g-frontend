/**
 * Tokenização de competência e nome de rodada (Pentagrama / NR-01).
 *
 * Padrões:
 *   competencia_label → "Q1 - 05/2026"
 *   survey_name       → "Q1 PENTAGRAMA 05/2026" | "Q1 NR01 05/2026"
 */

export type SurveyModuleToken = 'pentagrama' | 'nr01'

const MODULE_NAME: Record<SurveyModuleToken, string> = {
  pentagrama: 'PENTAGRAMA',
  nr01: 'NR01',
}

export interface CompetenciaParts {
  seq: number
  month: number
  year: number
}

export interface CompetenciaResolved extends CompetenciaParts {
  label: string
  surveyName: string
  periodMmYyyy: string
}

export function pad2(n: number): string {
  return String(n).padStart(2, '0')
}

export function formatPeriodMmYyyy(month: number, year: number): string {
  return `${pad2(month)}/${year}`
}

export function formatCompetenciaLabel(seq: number, month: number, year: number): string {
  return `Q${seq} - ${formatPeriodMmYyyy(month, year)}`
}

export function formatSurveyName(module: SurveyModuleToken, seq: number, month: number, year: number): string {
  return `Q${seq} ${MODULE_NAME[module]} ${formatPeriodMmYyyy(month, year)}`
}

export function resolveCompetencia(
  module: SurveyModuleToken,
  seq: number,
  month: number,
  year: number,
): CompetenciaResolved {
  return {
    seq,
    month,
    year,
    periodMmYyyy: formatPeriodMmYyyy(month, year),
    label: formatCompetenciaLabel(seq, month, year),
    surveyName: formatSurveyName(module, seq, month, year),
  }
}

/** Extrai maior Q{n} de nomes legados. */
export function maxSeqFromSurveyNames(names: string[]): number {
  let max = 0
  for (const name of names) {
    const m = name.trim().match(/^Q(\d+)\b/i)
    if (m) max = Math.max(max, parseInt(m[1], 10))
  }
  return max
}

export function nextCompetenciaSeq(existingSeqs: number[], existingNames: string[]): number {
  const fromCol = existingSeqs.length > 0 ? Math.max(...existingSeqs) : 0
  const fromNames = maxSeqFromSurveyNames(existingNames)
  return Math.max(fromCol, fromNames) + 1
}

export function parsePeriodMmYyyy(raw: string): { month: number; year: number } | null {
  const t = raw.trim()
  const m = t.match(/^(\d{2})\/(\d{4})$/)
  if (!m) return null
  const month = parseInt(m[1], 10)
  const year = parseInt(m[2], 10)
  if (month < 1 || month > 12 || year < 2020 || year > 2100) return null
  return { month, year }
}

export function formatPeriodInput(raw: string): string {
  const digits = raw.replace(/\D/g, '').slice(0, 6)
  if (digits.length <= 2) return digits
  return `${digits.slice(0, 2)}/${digits.slice(2)}`
}

export function localDateISO(date = new Date()): string {
  const y = date.getFullYear()
  const m = pad2(date.getMonth() + 1)
  const d = pad2(date.getDate())
  return `${y}-${m}-${d}`
}

export function addDaysISO(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() + days)
  return localDateISO(dt)
}

export function defaultCompetenciaPeriod(date = new Date()): { month: number; year: number; mmYyyy: string } {
  const month = date.getMonth() + 1
  const year = date.getFullYear()
  return { month, year, mmYyyy: formatPeriodMmYyyy(month, year) }
}

export function parseCompetenciaForm(formData: FormData, module: SurveyModuleToken): CompetenciaResolved | string {
  const seqRaw = parseInt(String(formData.get('competencia_seq') ?? ''), 10)
  const periodRaw = String(formData.get('competencia_period') ?? '').trim()
  const period = parsePeriodMmYyyy(periodRaw)

  if (!Number.isFinite(seqRaw) || seqRaw < 1 || seqRaw > 999) {
    return 'Competência inválida (sequência Q).'
  }
  if (!period) {
    return 'Informe a competência no formato MM/AAAA (ex.: 05/2026).'
  }

  return resolveCompetencia(module, seqRaw, period.month, period.year)
}

export function assertSurveyNameMatches(
  module: SurveyModuleToken,
  submittedName: string,
  resolved: CompetenciaResolved,
): string | null {
  const expected = resolved.surveyName
  if (submittedName.trim() !== expected) {
    return `Nome da rodada deve ser "${expected}". Recarregue a página e tente novamente.`
  }
  return null
}
