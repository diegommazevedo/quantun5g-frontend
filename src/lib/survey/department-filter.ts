/**
 * Agregação e filtragem por departamento com amostra mínima / k-anonymity.
 */

export interface DepartmentResponseCount {
  departmentId: string | null
  departmentLabel: string
  count: number
  visible: boolean
}

export function aggregateDepartmentCounts(
  rows: { department_id: string | null; department_label: string | null }[],
  minSample: number,
): DepartmentResponseCount[] {
  const map = new Map<string, { label: string; count: number }>()
  for (const r of rows) {
    const key = r.department_id ?? '__none__'
    const label = r.department_label?.trim() || 'Sem departamento'
    const cur = map.get(key) ?? { label, count: 0 }
    cur.count += 1
    map.set(key, cur)
  }

  return [...map.entries()]
    .map(([departmentId, v]) => ({
      departmentId: departmentId === '__none__' ? null : departmentId,
      departmentLabel: v.label,
      count: v.count,
      visible: v.count >= minSample,
    }))
    .sort((a, b) => a.departmentLabel.localeCompare(b.departmentLabel, 'pt-BR'))
}

export function filterRowsByDepartmentId<T extends { department_id: string | null }>(
  rows: T[],
  departmentId: string | null | undefined,
): T[] {
  if (!departmentId) return rows
  return rows.filter((r) => r.department_id === departmentId)
}
