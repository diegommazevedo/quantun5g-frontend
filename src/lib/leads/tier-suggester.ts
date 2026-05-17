/**
 * Tier sugerido a partir do número de colaboradores (alinhado à calculadora LP).
 */
export function inferTierFromHeadcount(collaborators: number): string {
  const n = Math.min(5000, Math.max(1, Math.round(collaborators)))
  if (n <= 19) return 'Essencial'
  if (n <= 99) return 'Operacional'
  if (n <= 499) return 'Estruturado'
  return 'Corporativo'
}
