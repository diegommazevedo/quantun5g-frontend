import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
  searchParams: Promise<{ retorno?: string; error?: string }>
}

export default async function Nr01EmpresasEditRedirect({ params, searchParams }: Props) {
  const { id } = await params
  const { retorno, error } = await searchParams
  const url = new URLSearchParams()
  if (retorno) url.set('retorno', retorno)
  if (error) url.set('error', error)
  const q = url.toString()
  redirect(q ? `/empresas/${id}?${q}` : `/empresas/${id}`)
}
