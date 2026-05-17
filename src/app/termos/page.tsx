import Link from 'next/link'
import type { Metadata } from 'next'

const LAST_UPDATED = '2026-05-05'

export const metadata: Metadata = {
  title: 'Termos de uso | Quantum5G',
  description: 'Termos de uso da plataforma Quantum5G — Pentagrama de Ginger e módulo NR-01.',
}

function LegalFooter() {
  return (
    <footer className="mt-16 border-t border-slate-200 pt-8 text-sm text-slate-600">
      <p>Última atualização: {LAST_UPDATED}</p>
      <p className="mt-2">
        Contato:{' '}
        <a href="mailto:contato@quantun5g.com" className="text-blue-900 underline underline-offset-2">
          contato@quantun5g.com
        </a>
      </p>
    </footer>
  )
}

export default function TermosPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-12 text-base leading-relaxed text-slate-700">
      <a
        href="#conteudo-termos"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded focus:bg-white focus:px-3 focus:py-2 focus:shadow"
      >
        Ir para o conteúdo
      </a>
      <header className="border-b border-slate-200 pb-8">
        <p className="text-sm font-semibold text-slate-900">Quantum5G</p>
        <h1 className="mt-2 text-3xl font-bold text-slate-900">Termos de uso</h1>
        <nav className="mt-4">
          <Link href="/institucional" className="text-blue-900 underline underline-offset-2 hover:text-blue-700">
            ← Voltar ao institucional
          </Link>
        </nav>
      </header>

      <main id="conteudo-termos" className="mt-10 space-y-10">
        <section aria-labelledby="sec-aceitacao">
          <h2 id="sec-aceitacao" className="text-xl font-semibold text-slate-900">
            1. Aceitação
          </h2>
          <p className="mt-3">
            O cadastro e o uso da plataforma Quantum5G implicam leitura e aceitação integral destes Termos de Uso.
            Caso não concorde, não utilize os serviços.
          </p>
        </section>

        <section aria-labelledby="sec-objeto">
          <h2 id="sec-objeto" className="text-xl font-semibold text-slate-900">
            2. Objeto
          </h2>
          <p className="mt-3">
            A Quantum5G oferece software como serviço para diagnóstico organizacional, incluindo o instrumento
            <strong className="font-medium text-slate-800"> Pentagrama de Ginger</strong> e o módulo regulatório{' '}
            <strong className="font-medium text-slate-800">NR-01</strong> (fatores de risco psicossociais
            relacionados ao trabalho), destinados a apoiar consultores e organizações contratantes na coleta,
            processamento e comunicação de resultados agregados.
          </p>
        </section>

        <section aria-labelledby="sec-cadastro">
          <h2 id="sec-cadastro" className="text-xl font-semibold text-slate-900">
            3. Cadastro e contas
          </h2>
          <p className="mt-3">
            O titular da conta é responsável pela confidencialidade das credenciais. A plataforma pode operar com
            papéis distintos (administrador, consultor, liderança e colaborador), cada um com permissões adequadas ao
            fluxo de diagnóstico. O uso por terceiros não autorizados é de responsabilidade do contratante.
          </p>
        </section>

        <section aria-labelledby="sec-planos">
          <h2 id="sec-planos" className="text-xl font-semibold text-slate-900">
            4. Planos e pagamentos
          </h2>
          <p className="mt-3">
            Cobranças podem ser processadas por meio do gateway <strong className="font-medium text-slate-800">Asaas</strong>,
            conforme plano contratado (ex.: pagamento único ou assinatura anual, conforme tier). O não pagamento pode
            implicar suspensão do acesso. Cancelamentos seguem a política comercial vigente no momento da contratação e
            comunicações no painel ou por e-mail contratual.
          </p>
        </section>

        <section aria-labelledby="sec-uso">
          <h2 id="sec-uso" className="text-xl font-semibold text-slate-900">
            5. Uso aceitável
          </h2>
          <p className="mt-3">
            É vedado utilizar a plataforma para tentar reidentificar respondentes anônimos das coletas individuais de
            colaboradores (IC/COL), em linha com a <strong className="font-medium text-slate-800">Decisão de produto 002</strong>{' '}
            do projeto: respostas individuais de colaboradores não são expostas; apenas agregados autorizados pelo
            desenho do produto.
          </p>
        </section>

        <section aria-labelledby="sec-pi">
          <h2 id="sec-pi" className="text-xl font-semibold text-slate-900">
            6. Propriedade intelectual
          </h2>
          <p className="mt-3">
            O método e conteúdo científico do <strong className="font-medium text-slate-800">Pentagrama de Ginger</strong>{' '}
            são de titularidade de <strong className="font-medium text-slate-800">Jovane Borlini da Silva</strong>. O
            código, marca, layout e infraestrutura da plataforma Quantum5G pertencem à Quantum5G ou licenciantes,
            salvo disposição contratual específica.
          </p>
        </section>

        <section aria-labelledby="sec-limitacao">
          <h2 id="sec-limitacao" className="text-xl font-semibold text-slate-900">
            7. Limitação de responsabilidade
          </h2>
          <p className="mt-3">
            Os relatórios e indicadores são instrumentos de apoio à decisão organizacional. Não substituem avaliação
            clínica, jurídica ou ocupacional específica, nem garantem resultado empresarial determinado.
          </p>
        </section>

        <section aria-labelledby="sec-suspensao">
          <h2 id="sec-suspensao" className="text-xl font-semibold text-slate-900">
            8. Suspensão e encerramento
          </h2>
          <p className="mt-3">
            A Quantum5G pode suspender ou encerrar o acesso em caso de descumprimento destes termos, fraude, abuso,
            ou tentativa de violar o anonimato de respondentes conforme a política do produto.
          </p>
        </section>

        <section aria-labelledby="sec-foro">
          <h2 id="sec-foro" className="text-xl font-semibold text-slate-900">
            9. Foro
          </h2>
          {/* TODO_DIEGO_LGPD */}
          <p className="mt-3">
            Fica eleito o foro da comarca de <span className="font-medium text-amber-800">[DEFINIR — comarca]</span>,
            com renúncia a qualquer outro, por mais privilegiado que seja, salvo disposição legal imperativa em
            contrário.
          </p>
        </section>

        <section aria-labelledby="sec-contato">
          <h2 id="sec-contato" className="text-xl font-semibold text-slate-900">
            10. Contato
          </h2>
          <p className="mt-3">
            Dúvidas sobre estes termos:{' '}
            <a href="mailto:contato@quantun5g.com" className="text-blue-900 underline underline-offset-2">
              contato@quantun5g.com
            </a>
            .
          </p>
        </section>
      </main>

      <LegalFooter />
    </div>
  )
}
