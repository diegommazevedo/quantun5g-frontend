import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'NR-01 | Planos e assinatura | Quantum5G',
  description:
    'Assinatura anual NR-01: laudos certificados, PDCA, evidências e opção de RT Jovane Borlini com Pentagrama de Ginger precursor.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen antialiased">{children}</body>
    </html>
  )
}
