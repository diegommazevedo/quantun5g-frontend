'use client'

/**
 * Wrapper client-side para o AgentePanel com ssr: false.
 * Necessário porque dynamic({ ssr: false }) não pode ficar
 * em Server Components — precisa de um Client Component intermediário.
 */

import dynamic from 'next/dynamic'

const Panel = dynamic(
  () => import('./AgentePanel').then(m => ({ default: m.AgentePanel })),
  { ssr: false, loading: () => <div className="w-12 border-l border-zinc-200 bg-white shrink-0" /> }
)

export function AgentePanelDynamic() {
  return <Panel />
}
