/**
 * QUANTUM5G — /relatorio/[id]/agente
 * O agente agora vive no painel lateral direito — redireciona para o relatório.
 */

import { redirect } from 'next/navigation'

interface Props {
  params: Promise<{ id: string }>
}

export default async function AgentePage({ params }: Props) {
  const { id } = await params
  redirect(`/relatorio/${id}`)
}
