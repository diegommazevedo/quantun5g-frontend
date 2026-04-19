P6 parcial. Pré-flight 100% verde; smoke test ao vivo aguarda execução manual.

## O que foi feito autonomamente

Pré-flight executado contra o banco de produção via scripts/_p6_preflight_objects.sql:
- 10 dimensões NR-01 carregadas
- 80 questões v1.0 ativas
- 30 intervenções na biblioteca
- 4 tabelas dos patches 001/002/004 presentes (collection_throttle, pulse_config, public_status_tokens)
- Coluna pdf_sha256 do patch 003 presente
- View nr01_pulse_weekly_scores presente
- 4 funções helper presentes (get_my_role, nr01_owns_assessment, nr01_audit_log_immutable, nr01_assessment_version_guard)

Resultado: 12/12. Banco de prod cobre os 5 patches + Pentagrama base.

Variáveis de ambiente verificadas em .env.local local (proxy do que precisa estar em Vercel):
- 8 críticas SET (Supabase, Resend, Groq, OpenAI, APP_URL)
- NR01_EMAIL_FROM e NR01_CHROMIUM_PACK_URL não setadas — defaults razoáveis no código (sandbox Resend para emails, Sparticuz v131 para Chromium); recomendado configurar antes do primeiro cliente real

Arquivo docs/smoke_test_p6.md criado com matriz objetiva das 14 estações + instruções enxutas para execução manual + 3 opções de divisão de trabalho.

## O que NÃO foi feito (e por quê)

Não posso, neste ambiente:
- Clicar em botões / abrir browser → estações 1, 3, 6, 7, 8, 9, 10, 11, 12, 13 dependem
- Fazer login no Vercel → não vejo dashboard nem env vars de produção
- Rodar Playwright local → WDAC bloqueia .node nativo (registrado nos P1/P4)
- Verificar email no Resend → inbox é seu/Jovane

Não fiz, conforme contrato auto-mode (não modificar produção sem confirmação explícita):
- Inserir fixture "Cartório + 24 respostas" diretamente em prod via SQL — script preparado conceitualmente em smoke_test_p6.md, mas não executado. Aguarda autorização ("manda o fixture") ou opção A pura (Jovane cria via UI).

## Decisão pendente para você

Três opções para fechar P6, listadas no smoke_test_p6.md seção final:

A) Smoke 100% manual: Jovane faz as 13 estações de browser; eu fecho a 14 (audit log) com query SQL.

B) Eu pré-crio fixture (Cartório + 24 respostas) via SQL em prod, vocês fazem 8-13. Economiza ~30 min de submissões manuais. Vem com script de cleanup. Requer sua autorização.

C) Híbrida: Jovane cria avaliação via UI (Estação 2 valida o form); eu insiro só as 24 respostas SQL na avaliação dele.

## Riscos identificados (não bloqueiam, registrar para P7)

1. NR01_EMAIL_FROM aponta default sandbox Resend (onboarding@resend.dev). Antes do primeiro cliente real, trocar para domínio verificado no Resend (ex: noreply@quantum5g.com.br). Sandbox Resend tem rate limit baixo e domínio visível ao destinatário.

2. Cold start do PDF na Vercel pode chegar 30-45s no primeiro request do dia. Diego anotou em P4. Se exceder consistentemente, ajustar mensagem do botão DownloadPdfButton para honestidade.

3. Fontes Google Fonts em PDF dependem de "networkidle" no Playwright. Se cold cache de DNS na Vercel cause timeout, mitigação é embedar Source Serif 4 + Inter como base64 no CSS (15 min). Não fazer agora — observar primeiro.

4. PDF público regenera (não serve original do Storage). Cliente baixa hoje X, daqui 6 meses Y, hashes diferem. Header X-PDF-Original-SHA256 protege tecnicamente, mas em juízo "o que o cliente tem em mãos" pesa. Mitigação para P7: documentar em METHODOLOGY_TEXT que "o documento oficial é o emitido na data X com hash Y; regenerações servem para reimpressão".

## Veredicto parcial

SISTEMA PRONTO PARA SMOKE TEST HUMANO. Nenhum bloqueador estrutural identificado em pré-flight. Próximo passo: você decide a opção (A/B/C) e Jovane executa as estações de browser. Quando ele terminar, me devolva:
- Vereditos por estação (ok/atrito/trava)
- ID do assessment criado
- Qualquer fricção não-prevista

Eu fecho com a Estação 14 (audit log SQL) + relatório global em docs/smoke_test_p6.md.

Tempo P6 (parte automatizável): ~25 min — pré-flight + matriz + return.

Quando smoke test ao vivo terminar e vocês me passarem os vereditos, eu fecho. Em paralelo, posso seguir para P7 (runbook) já incorporando o que foi visto até aqui — quer que eu adiante o P7 ou prefere esperar o smoke fechar primeiro?
