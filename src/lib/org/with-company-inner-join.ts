/**
 * PostgREST: inner join em companies para filtrar por org_account_id no mesmo SELECT.
 */

export function withCompanyInnerJoin(
  select: string,
  fkName: 'nr01_assessments_company_id_fkey' | 'diagnostics_company_id_fkey',
): string {
  const innerMarker = `companies!${fkName}!inner`
  if (select.includes('!inner')) return select

  const aliased = `companies:companies!${fkName} (`
  if (select.includes(aliased)) {
    return select.replace(aliased, `companies:companies!${innerMarker} (`)
  }

  const short = `companies!${fkName} (`
  if (select.includes(short)) {
    return select.replace(short, `companies!${innerMarker} (`)
  }

  if (/companies\s*\(/.test(select) && !select.includes('companies!')) {
    return select.replace(/companies\s*\(/, `companies:companies!${innerMarker} (`)
  }

  return `${select}, companies:companies!${innerMarker}(org_account_id)`
}
