/**
 * Tier sugerido a partir do número de colaboradores (alinhado à calculadora LP).
 */
export function inferTierFromHeadcount(collaborators: number): string {
  const n = Math.min(5000, Math.max(1, Math.round(collaborators)))
  if (n <= 150) return 'Essencial'
  if (n <= 800) return 'Profissional'
  if (n <= 2500) return 'Enterprise'
  return 'Enterprise+'
}
