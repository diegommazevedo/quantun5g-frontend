import Link from 'next/link'
import { Calculator } from '@/components/lp/Calculator'
import { ContentLibrary } from '@/components/lp/ContentLibrary'
import { FAQ } from '@/components/lp/FAQ'
import { FinalCTA } from '@/components/lp/FinalCTA'
import { Hero } from '@/components/lp/Hero'
import { JovaneManifesto } from '@/components/lp/JovaneManifesto'
import { QualificationWizard } from '@/components/lp/QualificationWizard'
import { Methodology5Pillars } from '@/components/lp/Methodology5Pillars'
import { PackageTrino } from '@/components/lp/PackageTrino'
import { PricingTiers } from '@/components/lp/PricingTiers'
import { RegulatoryContext } from '@/components/lp/RegulatoryContext'
import { RegulatoryCountdown } from '@/components/lp/RegulatoryCountdown'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export default function LpNr01Page() {
  return (
    <>
      <Hero />
      <RegulatoryCountdown />
      <RegulatoryContext />
      <JovaneManifesto />
      <Methodology5Pillars />
      <PackageTrino />
      <ContentLibrary />
      <PricingTiers />
      <Calculator />
      <QualificationWizard />
      <FAQ />
      <FinalCTA />
      <footer className="border-t border-white/10 px-4 py-10 text-center text-xs sm:text-sm" style={{ backgroundColor: BG, color: TEXT }}>
        <p className="opacity-80">Quantum5G · Pentagrama de Ginger + módulo NR-01</p>
        <nav className="mt-4 flex flex-wrap justify-center gap-x-6 gap-y-2">
          <Link href="/institucional" className="underline underline-offset-2" style={{ color: ACCENT }}>
            Institucional
          </Link>
          <Link href="/lp/nr01/calculadora" className="underline underline-offset-2" style={{ color: ACCENT }}>
            Calculadora
          </Link>
          <Link href="/termos" className="underline underline-offset-2" style={{ color: ACCENT }}>
            Termos
          </Link>
          <Link href="/privacidade" className="underline underline-offset-2" style={{ color: ACCENT }}>
            Privacidade
          </Link>
        </nav>
        <p className="mx-auto mt-4 max-w-xl opacity-70">
          Material informativo. Para proposta vinculante, fale com o comercial. Guia PDF e calculadora detalhada
          disponíveis nesta mesma área de produto.
        </p>
      </footer>
    </>
  )
}
