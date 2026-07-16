import { PricingGrid } from '@/components/PricingGrid'
import { SimLeadBanner } from '@/components/SimLeadBanner'
import { RT_NOTICE } from '@/constants/plans'
import { checkoutOrigin } from '@/lib/checkout-url'

const ACCENT = '#B8945A'
const TEXT = '#F5F1EA'

export default function VendasPage() {
  const checkoutBase = checkoutOrigin()

  return (
    <>
      <header className="border-b border-white/10 px-4 py-10 sm:py-14">
        <div className="mx-auto max-w-4xl text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em]" style={{ color: ACCENT }}>
            Quantum5G · NR-01
          </p>
          <h1 className="mt-3 text-3xl font-bold leading-tight sm:text-4xl md:text-5xl">
            Conformidade psicossocial com laudo certificado e trilha de evidências
          </h1>
          <p className="mx-auto mt-4 max-w-2xl text-sm leading-relaxed opacity-90 sm:text-base">
            Escolha o plano pela faixa de colaboradores. Contratação digital com preço público anual.
            A partir do botão <strong>Assinar plano</strong>, o pagamento e o acesso são processados em{' '}
            <span className="underline underline-offset-2" style={{ color: ACCENT }}>
              {checkoutBase}
            </span>
            .
          </p>
        </div>
      </header>

      <main className="px-4 py-12 sm:py-16">
        <SimLeadBanner />
        <PricingGrid />

        <aside
          className="mx-auto mt-12 max-w-3xl rounded-xl border border-white/15 bg-white/5 p-6 text-sm leading-relaxed opacity-95"
          role="note"
        >
          <p className="font-semibold" style={{ color: ACCENT }}>
            Responsável técnico do laudo
          </p>
          <p className="mt-2">{RT_NOTICE}</p>
          <p className="mt-4 text-xs opacity-75">
            Material informativo. Não substitui assessoria jurídica ou médica do trabalho. Vigência
            regulatória conforme NR-01/GRO.
          </p>
        </aside>
      </main>

      <footer className="border-t border-white/10 px-4 py-8 text-center text-xs opacity-70">
        <p className="font-medium opacity-90">Links diretos por plano (campanhas)</p>
        <nav className="mt-3 flex flex-wrap justify-center gap-x-4 gap-y-2">
          <a href="/plano/essencial" className="underline" style={{ color: ACCENT }}>
            Essencial
          </a>
          <a href="/plano/operacional" className="underline" style={{ color: ACCENT }}>
            Operacional
          </a>
          <a href="/plano/estruturado" className="underline" style={{ color: ACCENT }}>
            Estruturado
          </a>
          <a href="/simulado" className="underline" style={{ color: ACCENT }}>
            Simulado R$10
          </a>
          <span className="opacity-50">·</span>
          <a href="/e" className="underline opacity-80">
            /e
          </a>
          <a href="/o" className="underline opacity-80">
            /o
          </a>
          <a href="/s" className="underline opacity-80">
            /s
          </a>
        </nav>
        <p className="mt-4">© Quantum5G · Pentagrama de Ginger + módulo NR-01</p>
        <p className="mt-2">
          Checkout:{' '}
          <a href={checkoutBase} className="underline" style={{ color: ACCENT }}>
            {checkoutBase}
          </a>
        </p>
      </footer>
    </>
  )
}
