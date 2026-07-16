import Link from 'next/link'
import {
  isSimCheckoutReady,
  KIWIFY_SIM_CHECKOUT_URL,
  KIWIFY_SIM_PRODUCT_LABEL,
} from '@/constants/kiwify-sim-checkout'

const BG = '#0B1A2F'
const ACCENT = '#B8945A'

export function SimLeadBanner() {
  const ready = isSimCheckoutReady()

  return (
    <section className="mx-auto mb-10 max-w-3xl rounded-2xl border-2 border-dashed border-amber-400/60 bg-amber-950/30 p-6 sm:p-8">
      <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300/90">
        Simulado 100% real · ambiente de teste
      </p>
      <h2 className="mt-2 text-xl font-bold text-white sm:text-2xl">
        Percorra o fluxo completo como lead — R$ 10,00 no PIX
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-amber-100/90">
        Plano completo NR-01 (faixa até 5 colaboradores): compra real na Kiwify, webhook, magic link,
        cadastro de RT, coleta automática e laudo ao atingir k≥5. Use um e-mail que você controla e
        informe um CNPJ válido no checkout.
      </p>

      <ul className="mt-4 space-y-1.5 text-sm text-amber-50/85">
        <li>✓ Pagamento PIX R$ 10,00 (produto de teste)</li>
        <li>✓ Licença NR-01 ativada automaticamente</li>
        <li>✓ Mesmo fluxo de produção (sem modo teste)</li>
      </ul>

      {ready ? (
        <a
          href={KIWIFY_SIM_CHECKOUT_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-6 inline-flex min-h-[48px] w-full items-center justify-center rounded-lg px-4 text-center text-sm font-bold transition hover:opacity-95 sm:w-auto"
          style={{ backgroundColor: ACCENT, color: BG }}
        >
          Iniciar simulado — pagar R$ 10 no PIX
        </a>
      ) : (
        <p className="mt-6 rounded-lg border border-amber-500/40 bg-black/20 px-4 py-3 text-sm text-amber-200">
          Checkout em configuração. Execute{' '}
          <code className="rounded bg-black/40 px-1.5 py-0.5 text-xs">node scripts/kiwify-setup-sim-lead.mjs</code>{' '}
          na raiz do projeto e recarregue esta página.
        </p>
      )}

      <p className="mt-4 text-xs text-amber-200/70">
        Produto: {KIWIFY_SIM_PRODUCT_LABEL}
        {ready ? (
          <>
            {' '}
            ·{' '}
            <Link href="/simulado" className="underline underline-offset-2">
              página dedicada /simulado
            </Link>
          </>
        ) : null}
      </p>
    </section>
  )
}
