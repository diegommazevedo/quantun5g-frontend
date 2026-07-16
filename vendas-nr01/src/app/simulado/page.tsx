import Link from 'next/link'
import {
  isSimCheckoutReady,
  KIWIFY_SIM_CHECKOUT_URL,
  KIWIFY_SIM_PRODUCT_LABEL,
} from '@/constants/kiwify-sim-checkout'

const ACCENT = '#B8945A'
const BG = '#0B1A2F'

export const metadata = {
  title: 'Simulado Lead R$10 PIX · Quantum5G NR-01',
  description:
    'Teste o fluxo comercial completo: compra Kiwify, acesso automático, RT, coleta e laudo NR-01.',
}

export default function SimuladoPage() {
  const ready = isSimCheckoutReady()

  return (
    <div className="mx-auto max-w-2xl px-4 py-12 sm:py-16">
      <p className="text-center text-sm">
        <Link href="/" className="underline underline-offset-2 opacity-80" style={{ color: ACCENT }}>
          ← Voltar aos planos
        </Link>
      </p>

      <p className="mt-8 text-center text-xs font-semibold uppercase tracking-[0.2em] text-amber-300/90">
        Simulado 100% real
      </p>
      <h1 className="mt-3 text-center text-3xl font-bold">Lead de teste — R$ 10 no PIX</h1>
      <p className="mt-4 text-center text-sm leading-relaxed opacity-90">
        {KIWIFY_SIM_PRODUCT_LABEL}. Após o pagamento você recebe o magic link, cadastra o RT e o sistema
        abre a coleta NR-01 automaticamente.
      </p>

      <div className="mt-8 rounded-xl border border-white/15 bg-white/5 p-6 text-sm">
        <p className="font-semibold" style={{ color: ACCENT }}>
          Checklist do teste
        </p>
        <ol className="mt-3 list-decimal space-y-2 pl-5 opacity-95">
          <li>Clique no botão abaixo e pague R$ 10,00 via PIX</li>
          <li>Use e-mail real e CNPJ válido da sua empresa de teste</li>
          <li>Abra o magic link no e-mail (verifique spam)</li>
          <li>Conclua o wizard RT — cole e-mails de colaboradores se quiser convites automáticos</li>
          <li>Confirme coleta aberta e link em /nr01/avaliacao</li>
        </ol>
      </div>

      <div className="mt-8 text-center">
        {ready ? (
          <a
            href={KIWIFY_SIM_CHECKOUT_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[52px] min-w-[240px] items-center justify-center rounded-lg px-8 text-base font-bold"
            style={{ backgroundColor: ACCENT, color: BG }}
          >
            Pagar R$ 10 no PIX →
          </a>
        ) : (
          <p className="text-sm text-amber-200">Checkout ainda não configurado no ambiente.</p>
        )}
      </div>
    </div>
  )
}
