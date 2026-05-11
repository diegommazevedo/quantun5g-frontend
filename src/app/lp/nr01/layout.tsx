import type { Metadata } from 'next'

const base = process.env.NEXT_PUBLIC_APP_URL || 'https://quantum5g.vercel.app'

export const metadata: Metadata = {
  title: 'NR-01 na prática | Laudo, PDCA e pacote Trino | Quantum5G',
  description:
    'Diagnóstico de fatores de risco psicossociais (NR-01): coleta anônima, laudo técnico, plano PDCA, evidências com hashes e audit log imutável.',
  openGraph: {
    title: 'Quantum5G — NR-01',
    description: 'Conformidade com evidência: laudo, plano e pacote Trino.',
    url: `${base}/lp/nr01`,
    siteName: 'Quantum5G',
    locale: 'pt_BR',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Quantum5G — NR-01',
    description: 'Laudo técnico, plano PDCA e pacote Trino com trilha de auditoria.',
  },
}

export default function LpNr01Layout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen">{children}</div>
}
