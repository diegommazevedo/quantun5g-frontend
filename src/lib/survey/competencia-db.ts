import { nextCompetenciaSeq, type SurveyModuleToken } from '@/lib/survey/competencia'

type SupabaseClient = Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>

export async function fetchNextCompetenciaSeq(
  supabase: SupabaseClient,
  companyId: string,
  module: SurveyModuleToken,
): Promise<number> {
  if (module === 'pentagrama') {
    const { data } = await supabase
      .from('diagnostics')
      .select('competencia_seq, name')
      .eq('company_id', companyId)

    const rows = (data ?? []) as Array<{ competencia_seq: number | null; name: string }>
    const seqs = rows.map((r) => r.competencia_seq).filter((n): n is number => n != null && n > 0)
    const names = rows.map((r) => r.name)
    return nextCompetenciaSeq(seqs, names)
  }

  const { data } = await supabase
    .from('nr01_assessments')
    .select('competencia_seq, name')
    .eq('company_id', companyId)

  const rows = (data ?? []) as Array<{ competencia_seq: number | null; name: string }>
  const seqs = rows.map((r) => r.competencia_seq).filter((n): n is number => n != null && n > 0)
  const names = rows.map((r) => r.name)
  return nextCompetenciaSeq(seqs, names)
}
