/** Escala Likert 1–5 — Pentagrama de Ginger (IL e IC). */
export const PENTAGRAMA_LIKERT_SCALE = [
  { value: 1, lines: ['Discordo', 'totalmente'] },
  { value: 2, lines: ['Discordo', 'parcialmente'] },
  { value: 3, lines: ['Neutro'] },
  { value: 4, lines: ['Concordo', 'parcialmente'] },
  { value: 5, lines: ['Concordo', 'totalmente'] },
] as const

export const PENTAGRAMA_LIKERT_VALUES = PENTAGRAMA_LIKERT_SCALE.map((s) => s.value)
