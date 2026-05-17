import Link from 'next/link'
import type { Metadata } from 'next'

const LAST_UPDATED = '2026-05-05'

export const metadata: Metadata = {
  title: 'Política de privacidade | Quantum5G',
  description: 'Política de privacidade e tratamento de dados pessoais — Quantum5G (LGPD).',
}

function LegalFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 pt-8 text-sm text-slate-600">
      <p>Última revisão: {LAST_UPDATED}</p>
      <p className="mt-2">
        DPO:{' '}
        <a href="mailto:dpo@quantum5g.app" className="text-blue-900 underline underline-offset-2">
          dpo@quantum5g.app
        </a>{' '}
        · Contato geral:{' '}
        <a href="mailto:contato@quantum5g.app" className="text-blue-900 underline underline-offset-2">
          contato@quantum5g.app
        </a>
      </p>
    </footer>
  )
}

export default function PrivacidadePage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-base leading-relaxed text-slate-700">
      <a
        href="#conteudo-privacidade"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-slate-900">Quantum5G</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Política de privacidade</h1>
        <nav className="mt-4">
          <Link href="/institucional" className="text-blue-900 underline underline-offset-2 hover:text-blue-700">
            ← Voltar ao institucional
          </Link>
        </nav>
      </header>

      <main id="conteudo-privacidade" className="mt-10 space-y-10">
        <section aria-labelledby="sec-controlador">
          <h2 id="sec-controlador" className="text-xl font-semibold text-slate-900">
            1. Controlador
          </h2>
          {/* TODO_DIEGO_LGPD */}
          <p className="mt-3">
            <strong className="font-medium text-slate-800">Quantum5G</strong>, inscrita no CNPJ{' '}
            <span className="font-medium text-amber-800">[DEFINIR — CNPJ]</span>. Encarregado de dados (DPO):{' '}
            <a href="mailto:dpo@quantum5g.app" className="text-blue-900 underline underline-offset-2">
              dpo@quantum5g.app
            </a>
            .
          </p>
        </section>

        <section aria-labelledby="sec-dados">
          <h2 id="sec-dados" className="text-xl font-semibold text-slate-900">
            2. Dados coletados
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="font-medium text-slate-800">Identificação e conta:</strong> dados necessários ao
              cadastro e operação de administradores, consultores e lideranças (conforme fluxos do produto).
            </li>
            <li>
              <strong className="font-medium text-slate-800">Coletas anônimas:</strong> respostas de colaboradores em
              fluxos projetados como anônimos (IC/COL), sem associação publicada a pessoa identificável na interface
              consultiva.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Segurança e auditoria:</strong> endereço IP tratado como
              hash (ex.: SHA-256) e <em>user-agent</em> quando registrados em trilhas de auditoria do sistema.
            </li>
          </ul>
        </section>

        <section aria-labelledby="sec-bases">
          <h2 id="sec-bases" className="text-xl font-semibold text-slate-900">
            3. Bases legais (Art. 7º da LGPD)
          </h2>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="font-medium text-slate-800">Execução de contrato ou procedimentos preliminares</strong>{' '}
              — prestação da plataforma contratada.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Legítimo interesse</strong> — segurança da informação,
              prevenção a fraudes e integridade de trilhas de auditoria, observado o equilíbrio com direitos do titular.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Consentimento</strong> — quando aplicável a comunicações
              de marketing ou cookies não essenciais (hoje não utilizamos cookies de publicidade de terceiros).
            </li>
          </ul>
        </section>

        <section aria-labelledby="sec-anonimato">
          <h2 id="sec-anonimato" className="text-xl font-semibold text-slate-900">
            4. Anonimato inviolável (IC/COL) e NR-01
          </h2>
          <p className="mt-3">
            Alinha-se à <strong className="font-medium text-slate-800">Decisão de produto 002</strong>: respostas
            individuais de colaboradores em fluxos anônimos não são expostas na aplicação; utiliza-se identificador
            técnico (<code className="rounded bg-slate-100 px-1 text-sm">respondente_anonimo_id</code>) sem vínculo de
            chave estrangeira a tabela de usuários, preservando o desenho de confidencialidade.
          </p>
          <p className="mt-3">
            No módulo NR-01, eventos de auditoria podem registrar pseudonimização de IP por{' '}
            <strong className="font-medium text-slate-800">HMAC-SHA256</strong> (tratamento descrito no patch técnico
            P011 / documentação do produto), em linha com boas práticas de minimização e rastreabilidade sem guardar IP
            em claro onde a política do produto exige hash.
          </p>
        </section>

        <section aria-labelledby="sec-compartilhamento">
          <h2 id="sec-compartilhamento" className="text-xl font-semibold text-slate-900">
            5. Compartilhamento
          </h2>
          <p className="mt-3">Dados podem ser tratados por suboperadores necessários à operação do serviço:</p>
          <ul className="mt-3 list-disc space-y-2 pl-6">
            <li>
              <strong className="font-medium text-slate-800">Asaas</strong> — pagamentos.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Supabase</strong> — banco de dados, autenticação e
              armazenamento associados ao backend.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Vercel</strong> — hospedagem e entrega da aplicação web.
            </li>
            <li>
              <strong className="font-medium text-slate-800">Provedores de e-mail transacional</strong> — envio de
              mensagens operacionais (ex.: convites, notificações), conforme configuração do ambiente.
            </li>
          </ul>
        </section>

        <section aria-labelledby="sec-retencao">
          <h2 id="sec-retencao" className="text-xl font-semibold text-slate-900">
            6. Retenção
          </h2>
          <p className="mt-3">
            Mantemos dados pelo tempo necessário à prestação do serviço e a obrigações legais. Para o módulo NR-01, a
            documentação de produto prevê retenção de trilhas de auditoria compatível com o arcabouço das Portarias
            MTE <strong className="font-medium text-slate-800">1.419/2024</strong> e{' '}
            <strong className="font-medium text-slate-800">765/2025</strong>, incluindo referência a períodos da ordem
            de <strong className="font-medium text-slate-800">cinco anos</strong> para registros de auditoria quando
            aplicável ao seu caso de uso contratado.
          </p>
        </section>

        <section aria-labelledby="sec-direitos">
          <h2 id="sec-direitos" className="text-xl font-semibold text-slate-900">
            7. Direitos do titular
          </h2>
          <p className="mt-3">
            Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização,
            eliminação, portabilidade, informação sobre compartilhamento e revogação de consentimento quando aplicável.
          </p>
        </section>

        <section aria-labelledby="sec-exercicio">
          <h2 id="sec-exercicio" className="text-xl font-semibold text-slate-900">
            8. Como exercer os direitos
          </h2>
          <p className="mt-3">
            Encaminhe pedido ao DPO em{' '}
            <a href="mailto:dpo@quantum5g.app" className="text-blue-900 underline underline-offset-2">
              dpo@quantum5g.app
            </a>
            . Será disponibilizado formulário dedicado em{' '}
            <strong className="font-medium text-slate-800">/privacidade/solicitacao</strong> (em implementação futura);
            até lá, utilize o e-mail do DPO identificando titular e pedido com clareza.
          </p>
        </section>

        <section aria-labelledby="sec-cookies">
          <h2 id="sec-cookies" className="text-xl font-semibold text-slate-900">
            9. Cookies
          </h2>
          <p className="mt-3">
            Utilizamos cookies essenciais para sessão e autenticação (por exemplo, sessão Supabase), com escopo adequado
            ao domínio de produção (ex.: <code className="rounded bg-slate-100 px-1 text-sm">.quantun5g.app</code>). Não
            utilizamos, nesta política vigente, cookies de publicidade de terceiros para perfilagem.
          </p>
        </section>

        <section aria-labelledby="sec-atualizacoes">
          <h2 id="sec-atualizacoes" className="text-xl font-semibold text-slate-900">
            10. Atualizações
          </h2>
          <p className="mt-3">
            Esta política pode ser atualizada; a data da última revisão aparece no rodapé. Recomenda-se revisão
            periódica antes de novos usos comerciais intensivos.
          </p>
          <p className="mt-3 text-sm text-slate-600">
            Texto operacional para homologação técnica e links legais do produto. Revisão jurídica obrigatória antes do
            merge para produção comercial conforme governança interna.
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  )
}
