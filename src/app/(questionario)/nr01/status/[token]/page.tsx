/**
 * QUANTUM5G — NR-01 · Tela pública de status de conformidade
 *
 * Acesso por token (sem login). 5 itens em semáforo.
 * Anti-fantoche: Diego, P5.
 *
 * Identidade visual: do cliente, não do produto. Quantum 5G só no rodapé.
 */

import { headers } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { loadLaudoData } from '@/lib/nr01/pdf-data'
import { computePublicStatus } from '@/lib/nr01/status'
import { hashIp } from '@/lib/nr01/evidence'
import type { Nr01PublicStatusToken, StatusColor } from '@/types/nr01'
import { registerAccess } from './actions'

interface Props {
  params: Promise<{ token: string }>
}

const COLOR_BADGE: Record<StatusColor, string> = {
  verde:    'bg-emerald-100 text-emerald-800 border-emerald-300',
  amarelo:  'bg-yellow-50 text-yellow-900 border-yellow-300',
  vermelho: 'bg-red-50 text-red-800 border-red-300',
  cinza:    'bg-zinc-100 text-zinc-700 border-zinc-300',
}

const COLOR_ICON: Record<StatusColor, string> = {
  verde:    '●',
  amarelo:  '●',
  vermelho: '●',
  cinza:    '○',
}

const COLOR_ICON_CLS: Record<StatusColor, string> = {
  verde:    'text-emerald-600',
  amarelo:  'text-yellow-500',
  vermelho: 'text-red-600',
  cinza:    'text-zinc-400',
}

function InvalidPage() {
  return (
    <main className="min-h-screen bg-zinc-50 px-6 py-16">
      <div className="mx-auto max-w-lg rounded-xl border border-zinc-200 bg-white p-8 text-center">
        <h1 className="font-serif text-xl text-zinc-900">Link inválido ou expirado</h1>
        <p className="mt-3 text-sm text-zinc-600">
          Este link não está mais ativo. Contate seu responsável técnico
          para solicitar um novo acesso.
        </p>
      </div>
    </main>
  )
}

export default async function PublicStatusPage({ params }: Props) {
  const { token } = await params
  const supabase = await createClient()

  const { data: tokenData } = await supabase
    .from('nr01_public_status_tokens')
    .select('*')
    .eq('token', token)
    .is('revoked_at', null)
    .maybeSingle()

  if (!tokenData) return <InvalidPage />
  const t = tokenData as Nr01PublicStatusToken

  const data = await loadLaudoData(supabase, t.assessment_id)
  if (!data) return <InvalidPage />

  const status = computePublicStatus(data)

  // Registra acesso (best-effort, não bloqueia renderização)
  const headerStore = await headers()
  const fwd = headerStore.get('x-forwarded-for')
  const ip = fwd?.split(',')[0]?.trim() ?? null
  const ua = headerStore.get('user-agent') ?? null
  const isBot = !!ua && /(bot|crawl|spider|fetch|curl|wget)/i.test(ua)

  if (!isBot) {
    // Non-blocking audit. registerAccess é Server Action — roda em background via Promise não-awaited seria ideal,
    // mas em Server Components é seguro awaitar desde que seja rápido.
    await registerAccess({
      tokenId: t.id,
      assessmentId: t.assessment_id,
      ipHash: hashIp(ip, t.assessment_id),
      userAgent: ua ?? null,
    })
  }

  const company = data.assessment.companies?.name ?? 'Empresa'

  return (
    <main className="min-h-screen bg-white px-6 py-12">
      <div className="mx-auto max-w-2xl">
        {/* Header sóbrio */}
        <header className="border-b border-zinc-300 pb-6">
          <h1 className="font-serif text-3xl leading-tight text-zinc-900">
            {company}
          </h1>
          <p className="mt-2 text-sm uppercase tracking-widest text-zinc-500">
            Status de conformidade NR-01 / GRO
          </p>
        </header>

        {/* Frase de próxima ação */}
        <section className="mt-8 rounded-lg border-l-4 border-zinc-900 bg-zinc-50 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Foco agora
          </p>
          <p className="mt-2 font-serif text-lg leading-snug text-zinc-900">
            {status.next_action}
          </p>
          {status.next_action_due_date && (
            <p className="mt-2 text-xs text-zinc-500">
              Prazo de referência: {new Date(status.next_action_due_date).toLocaleDateString('pt-BR')}
            </p>
          )}
        </section>

        {/* 5 itens */}
        <section className="mt-8">
          <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-zinc-500">
            Itens de conformidade
          </p>
          <ul className="space-y-3">
            {status.items.map((it) => (
              <li
                key={it.key}
                className={`rounded-lg border px-4 py-3 ${COLOR_BADGE[it.color]}`}
              >
                <div className="flex items-start gap-3">
                  <span className={`pt-0.5 text-xl leading-none ${COLOR_ICON_CLS[it.color]}`}>
                    {COLOR_ICON[it.color]}
                  </span>
                  <div className="flex-1">
                    <p className="font-semibold">{it.label}</p>
                    <p className="mt-0.5 text-sm opacity-90">{it.caption}</p>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </section>

        {/* Documentação técnica */}
        <section className="mt-10 border-t border-zinc-200 pt-6 text-sm text-zinc-600">
          <p>
            Documentação técnica NR-01:{' '}
            {status.has_pdf_available ? (
              <a
                href={`/api/nr01/status/${t.token}/pdf`}
                className="text-zinc-900 underline hover:text-zinc-700"
              >
                baixar laudo técnico (PDF)
              </a>
            ) : (
              <span className="text-zinc-400">aguardando emissão do laudo técnico</span>
            )}
          </p>
        </section>

        {/* Footer discreto */}
        <footer className="mt-16 border-t border-zinc-200 pt-6 text-xs text-zinc-400">
          <p>
            Portal mantido pela equipe técnica NR-01 da empresa · Sistema por{' '}
            <span className="text-zinc-500">Quantum 5G</span>
          </p>
        </footer>
      </div>
    </main>
  )
}
