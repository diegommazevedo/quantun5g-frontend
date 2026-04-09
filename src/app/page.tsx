/**
 * QUANTUM5G — Landing Page pública
 * Rota raiz /  — Pentagrama de Ginger by Jovane Borlini
 * Usuários autenticados são redirecionados para /dashboard pelo middleware.
 */

import Link from 'next/link'
import Image from 'next/image'
import { VideoBox } from '@/components/landing/VideoBox'
import s from './page.module.css'

export const metadata = {
  title: 'Pentagrama · Saúde Organizacional Inteligente | Jovane Borlini',
  description: 'Do livro à plataforma com IA. O ecossistema Pentagrama que mantém sua empresa saudável — continuamente. Diagnóstico gratuito.',
}

export default function LandingPage() {
  return (
    <div className={s.landing}>
      {/* Fontes */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@600;700;800;900&family=Inter:wght@400;500;600;700;800&display=swap');`}</style>

      {/* ── NAV ── */}
      <nav className={s.nav}>
        <div className={s.navInner}>
          <a href="#" className={s.logo}>
            <span className={s.logoDot} />
            <span>
              Pentagrama
              <small className={s.logoSmall}>By Jovane Borlini</small>
            </span>
          </a>
          <ul className={s.navMenu}>
            <li><a href="#metodo">Método</a></li>
            <li><a href="#plataforma">Plataforma</a></li>
            <li><a href="#trilha">Soluções</a></li>
            <li><a href="#autor">Autor</a></li>
          </ul>
          <Link href="/login" className={s.navCta}>Diagnóstico grátis</Link>
        </div>
      </nav>

      {/* ── HERO ── */}
      <section className={s.hero}>
        <div className={s.wrap}>
          <div className={s.heroGrid}>
            <div>
              <div className={s.eyebrow}>Saúde Organizacional Inteligente</div>
              <h1>
                Do livro à plataforma com IA. Um ecossistema para empresas que escolheram{' '}
                <span className={s.accent}>prosperar com gente</span>.
              </h1>
              <p className={s.deck}>
                O método <b>Pentagrama</b> aplicado em cinco dimensões, com uma plataforma que{' '}
                <b>monitora continuamente</b> a saúde da sua organização — e avisa antes do problema virar crise.
              </p>
              <div className={s.heroCtas}>
                <Link href="/login" className={`${s.btn} ${s.btnRed}`}>
                  🎯 Quero meu diagnóstico grátis
                </Link>
                <a href="#video" className={`${s.btn} ${s.btnGhost}`}>▶ Assistir apresentação</a>
              </div>
              <div className={s.heroTrust}>
                <span>11+ anos de consultoria</span>
                <span>Cases reais</span>
                <span>Endossos CRP</span>
                <span>IA aplicada</span>
              </div>
            </div>

            {/* Book cover column */}
            <div className={s.coverArea}>
              <div className={s.orbit} />
              <div className={s.orbit2} />
              <div className={s.coverWrap}>
                <span className={s.newBadge}>NOVO Livro</span>
                <Image
                  src="/book-cover.png"
                  alt="O Pentagrama de Ginger — Jovane Borlini"
                  width={320}
                  height={440}
                  className={s.coverImg}
                  priority
                />
              </div>
              <div className={s.aiBadge}>
                <span className={s.aiDot} />
                IA aplicada ao método
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── VÍDEO ── */}
      <section className={s.videoSection} id="video">
        <div className={s.videoWrap}>
          <VideoBox videoId="VIDEO_ID" />
        </div>
      </section>

      {/* ── TRUST BAR ── */}
      <section className={s.trustBar}>
        <div className={s.wrap}>
          <div className={s.trustLabel}>Empresas que já confiam no método</div>
          <div className={s.trustLogos}>
            <div className={s.fakeLogo}>GRUPO SMAP</div>
            <div className={s.fakeLogo}>INDUSTRIA X</div>
            <div className={s.fakeLogo}>CORP Y</div>
            <div className={s.fakeLogo}>HOLDING Z</div>
            <div className={s.fakeLogo}>EMPRESA W</div>
          </div>
        </div>
      </section>

      {/* ── PROBLEMA ── */}
      <section className={`${s.section} ${s.problem}`}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>O problema real</div>
            <h2>Você não tem problema de gente.<br /><em>Tem problema de modelo.</em></h2>
            <p>Toda empresa que trata pessoas como recurso, mais cedo ou mais tarde, paga a conta. Geralmente no pior momento possível.</p>
          </div>
          <div className={s.problemGrid}>
            <div className={s.problemCard}>
              <div className={s.problemIcon}>⚠</div>
              <h3>Turnover silencioso</h3>
              <p>Gente boa saindo sem reclamar. Você só descobre quando o substituto chega — e já é tarde para reter o conhecimento perdido.</p>
            </div>
            <div className={s.problemCard}>
              <div className={s.problemIcon}>📉</div>
              <h3>Performance irregular</h3>
              <p>Meses excelentes seguidos de meses inexplicavelmente ruins. Ninguém sabe explicar — porque ninguém está medindo o que importa.</p>
            </div>
            <div className={s.problemCard}>
              <div className={s.problemIcon}>🔥</div>
              <h3>Cultura em pedaços</h3>
              <p>Cada área se comporta como uma empresa diferente. Os valores da parede não são os valores vividos no corredor.</p>
            </div>
          </div>
        </div>
      </section>

      {/* ── MÉTODO ── */}
      <section className={`${s.section} ${s.method}`} id="metodo">
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>★ O método</div>
            <h2>As 5 dimensões do <em>Pentagrama de Ginger</em></h2>
            <p>Um modelo integral que enxerga a pessoa inteira dentro da organização. Cada dimensão afeta todas as outras — e é por isso que soluções pontuais falham.</p>
          </div>
          <div className={s.dims}>
            <div className={s.dim}><div className={s.dimNum}>01</div><h3>Física</h3><p>Corpo, ambiente, saúde, energia no trabalho.</p></div>
            <div className={s.dim}><div className={s.dimNum}>02</div><h3>Afetiva</h3><p>Vínculos, segurança psicológica, pertencimento.</p></div>
            <div className={s.dim}><div className={s.dimNum}>03</div><h3>Racional</h3><p>Clareza, propósito, qualidade de decisão.</p></div>
            <div className={s.dim}><div className={s.dimNum}>04</div><h3>Social</h3><p>Cooperação real, confiança, times de verdade.</p></div>
            <div className={s.dim}><div className={s.dimNum}>05</div><h3>Cultural</h3><p>Valores vividos, identidade, legado construído.</p></div>
          </div>
          <div className={s.cycle}>
            <div className={s.cycleLabel}>O ciclo aplicado</div>
            <h3>Diagnosticar → Agir → Rever</h3>
            <p>A rotina operacional que institucionaliza a mudança — e a plataforma Pentagrama 5G automatiza.</p>
          </div>
        </div>
      </section>

      {/* ── PLATAFORMA ── */}
      <section className={`${s.section} ${s.platform}`} id="plataforma">
        <div className={s.wrap}>
          <div className={s.platformGrid}>
            <div>
              <div className={s.liveTag}><span className={s.liveDot} />AI · Sempre Ativo</div>
              <h2>Quantum <em>Pentagrama 5G</em></h2>
              <p className={s.platformLead}>
                A plataforma SaaS com Inteligência Artificial que monitora a saúde organizacional da sua empresa{' '}
                <b>de forma intermitente</b> — capturando sinais fracos antes de virarem sintomas caros.
              </p>
              <ul className={s.features}>
                <li><b>Monitoramento contínuo</b> das 5 dimensões — sem questionários cansativos.</li>
                <li><b>IA que interpreta sinais</b> — escuta padrões que olho humano ignora.</li>
                <li><b>Alertas preditivos</b> — você age antes do time adoecer.</li>
                <li><b>Dashboard executivo</b> — um único número pra tomar decisão em reunião de conselho.</li>
                <li><b>Benchmark setorial</b> — compare sua saúde com empresas do seu porte.</li>
              </ul>
              <Link href="/login" className={`${s.btn} ${s.btnPrimary}`}>Agendar demonstração</Link>
            </div>
            <div className={s.dashMock}>
              <div className={s.dashHead}>
                <div className={s.dashName}>
                  Índice de Saúde Organizacional
                  <small>Sua empresa · Abril 2026</small>
                </div>
                <div className={s.dashStatus}>Live</div>
              </div>
              <div className={s.dashBars}>
                {[
                  { label: 'Física',   val: 78 },
                  { label: 'Afetiva',  val: 62 },
                  { label: 'Racional', val: 84 },
                  { label: 'Social',   val: 71 },
                  { label: 'Cultural', val: 69 },
                ].map(({ label, val }) => (
                  <div key={label} className={s.dashBar}>
                    <div className={s.dashLabel}>{label}</div>
                    <div className={s.dashTrack}>
                      <div className={s.dashFill} style={{ width: `${val}%` }} />
                    </div>
                    <div className={s.dashVal}>{val}</div>
                  </div>
                ))}
              </div>
              <div className={s.dashAI}>
                <div className={s.dashBot}>AI</div>
                <div>
                  <b>Alerta Pentagrama 5G</b>
                  Dimensão afetiva do time Comercial em queda nas últimas 3 semanas. Padrão compatível com sobrecarga pré-burnout. Recomendo intervenção.
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── TRILHA ── */}
      <section className={`${s.section} ${s.ladder}`} id="trilha">
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>★ A trilha completa</div>
            <h2>Escolha o ponto de entrada <em>certo para você</em></h2>
            <p>Do livro ao monitoramento contínuo com IA. Um ecossistema modular onde você escala o cuidado conforme a maturidade da sua organização.</p>
          </div>
          <div className={s.ladderGrid}>

            <div className={s.ladderItem}>
              <div className={s.step}>01</div>
              <div className={s.ladderInfo}>
                <span className={s.tier}>Entrada</span>
                <h3>📘 O Livro — O Pentagrama de Ginger</h3>
                <p>176 páginas. O método completo, os fundamentos, o case SMAP e os roteiros aplicáveis. A melhor porta de entrada para entender antes de contratar.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.price}>R$ 67<small>à vista ou 12x</small></div>
                <a href="#">Comprar →</a>
              </div>
            </div>

            <div className={s.ladderItem}>
              <div className={`${s.step} ${s.stepFree}`}>02</div>
              <div className={s.ladderInfo}>
                <span className={`${s.tier} ${s.tierFree}`}>Grátis</span>
                <h3>🎯 Consulta Pré-Diagnóstico</h3>
                <p>45 minutos com nossa equipe. Entendemos seu contexto, mapeamos sinais iniciais e indicamos o próximo passo. Sem compromisso e sem venda forçada.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.freeLabel}>Gratuito</div>
                <a href="#consulta">Agendar agora →</a>
              </div>
            </div>

            <div className={s.ladderItem}>
              <div className={s.step}>03</div>
              <div className={s.ladderInfo}>
                <span className={s.tier}>Diagnóstico</span>
                <h3>📊 Pesquisa Organizacional Pentagrama</h3>
                <p>Aplicação completa do método nas cinco dimensões. Escuta qualitativa + quantitativa + cruzamento com dados da empresa. Fotografia fiel do presente.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.price}>Sob consulta<small>de acordo com o porte</small></div>
                <a href="#consulta">Solicitar →</a>
              </div>
            </div>

            <div className={s.ladderItem}>
              <div className={s.step}>04</div>
              <div className={s.ladderInfo}>
                <span className={s.tier}>Apresentação</span>
                <h3>🚀 Kickoff Pós-Pentagrama</h3>
                <p>Encontro executivo de apresentação dos resultados da pesquisa. Leitura qualificada, priorização de achados e preparação do terreno para decisão estratégica.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.price}>Incluso<small>na pesquisa completa</small></div>
                <a href="#consulta">Saber mais →</a>
              </div>
            </div>

            <div className={s.ladderItem}>
              <div className={s.step}>05</div>
              <div className={s.ladderInfo}>
                <span className={s.tier}>Execução</span>
                <h3>🛡 Kickoff Estratégia &amp; Plano de Ação</h3>
                <p>Construção do plano de ação com metas, responsáveis, prazos e indicadores por dimensão. O momento em que o diagnóstico vira transformação real.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.price}>Sob consulta<small>personalizado</small></div>
                <a href="#consulta">Solicitar →</a>
              </div>
            </div>

            <div className={s.ladderItem}>
              <div className={`${s.step} ${s.stepPlatform}`}>06</div>
              <div className={s.ladderInfo}>
                <span className={`${s.tier} ${s.tierPlatform}`}>Plataforma</span>
                <h3>⚡ Quantum · Pentagrama 5G</h3>
                <p>Plataforma SaaS com IA para monitoramento contínuo da saúde organizacional. O método vira rotina automatizada. A manutenção intermitente que mantém sua empresa respirando.</p>
              </div>
              <div className={s.ladderCta}>
                <div className={s.price}>Assinatura<small>mensal por empresa</small></div>
                <Link href="/login">Demonstração →</Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* ── AUTOR ── */}
      <section className={`${s.section} ${s.authorSec}`} id="autor">
        <div className={s.wrap}>
          <div className={s.authorGrid}>
            <div className={s.authorPhoto}>
              <Image
                src="/jovane.png"
                alt="Jovane Borlini da Silva"
                fill
                style={{ objectFit: 'cover', objectPosition: 'center top' }}
              />
            </div>
            <div>
              <div className={s.kicker}>★ O autor</div>
              <h2>Jovane Borlini da Silva</h2>
              <span className={s.authorRole}>Psicólogo · Consultor Organizacional · Autor</span>
              <p>Psicólogo e consultor organizacional com <b>mais de 11 anos sentando na cabeceira de mesas de reunião</b> de empresas brasileiras — do chão de fábrica ao conselho de família.</p>
              <p>Criou o método Pentagrama depois de ver, dezenas de vezes, o mesmo padrão se repetindo: empresas com bons números, times inteligentes e decisões corretas que, mesmo assim, estavam silenciosamente quebrando por dentro.</p>
              <p>Hoje lidera o ecossistema Pentagrama — do livro à plataforma com IA — levando saúde organizacional real para empresas que decidiram parar de tratar gente como recurso.</p>
              <div className={s.authorStats}>
                <div><div className={s.statN}>11+</div><div className={s.statL}>Anos de<br/>consultoria</div></div>
                <div><div className={s.statN}>100+</div><div className={s.statL}>Empresas<br/>atendidas</div></div>
                <div><div className={s.statN}>5</div><div className={s.statL}>Dimensões<br/>do método</div></div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── DEPOIMENTOS ── */}
      <section className={`${s.section} ${s.testimonials}`}>
        <div className={s.wrap}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>★ O que dizem</div>
            <h2>Endossado por quem trabalha com <em>o humano</em></h2>
          </div>
          <div className={s.testiGrid}>
            <div className={s.testiCard}>
              <div className={s.stars}>★★★★★</div>
              <p>&ldquo;Ouso dizer que O Pentagrama de Ginger deveria ser o livro de cabeceira de qualquer organização que opera com a existência humana. Uma leitura que provoca reflexões aplicáveis ao dia a dia.&rdquo;</p>
              <div className={s.who}>Francisca Ferrarini<small>Psicóloga · CRP 16/3355 · Pós em Psicologia Clínica e Hospitalar</small></div>
            </div>
            <div className={s.testiCard}>
              <div className={s.stars}>★★★★★</div>
              <p>&ldquo;Borlini aplica os princípios da Gestalt-terapia à gestão estratégica de pessoas. O resultado são ambientes integrados e equipes conscientes do seu papel na geração de valor.&rdquo;</p>
              <div className={s.who}>Martino Lauro Dellabianca Júnior<small>Psicólogo · CRP 16/6172 · Pós em Gestalt-terapia</small></div>
            </div>
          </div>
        </div>
      </section>

      {/* ── FAQ ── */}
      <section className={`${s.section} ${s.faq}`}>
        <div className={`${s.wrapSm} ${s.faqWrap}`}>
          <div className={s.sectionHead}>
            <div className={s.kicker}>★ Dúvidas frequentes</div>
            <h2>Antes de <em>começar</em></h2>
          </div>
          {[
            { q: 'A consulta pré-diagnóstico é mesmo gratuita?', a: 'Sim. São 45 minutos com nossa equipe para entender seu contexto, mapear sinais iniciais e indicar o próximo passo mais adequado — ou nenhum passo, se ainda não for a hora. Sem compromisso, sem venda forçada.' },
            { q: 'Qual o porte ideal de empresa para aplicar o método?', a: 'O método funciona de 20 a 5.000 colaboradores. Empresas menores geralmente começam pelo livro e pela consulta. Empresas médias costumam contratar a pesquisa completa + plano de ação. Empresas maiores assinam a plataforma Pentagrama 5G para manutenção contínua.' },
            { q: 'Como a IA da plataforma funciona?', a: 'A plataforma captura sinais organizacionais de forma intermitente (sem questionários cansativos) e aplica modelos treinados para identificar padrões nas cinco dimensões. Quando detecta uma anomalia, emite alerta preditivo antes da crise se instalar.' },
            { q: 'Preciso seguir a trilha completa?', a: 'Não. A trilha é modular. Muitos clientes começam pelo livro, outros pela consulta gratuita, outros já entram direto pela pesquisa. Você escolhe o ponto de entrada que faz sentido para o momento da sua empresa.' },
            { q: 'Quanto tempo leva uma aplicação completa?', a: 'A pesquisa organizacional costuma levar de 4 a 8 semanas, dependendo do porte. O kickoff estratégico acontece em até 15 dias após a conclusão. A plataforma Pentagrama 5G é ativada em até 7 dias após contratação.' },
          ].map(({ q, a }) => (
            <details key={q} className={s.faqDetails}>
              <summary className={s.faqSummary}>{q}</summary>
              <p className={s.faqText}>{a}</p>
            </details>
          ))}
        </div>
      </section>

      {/* ── FINAL CTA ── */}
      <section className={s.finalCta} id="consulta">
        <div className={s.wrapSm}>
          <div className={s.eyebrow} style={{ borderColor: 'rgba(212,160,23,.4)' }}>Próximo passo</div>
          <h2>Comece pelo <em>ponto certo</em>.</h2>
          <p>Agende 45 minutos com nossa equipe. Vamos entender onde sua empresa está, mapear os sinais iniciais e indicar o melhor caminho. Sem custo, sem compromisso.</p>
          <Link href="/login" className={`${s.btn} ${s.btnPrimary}`}>🎯 Agendar diagnóstico gratuito</Link>
          <div className={s.finalNote}>45 min · Online · Sem compromisso</div>
        </div>
      </section>

      {/* ── FOOTER ── */}
      <footer className={s.footer}>
        <div className={`${s.wrap} ${s.footerGrid}`}>
          <div>
            <div className={s.footerBrand}>Pentagrama</div>
            <p className={s.footerTagline}>Saúde organizacional inteligente. Do livro à plataforma com IA. Um ecossistema para empresas que escolheram prosperar com gente.</p>
          </div>
          <div>
            <h4>Produtos</h4>
            <ul>
              <li><a href="#">Livro</a></li>
              <li><a href="#">Pesquisa Pentagrama</a></li>
              <li><a href="#">Kickoff Estratégia</a></li>
              <li><Link href="/login">Plataforma 5G</Link></li>
            </ul>
          </div>
          <div>
            <h4>Empresa</h4>
            <ul>
              <li><a href="#metodo">Método</a></li>
              <li><a href="#autor">Autor</a></li>
              <li><a href="#">Cases</a></li>
              <li><a href="#consulta">Contato</a></li>
            </ul>
          </div>
          <div>
            <h4>Contato</h4>
            <ul>
              <li><a href="mailto:contato@pentagrama.com.br">contato@pentagrama.com.br</a></li>
              <li><a href="#">WhatsApp</a></li>
              <li><a href="#">LinkedIn</a></li>
            </ul>
          </div>
        </div>
        <div className={`${s.wrap} ${s.footerBottom}`}>
          © 2026 · <b>JOVANE BORLINI DA SILVA</b> · Método Pentagrama de Ginger · Plataforma Quantum Pentagrama 5G · Todos os direitos reservados
        </div>
      </footer>
    </div>
  )
}
