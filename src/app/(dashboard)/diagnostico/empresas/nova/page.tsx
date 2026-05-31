import { redirect } from 'next/navigation'

interface Props {
  searchParams: Promise<{ retorno?: string; error?: string }>
}

export default async function DiagnosticoEmpresasNovaRedirect({ searchParams }: Props) {
  const { retorno, error } = await searchParams
  const params = new URLSearchParams()
  if (retorno) params.set('retorno', retorno)
  if (error) params.set('error', error)
  const q = params.toString()
  redirect(q ? `/empresas/nova?${q}` : '/empresas/nova')
}
