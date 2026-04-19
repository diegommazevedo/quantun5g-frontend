/**
 * QUANTUM5G — NR-01 · Laudo técnico (visualização print)
 *
 * Renderiza o mesmo HTML que o PDF gera. Útil para o consultor revisar
 * antes de baixar o PDF, e como fallback (Ctrl+P) se o Playwright falhar.
 *
 * Layout sem chrome do app: nada de header/sidebar — só o documento.
 */

import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { loadLaudoData } from '@/lib/nr01/pdf-data'
import { buildLaudoHtml } from '@/lib/nr01/pdf-template'

interface Props {
  params: Promise<{ id: string }>
}

export default async function LaudoPrintPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const data = await loadLaudoData(supabase, id)
  if (!data) notFound()

  const html = buildLaudoHtml(data)

  // Render do HTML completo via dangerouslySetInnerHTML em document raiz não
  // funciona no App Router. Usamos um iframe srcDoc que isola o CSS print.
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#f5f5f5' }}>
      <iframe
        srcDoc={html}
        style={{ width: '100%', height: '100%', border: 'none', background: '#fff' }}
        title="Laudo técnico NR-01"
      />
    </div>
  )
}
