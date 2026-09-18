/**
 * Datas de coleta NR-01 — interpreta YYYY-MM-DD no fuso America/Sao_Paulo.
 * Fecha no fim do dia (23:59:59.999) para o prazo "até DD/MM" fazer sentido.
 */

const TZ = 'America/Sao_Paulo'

/** Início do dia local (00:00:00) → ISO UTC. */
export function parseCollectionOpensAt(raw: string | null | undefined): string | null {
  const day = normalizeDay(raw)
  if (!day) return null
  return localWallTimeToUtcIso(day, 0, 0, 0, 0)
}

/** Fim do dia local (23:59:59.999) → ISO UTC. */
export function parseCollectionClosesAt(raw: string | null | undefined): string | null {
  const day = normalizeDay(raw)
  if (!day) return null
  return localWallTimeToUtcIso(day, 23, 59, 59, 999)
}

function normalizeDay(raw: string | null | undefined): string | null {
  if (!raw?.trim()) return null
  const s = raw.trim()
  // datetime-local: 2026-09-17T18:00 → usa o instante direto
  if (s.includes('T') && s.length > 10) {
    const d = new Date(s)
    return Number.isNaN(d.getTime()) ? null : d.toISOString()
  }
  // date-only: 2026-09-17
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const d = new Date(s)
  if (Number.isNaN(d.getTime())) return null
  // se veio como date ISO meia-noite UTC, trata como dia civil
  return d.toISOString().slice(0, 10)
}

/**
 * Converte data civil + horário em America/Sao_Paulo para ISO UTC.
 * Para datetime-local completo, normalizeDay já devolveu ISO — repasse.
 */
function localWallTimeToUtcIso(
  dayOrIso: string,
  hour: number,
  minute: number,
  second: number,
  ms: number,
): string {
  if (dayOrIso.includes('T')) return dayOrIso

  const [y, m, d] = dayOrIso.split('-').map(Number)
  // Estimativa: SP é UTC-3 (sem DST desde 2019). Suficiente para prazos de coleta.
  const utc = Date.UTC(y!, m! - 1, d!, hour + 3, minute, second, ms)
  return new Date(utc).toISOString()
}

export function formatCollectionDeadlinePt(iso: string | null | undefined): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('pt-BR', {
    timeZone: TZ,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}
