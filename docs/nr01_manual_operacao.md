# NR-01 · Manual de Operação (Runbook)

**Versão:** 1.0 (draft) · **Data:** 2026-04-19 · **Para:** consultor sênior do módulo NR-01 (Jovane e sucessores)

> Este documento é runbook operacional, não documentação técnica. Quando precisar saber **como fazer** alguma coisa no sistema, está aqui. Quando precisar saber **como o sistema funciona por dentro**, consulte [`nr01_modulo_arquitetura.md`](./nr01_modulo_arquitetura.md).

---

## Sumário

1. [Setup inicial de um novo cliente](#1-setup-inicial-de-um-novo-cliente)
2. [Interpretação dos resultados e construção do plano](#2-interpretação-dos-resultados-e-construção-do-plano)
3. [Configuração de micro-pulsos sem quebrar](#3-configuração-de-micro-pulsos-sem-quebrar)
4. [Protocolo de fiscalização: o que entregar e em que ordem](#4-protocolo-de-fiscalização)
5. [Manutenção evolutiva do sistema](#5-manutenção-evolutiva-do-sistema)
6. [Operações privilegiadas (LGPD, revogações, regenerações)](#6-operações-privilegiadas)
7. [Ambientes e deploy](#7-ambientes-e-deploy)
8. [Riscos conhecidos e mitigações](#8-riscos-conhecidos-e-mitigações)
9. [Próximas entregas em ordem regulatória pós-26/05](#9-próximas-entregas-pós-2605)

---

## 1. Setup inicial de um novo cliente

### 1.1 Antes de criar a avaliação

| Pergunta ao cliente | Por quê | Onde usa |
|---|---|---|
| CNPJ + razão social | Comparece no laudo técnico | tabela `companies.name` |
| Total de trabalhadores | Base do cálculo de exposição a multas | `companies.total_collaborators` |
| E-mails da liderança imediata (até 5) | Distribuir convites de coleta | passo 1.4 |
| Período de referência (ex: "Q2 2026") | Identificação do ciclo no laudo | `nr01_assessments.reference_period` |
| Quem é o responsável técnico do laudo | Assina o documento; precisa ter CRP ativo | `assessments.technical_lead_id/_crp` |

### 1.2 Criar a avaliação (clique-a-clique)

1. https://quantum5g.vercel.app/login → entra como consultor
2. **Nova avaliação** no menu superior
3. Preencher empresa (selecionar existente ou criar nova com nome + total de trabalhadores)
4. Nome da avaliação: padrão `Avaliação NR-01 <Período> · <Empresa>`
5. Modalidade: começar sempre com **WEB** (link único anônimo)
6. Respondentes esperados: número total de trabalhadores
7. Janela de coleta: data de abertura + encerramento (recomendado: 7 dias)
8. CRP do responsável técnico
9. k-anonymity mínimo: deixar **5** (default; só baixar para 3 em empresas com <15 colab)
10. Vincular a um diagnóstico Pentagrama se houver — habilita análise comparativa
11. **Criar avaliação** → status fica `CRIADO`

### 1.3 Abrir coleta

Na página da avaliação:
1. Botão **Abrir coleta** → status muda para `COLETANDO`
2. Aparece o link público: `https://quantum5g.vercel.app/nr01/coleta/<token>`
3. Copiar e enviar para os trabalhadores via canal escolhido pela empresa (e-mail interno, intranet, WhatsApp do RH)

> **Anti-poisoning:** o sistema bloqueia 2ª resposta do mesmo IP em 24h por token. Bloqueio fica sticky — cada tentativa adicional estende a janela. Atende ao caso "alguém coloca o link no canal aberto e tenta sabotar".

### 1.4 Acompanhar adesão

- Página da avaliação mostra contagem de respostas em tempo real
- Adesão saudável: > 60% nos primeiros 4 dias
- Adesão preocupante: < 40% no fim do prazo → conversar com a liderança da empresa antes de encerrar (pode ser problema de canal de divulgação, não de engajamento)

### 1.5 Encerrar e processar

Quando a janela fecha (ou adesão suficiente):
1. **Encerrar coleta** → status `COLETA_ENCERRADA`
2. **Processar resultados** → motor calcula scores por dimensão, ISO global, alertas sistêmicos. Status vira `CONCLUIDO`
3. Se houver vínculo Pentagrama, o cruzamento (bridge) é calculado automaticamente

**[SMOKE_TEST_LEARNING_1.5]** (a preencher após smoke test ao vivo)

---

## 2. Interpretação dos resultados e construção do plano

### 2.1 Como ler a tela de resultado por dimensão

Cada uma das 10 dimensões tem:
- **Score 0-100** (100 = condição mais saudável)
- **Nível de risco** em 5 faixas: muito_baixo (≥80) | baixo (65-79) | atenção (50-64) | elevado (35-49) | crítico (<35)
- **N respondentes** — abaixo de `k_anonymity_min` o sistema retorna `sem_dados`
- **Itens-âncora**: as 3 questões com pior média na dimensão. Pista de **o que** está mal, não só **quanto**.

### 2.2 Alertas sistêmicos (e o que cada um significa)

| Alerta | Quando dispara | Resposta clínica |
|---|---|---|
| **PRE_BURNOUT** | carga + saúde + emocional simultâneos em risco | Conversa de liderança + redução de carga em 30 dias |
| **INTENCAO_SAIDA** | reconhecimento + clima caindo juntos | Stay interview + revisão de plano de carreira |
| **RISCO_ASSEDIO** | dimensão assédio elevada/crítica | Acionar protocolo Lei 14.457/2022 imediatamente |
| **GAP_LIDERANCA** | liderança + organização caindo juntos | Desenvolvimento de líder + revisão estrutural |
| **BOLHA_SISTEMICA** | 3+ dimensões em elevado/crítico | Programa estrutural + reavaliação de prioridades da empresa |

### 2.3 Construir o plano (botão "Sugerir ações automaticamente")

A sugestão automática:
1. Olha cada dimensão em risco (atenção / elevado / crítico)
2. Filtra a biblioteca de 30 intervenções por compatibilidade de risco e porte
3. Pega top 2 por dimensão (por impacto esperado, custo como desempate)
4. Atribui prioridade automática: P1 (crítico/elevado) | P2 (atenção)
5. Calcula prazo: 30/60/90 dias conforme prioridade

**Sempre revise as sugestões antes de aprovar:**
- Trocar "A definir" pelo nome real do responsável (não pode ser "RH" — tem que ser pessoa)
- Ajustar prazo se irrealista para o cliente
- Adicionar items manuais para casos não cobertos pela biblioteca
- Remover sugestões que duplicam ações já em curso

### 2.4 Aprovar o plano

Botão **Aprovar plano** congela o status e agenda automaticamente próxima revisão em 90 dias. Aprovar é momento simbólico — fazer com a liderança presente fortalece o compromisso.

**[SMOKE_TEST_LEARNING_2]**

---

## 3. Configuração de micro-pulsos sem quebrar

### 3.1 Princípio: três perguntas, nunca mais

3 perguntas/semana, rotativas entre as 10 dimensões. Cada dimensão tocada ~1× a cada 3-4 semanas. Trabalhador leva 90 segundos. Resistir à tentação de aumentar.

### 3.2 Ativação (clique-a-clique)

1. Página da avaliação → **Monitoramento contínuo**
2. Cole lista de e-mails (separadores: vírgula, ponto-e-vírgula ou linha)
3. Dia da semana: padrão segunda-feira (ISO: 1)
4. Perguntas/semana: deixar 3
5. Janela de resposta: padrão 168h (7 dias)
6. **Ativar monitoramento**

### 3.3 Disparo (manual nos primeiros 14 dias)

Cron automático ainda não está plugado. Toda segunda-feira:
1. Abra a tela de monitoramento da avaliação
2. Clique em **Disparar pulso**
3. O sistema sorteia 3 questões (sem repetir as dos 2 últimos disparos), gera tokens individuais por destinatário, envia emails

### 3.4 Calibração — não confiar em alertas das primeiras 3 semanas

`calibration_weeks` default = 3. As respostas entram no banco mas **não geram alertas preditivos**. Razão: amostra pequena + efeito novidade inflam desvios e geram falso positivo. Falso positivo na semana 2 destrói credibilidade do sistema.

A partir da semana 4 o agregado é confiável o suficiente para alertar.

### 3.5 Adesão baixa é dado, não fracasso

Sistema alerta quando 2 semanas seguidas vêm com adesão < 40%. Resposta:

1. Verificar entregabilidade (Resend ainda no sandbox? Domínio sem verificação?)
2. Conversar com liderança da empresa: o canal está confiável aos olhos dos colaboradores?
3. Considerar mudar dia da semana (segunda vs quarta)
4. Última opção: reduzir frequência para quinzenal (não automatizado — desativa, reativa quinzenalmente)

### 3.6 O que NÃO fazer

- Aumentar número de perguntas. 3 é o limite de tolerância para uso semanal de longo prazo.
- Adicionar pergunta "extra" "porque a liderança quer". Vira ruído, derruba adesão, destrói série temporal.
- Usar para enviar comunicado disfarçado. O canal de pulso é **sagrado** — uma vez quebrada a confiança, não volta.

**[SMOKE_TEST_LEARNING_3]**

---

## 4. Protocolo de fiscalização

> **A pergunta que o auditor fiscal do MTE faz, em ordem:**
>
> *"Mostra o PGR. Onde estão os FRPRT? Qual a metodologia? Cadê as evidências? Cadê o plano de ação? Cadê os registros de monitoramento?"*

### 4.0 Roteiro falado — primeiras 60 segundos com o auditor

Cinco frases ensaiadas valem mais que 200 páginas de documentação quando o fiscal entra. Decore. Adapte com naturalidade — o objetivo é demonstrar domínio do tema, não recitar.

> *"Sr./Sra. Auditor(a), nosso sistema de gerenciamento de FRPRT segue a estrutura do NR-01/GRO conforme a Portaria MTE 1.419/2024 e as atualizações da Portaria 765/2025. Posso mostrar os documentos na ordem que o(a) senhor(a) preferir, ou sugerir esta ordem: pacote de evidências, resultados por dimensão, plano de ação aprovado, e registros de monitoramento contínuo. O laudo técnico completo está assinado pelo responsável técnico CRP <NÚMERO>, e mantemos trilha de auditoria imutável de cada operação realizada na plataforma."*

Adendos curtos para situações específicas:
- Se o fiscal apontar que faltou alguma coisa: *"Posso gerar essa evidência agora ou trazer no formato que o(a) senhor(a) preferir — PDF assinado, planilha de respostas agregadas, ou print das telas do sistema."*
- Se questionar metodologia: *"A metodologia está documentada de forma canônica e hasheada junto com o instrumento aplicado, anexada ao laudo na seção 2 do PDF."*
- Se questionar anonimato dos respondentes: *"Coleta anônima por construção. Nenhuma resposta individual é acessível pelo empregador, e agregações respeitam k-anonymity mínimo de 5 respondentes por corte. Tem fundamento técnico no instrumento."*

**Princípio:** confiança calma. Nunca dizer "não sei" sobre o sistema; dizer "deixe-me confirmar e volto em 5 minutos" se necessário. O sistema tem todas as respostas — você só precisa abrir a tela certa.

Resposta do sistema, na mesma ordem:

### Passo 1 — "Cadê o pacote de evidências?"

Tela: `/nr01/avaliacao/<id>` → seção "Pacote de evidências".

Mostra ao fiscal:
- Hash SHA-256 do instrumento (prova qual versão das 80 questões foi aplicada)
- Hash SHA-256 do pacote (prova de integridade global)
- Datas de abertura/fechamento da coleta
- Convites enviados vs respostas completas (adesão)
- Metodologia canônica (texto literal, anexável ao PGR)
- Assinatura do responsável técnico com CRP

**Se gerar PDF do laudo no botão "Baixar laudo técnico", todos esses elementos vão automaticamente para a capa + seção 10 do documento.**

### Passo 2 — "Quais dimensões foram avaliadas?"

Tela: `/nr01/avaliacao/<id>` → tabela "Resultado por dimensão NR-01".

10 dimensões cobrindo todos os FRPRT do Anexo I do Guia MTE:
1. Carga de trabalho e ritmo
2. Controle e autonomia
3. Exigências emocionais
4. Reconhecimento e recompensa
5. Relações interpessoais (clima)
6. Segurança e estabilidade
7. Violência e assédio
8. Organização do trabalho
9. Liderança e gestão
10. Saúde e bem-estar percebidos

Cada uma com referência normativa específica registrada na tabela `nr01_dimensions.nr01_clause`.

### Passo 3 — "Qual a metodologia?"

`METHODOLOGY_TEXT_V1_0` em [`src/lib/nr01/evidence.ts`](../src/lib/nr01/evidence.ts) — texto canônico anexado ao laudo, hasheado junto com o instrumento. Reproduz integralmente:
- Norma de referência (NR-01 + Portarias 1.419/2024 e 765/2025 + Guia MTE/SIT 2024)
- Instrumento aplicado (Pentagrama NR-01 v1.0, 80 questões, 10 dimensões, Likert 5)
- Pontes com modelo de Maslach (Carga, Controle, Recompensa, Comunidade, Justiça, Valores)
- Garantia de confidencialidade (k-anonymity ≥ 5, anonimato por construção)
- Análise (score 0-100 normalizado, classificação em 5 faixas, ISO ponderado)
- Validade técnica (assinatura + hashes)

### Passo 4 — "Cadê o plano de ação?"

Tela: `/nr01/avaliacao/<id>/plano`. Mostra:
- Itens agrupados por dimensão
- Prioridade P1/P2/P3 + cores
- Responsável **nomeado** (não "o RH")
- Prazo
- Status PDCA (pendente/em_andamento/bloqueado/concluido)
- Checkpoints 30/60/90 carimbados
- KPI específico de sucesso

Plano aprovado tem `next_review_at` agendado em +90 dias automaticamente.

### Passo 5 — "Cadê os registros de monitoramento?"

Tela: `/nr01/avaliacao/<id>/monitoramento`. Mostra:
- Histórico de pulsos semanais
- Adesão por semana
- Scores por dimensão ao longo das semanas (k-anonymity ≥ 3 aplicado na view)
- Eventos de auditoria (`MICRO_PULSE_DISPATCHED`, `MICRO_PULSE_RESPONDED`)

### Passo 6 — "Como confio que esses dados não foram editados?"

Defesa em 3 camadas:

1. **`nr01_audit_log` é append-only.** Trigger `nr01_audit_log_immutable` rejeita UPDATE/DELETE para roles `authenticated`/`anon`. Apenas `postgres`/`supabase_admin` (via SQL direto) ou `service_role` (via JWT) podem mutar — **e qualquer mutação por essas vias deixa rastro fora do próprio log** (ver seção 6.1).

2. **Hash SHA-256 do instrumento + hash SHA-256 do pacote.** Imutáveis após emissão.

3. **`instrument_version` imutável após sair de status `CRIADO`.** Trigger `nr01_assessment_version_guard` impede mudança da versão durante a avaliação. Preserva coerência longitudinal.

### Entregáveis prontos para inspeção

1. **PDF do laudo técnico** (botão "Baixar laudo técnico") — 12 seções, ~25 páginas A4, assinado pelo responsável técnico.
2. **Tabela Excel/CSV das respostas agregadas** (export do dashboard se solicitado).
3. **Print das telas dos passos 1-5** se o fiscal preferir tela em vez de PDF.

---

## 5. Manutenção evolutiva do sistema

### 5.1 Quando a NR-01 atualizar

A NR-01 e seu Guia Técnico são revisados pelo MTE periodicamente. Quando isso acontecer:

1. **Identificar o que mudou** — comparar com a versão atualmente codificada (v1.0 do instrumento).
2. **Registrar em changelog** — criar `docs/nr01_instrument_changelog.md` com data, versão antiga, versão nova e motivo regulatório de cada alteração.
3. **Para mudanças menores** (texto de uma questão, threshold de risco):
   - Editar `supabase/nr01_seed.sql` para a nova versão (`instrument_version='v1.1'`)
   - Aplicar via `node scripts/run_sql.mjs supabase/nr01_seed.sql`
   - Avaliações existentes em `COLETANDO` continuam em v1.0 (trigger garante)
   - Novas avaliações usam v1.1
4. **Para mudanças estruturais** (nova dimensão, mudança de pesos):
   - Criar `supabase/nr01_patch_NNN.sql` com alterações
   - Atualizar `METHODOLOGY_TEXT_V1_0` em [`src/lib/nr01/evidence.ts`](../src/lib/nr01/evidence.ts)
   - Bump de versão (instrument_version='v2.0')

### 5.2 Onde mexer (mapa rápido)

| Mudança | Arquivo |
|---|---|
| Texto de uma questão | `nr01_seed.sql` (UPDATE com `WHERE id = ...`) |
| Adicionar dimensão | `nr01_seed.sql` (INSERT) + `src/types/nr01.ts` (`NR01_DIMENSION_CODES`) + `src/lib/nr01/bridge-pentagrama.ts` (mapeamento) |
| Alterar threshold de risco | `src/types/nr01.ts` (`NR01_RISK_THRESHOLDS`) |
| Texto canônico da metodologia | `src/lib/nr01/evidence.ts` (`METHODOLOGY_TEXT_V1_0`) — após editar, bump da versão |
| Premissas econômicas | `src/lib/nr01/economic.ts` (`DEFAULT_ASSUMPTIONS`, `DEFAULT_CLIENT_INPUTS`) |
| Biblioteca de intervenções | `nr01_seed.sql` seção `nr01_intervention_library` |

### 5.3 Quando Jovane sair de férias

Necessário antes da ausência:
1. **Designar substituto técnico** com CRP ativo
2. **Atualizar `assessments.technical_lead_id`** das avaliações ativas (se for assinar laudos no período)
3. **Documentar handoff** dos clientes em curso (qual fase, qual próxima ação)
4. **Verificar revisões agendadas** que cairão no período → reagendar ou delegar
5. **Confirmar destinatários alternativos** dos disparos manuais de pulso (alguém precisa clicar toda segunda)

### 5.4 Demonstrações comerciais sem expor cliente real

Para mostrar o sistema funcionando para um prospect, **nunca** abra a tela de um cliente real
(viola confidencialidade contratual e LGPD por design). Use o fixture defensável.

**Receita:**

1. Crie uma avaliação demo com nome óbvio: ex. `DEMO Cartório Linhares · 2026-Q2`
2. Total de colaboradores realista para o porte do prospect (entre 20-200 cobre 80% dos casos)
3. Abra coleta
4. Injete fixture: `node scripts/p6_inject.mjs <assessment_id_demo>`
5. Encerre coleta + processe resultados
6. Mostre ao prospect: dashboard, plano sugerido automaticamente, dashboard econômico recalibrado para o porte deles, link público de status, PDF do laudo
7. Após a reunião: `node scripts/p6_cleanup.mjs <assessment_id_demo>` (preserva o
   assessment para reuso; só remove respostas + answers)

**Por que esse fixture é defensável (não "dado de teste"):**

- Bias por respondente + jitter por questão → desvio-padrão e distribuição estatisticamente
  realistas. Um prospect técnico pode olhar para os scores e não detectar padrão sintético.
- Distribuição temporal de 4-6 dias no `submitted_at` → audit log não revela carga em rajada.
- Cortes demográficos rotativos (5 setores × 8 funções × vínculos sortidos) → bate com
  realidade de empresa pequeno-médio porte.
- Reverse_scored aplicado corretamente → questões negativas têm valores armazenados em
  espelho (`6 - target`), preservando o significado psicométrico.
- Distribuição de risco proposital: 4 elevado / 3 atenção / 2 baixo / 1 muito baixo —
  força aparição dos alertas sistêmicos PRE_BURNOUT e BOLHA_SISTEMICA, demonstrando o
  recurso de detecção sem inventar dados extremos.

**Avisos honestos para o prospect** durante a demo:
- "Estes dados são de uma demonstração padronizada, não de um cliente real."
- "Os números econômicos refletem premissas de mercado (DIEESE/ISMA-BR/INSS); ao rodar
  na sua empresa, vamos ajustar com seus dados reais (folha, RAT, FAP)."
- "O fluxo é exatamente este — só os dados mudam."

---

## 6. Operações privilegiadas

### 6.1 Takedown LGPD (Art. 18 — direito à eliminação)

Quando um colaborador anônimo (impossível na prática — não há vínculo) ou um colaborador identificado por canal externo solicita eliminação:

**Princípio:** o `nr01_audit_log` permite mutação por `postgres`/`supabase_admin` *exatamente para este fim*. Cada operação **deixa rastro fora do próprio log**.

Procedimento mínimo:
1. **Abrir ticket de takedown** em pasta versionada do repositório:
   - Criar `lgpd/takedowns/YYYY-MM-DD-<protocolo>.md`
   - Conteúdo: data, protocolo da solicitação, fundamento legal, escopo (qual dado/registro), SQL exato a ser executado
   - Commit + push (rastro imutável fora do banco)
2. **Executar via SQL direto no Supabase** com role `postgres` (Dashboard SQL Editor ou `scripts/run_sql.mjs`)
3. **Anexar log de execução** ao mesmo arquivo do ticket (ID das linhas removidas, timestamp, usuário operador)

**Por que não automatizar pela aplicação:** uma rota da app que faça takedown abriria caminho pra dev junior chamar UPDATE/DELETE no audit por engano. Bloquear na role + exigir SQL direto + ticket é defesa em profundidade. Custo: mais lento. Benefício: defensável em juízo.

### 6.2 Revogar link público de status

Tela: `/nr01/avaliacao/<id>` → seção "Link público para o cliente" → **Revogar** ou **Revogar e gerar novo**. Soft delete via `revoked_at`. Próximo acesso retorna "Link inválido ou expirado".

Quando fazer:
- Cliente troca de RH responsável
- Suspeita de vazamento do link
- Final do contrato de consultoria
- Antes de mudar identidade visual da empresa do cliente (a tela mostra o nome atual)

### 6.3 Regenerar PDF (e a questão do hash)

`Baixar laudo técnico` regenera o PDF a cada clique. **O hash original (`pdf_sha256` no `nr01_evidence_pack`) permanece imutável** — primeira geração, sempre. Regenerações sobrescrevem `pdf_byte_size` e `pdf_page_count` para tracking, nunca o hash original.

> **Importante para fiscalização:** o documento oficial é o emitido na primeira geração com aquele hash. Regenerações servem para reimpressão. Se o cliente tem em mãos um PDF cujo hash não bate com o registrado, isso é fortuito (template pode ter sido revisado entre regenerações) — em caso de divergência, o hash original do banco é a referência. Adicionar essa nota literal ao METHODOLOGY_TEXT em revisão futura.

### 6.4 Reset de uma avaliação (refazer do zero)

Sem operação de "reset" pela UI. Para refazer:
1. **Arquivar a avaliação atual** (status → `ARQUIVADO` via SQL direto)
2. **Criar nova avaliação** para a mesma `company_id`
3. Não tentar reabrir status anteriores — o trigger `version_guard` impede mudanças críticas após o COLETANDO

Se for absolutamente necessário (raríssimo):
- Backup completo das tabelas envolvidas antes
- SQL direto via `postgres` role
- Ticket explicando o porquê em `docs/operacoes/`

### 6.5 Limpar fixture de smoke test

Após o smoke test do P6 (ou qualquer teste em produção que tenha gerado dados):
```bash
node scripts/p6_cleanup.mjs <assessment_id>
```
Remove apenas as `nr01_responses` e `nr01_response_answers` do assessment informado. Não toca em mais nada (assessment, plano, pulsos preservados).

---

## 7. Ambientes e deploy

### 7.1 Variáveis de ambiente em produção (Vercel)

Settings → Environment Variables. **Mínimo obrigatório:**

```
NEXT_PUBLIC_SUPABASE_URL=https://<ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
NEXT_PUBLIC_APP_URL=https://quantum5g.vercel.app
RESEND_API_KEY=re_...
```

**Recomendado (defaults razoáveis se ausente, mas configure antes do primeiro cliente real):**

```
NR01_EMAIL_FROM=NR-01 Quantum5G <noreply@dominio-verificado.com.br>
NR01_CHROMIUM_PACK_URL=https://github.com/Sparticuz/chromium/releases/download/v131.0.1/chromium-v131.0.1-pack.tar
GROQ_API_KEY=gsk_...     # se usar IA do Pentagrama
OPENAI_API_KEY=sk-...    # idem
```

### 7.2 Aplicação dos patches SQL em ordem

A ordem importa. Em qualquer banco novo (dev, staging, prod):

```bash
# Pentagrama base (criadas pela equipe original)
node scripts/run_sql.mjs supabase/schema.sql
node scripts/run_sql.mjs supabase/rls.sql
node scripts/run_sql.mjs supabase/seed.sql

# NR-01
node scripts/run_sql.mjs supabase/nr01_schema.sql
node scripts/run_sql.mjs supabase/nr01_rls.sql
node scripts/run_sql.mjs supabase/nr01_seed.sql
node scripts/run_sql.mjs supabase/nr01_patch_001.sql
node scripts/run_sql.mjs supabase/nr01_patch_002.sql
node scripts/run_sql.mjs supabase/nr01_patch_003.sql
node scripts/run_sql.mjs supabase/nr01_patch_004.sql
```

`nr01_schema.sql` tem pré-check que aborta com mensagem clara se Pentagrama base estiver faltando. `nr01_rls.sql` é idempotente (DROP POLICY IF EXISTS). Patches 001-004 idempotentes.

Confirmação rápida ("o banco está pronto?"):
```bash
node scripts/run_sql.mjs scripts/_p6_preflight_objects.sql
```
Resultado esperado: 12/12 verde.

### 7.3 Build em ambiente Windows com WDAC

**Sintoma:** `next build` falha com erro de Turbopack (`@next/swc-win32-x64-msvc` bloqueado pela política de Application Control).

**Solução:** usar webpack:
```bash
npx next build --webpack
```

Se o WDAC for política corporativa permanente, criar exceção para os arquivos `.node` em `node_modules/@next/swc-*` e `node_modules/@sparticuz/chromium-*`. Conversa com TI da empresa.

### 7.4 Deploy Vercel

Repositório com auto-deploy: cada `git push` para `main` sobe novo build em <2 min. Não há necessidade de `vercel deploy` manual.

`vercel.json` define memory 1024MB e maxDuration 60s **apenas** para `src/app/api/nr01/avaliacao/[id]/pdf/route.ts`. Outras rotas usam defaults da Vercel.

> Quando adicionar novas rotas API que demandem PDF, **adicione a entrada correspondente em `vercel.json`** ou herdarão limite default (10s + 1024MB) que pode ser insuficiente para Playwright.

### 7.5 Observabilidade mínima

- **Logs da função PDF**: Vercel → Deployments → última → Functions → `pdf/route` → Logs
- **Logs do Resend**: https://resend.com → Activity → ver entregabilidade dos pulsos
- **Audit log do banco**: query SQL direta via `scripts/run_sql.mjs` com:
  ```sql
  SELECT event_type, COUNT(*), MAX(created_at) FROM nr01_audit_log
  WHERE created_at > now() - interval '7 days' GROUP BY event_type ORDER BY MAX(created_at) DESC;
  ```

---

## 8. Riscos conhecidos e mitigações

### 8.1 Domínio Resend não-verificado (sandbox)

**Risco:** com `RESEND_API_KEY` em sandbox, emails saem de `onboarding@resend.dev` — qualquer RH sério marca como phishing. Rate limit baixo. Domínio visível ao destinatário.

**Mitigação:** verificar domínio no Resend antes do primeiro cliente pago. ~10 min de configuração + acesso ao DNS do domínio. Trocar `NR01_EMAIL_FROM` em Vercel para `noreply@quantum5g.com.br` (ou equivalente).

**Status:** ❗ Pendente. Bloqueia primeiro cliente pago.

### 8.2 Cold start do PDF na Vercel

**Risco:** primeiro PDF do dia pode levar 30-45s. Mensagem do botão atualmente diz "até 30s" — pode causar abandono.

**Mitigação observacional:** medir nos primeiros 10 PDFs gerados em prod. Se passar consistentemente de 30s, ajustar texto do `DownloadPdfButton.tsx` para "até 45s no primeiro uso do dia". Se passar de 60s, considerar:
- Aumentar `maxDuration` em `vercel.json` (até 300s no plano Pro)
- Migrar para serviço externo (Browserless.io tem free tier)
- Pre-warming via cron ping diário

**Status:** ⚠ Monitorar.

### 8.3 Fontes Google em PDF dependem de `networkidle`

**Risco:** se cold cache de DNS na Vercel atrasa fetch das fontes, Playwright pode renderizar com fallback Georgia/Arial em vez de Source Serif 4 / Inter. PDF sai feio.

**Mitigação:** monitorar nos primeiros 10 PDFs. Se 2+ vierem sem fonte correta, embedar Source Serif 4 + Inter como base64 no CSS (`pdf-template.ts`). 2 arquivos WOFF2 ~200KB. Patch 005 curto (15 min).

**Status:** ⚠ Monitorar.

### 8.4 PDF público regenera (não serve original do Storage)

**Risco:** cliente baixa PDF hoje, daqui a 6 meses re-baixa, hash regenerado pode ser diferente (mesmo conteúdo, micro-diferenças no Chromium). Em juízo, "o que o cliente tem em mãos" pesa.

**Mitigação MVP:** documentar em `METHODOLOGY_TEXT_V1_0` que "o documento oficial é o emitido na data X com hash Y; regenerações servem para reimpressão". Header `X-PDF-Original-SHA256` na resposta da API pública continua expondo o hash imutável.

**Quando migrar para Supabase Storage:** três gatilhos, qualquer um aciona a migração:
1. **50º PDF gerado** no sistema (volume sinaliza maturidade — DPOs começam a observar)
2. **Primeira questão legal** (qualquer disputa que toque cadeia de custódia do documento)
3. **Primeiro cliente com >500 colaboradores** (DPO próprio + due diligence de fornecedor; "regeneramos o PDF" gera pergunta desconfortável mesmo sem disputa)

Migração: salvar PDF em Supabase Storage na primeira geração (path `nr01/{assessment_id}/laudo-v1.pdf`), atualizar `nr01_evidence_pack.pdf_url` com URL assinada de longo prazo, servir o mesmo binary nas requisições subsequentes em vez de regenerar. Estimado em 3-4 horas. Hash original (`pdf_sha256`) já está no banco — passa a referenciar o binário armazenado, não regenerado.

**Status:** ⚠ Monitorar volume + qualquer questão jurídica.

### 8.5 Filtro de bot no acesso público é simples (regex)

**Risco:** filtro `/(bot|crawl|spider|fetch|curl|wget)/i` no User-Agent pode falhar dos dois lados (perder bot real, marcar consultor com extensão de browser).

**Mitigação:** observar nas primeiras 4-8 semanas se aparecem acessos legítimos sendo filtrados ou contagens de visualização suspeitamente altas. Se acontecer, refinar com fingerprinting via Vercel Edge Config.

**Status:** ⚠ Monitorar.

### 8.6 Build local com WDAC

**Risco:** desenvolvedor novo no projeto bate em "política de Controle de Aplicativo" ao rodar `next build` ou `supabase` CLI.

**Mitigação:** documentado na seção 7.3. Sem solução autônoma — depende da política da TI da empresa.

**Status:** ✓ Documentado.

**[SMOKE_TEST_LEARNING_8]** — adicionar aqui qualquer risco descoberto no smoke test ao vivo

---

## 9. Próximas entregas pós-26/05

Em ordem de impacto regulatório/comercial:

### Fila imediata (junho-julho)

1. **Migrar PDF para Supabase Storage** (resolve risco 8.4)
2. **Domínio verificado no Resend** (destrava primeiro cliente pago — risco 8.1)
3. **Cron real para micro-pulsos** (Vercel Cron ou Supabase Cron) — substitui o disparo manual da seção 3.3
4. **Suíte de testes RLS automatizada** em `supabase/tests/nr01_rls_*.test.sql` rodando em CI

### Fila tática (agosto-outubro)

5. **10 agentes IA especializados** (1 por dimensão) preenchendo `nr01_dimension_scores.ai_summary` — usar Groq que já está no projeto
6. **Macro-laudo gerado por IA** em `nr01_assessment_results.macro_report_text` revisado pelo responsável técnico
7. **WhatsApp guiado** para coleta IC (substitui email para públicos com baixa alfabetização digital)
8. **Análise de perguntas abertas via NLP** (sentiment + tópicos)

### Fila estratégica (Q4 2026 / Q1 2027)

9. **Assinatura ICP-Brasil** real no pacote de evidências (campos já modelados no schema)
10. **Integração eSocial** (evento S-2240 — condições ambientais do trabalho)
11. **Bridge Pentagrama com correlação estatística real** (Pearson/Spearman) quando N ≥ 200
12. **Benchmark setorial anônimo** (comparativo entre clientes — vira diferencial comercial)
13. **CertificaÇão consultores externos** (marketplace) — escala o produto além do Jovane

---

## Apêndice A — Comandos rápidos

```bash
# Pré-flight do banco (12/12 esperado)
node scripts/run_sql.mjs scripts/_p6_preflight_objects.sql

# Aplicar patch novo
node scripts/run_sql.mjs supabase/nr01_patch_NNN.sql

# Smoke test fixture (depois do Jovane criar avaliação)
node scripts/p6_inject.mjs <assessment_id>

# Verificar audit log de uma avaliação específica
node scripts/p6_audit_check.mjs <assessment_id>

# Cleanup de fixture de teste
node scripts/p6_cleanup.mjs <assessment_id>

# Build local em ambiente Windows com WDAC
npx next build --webpack

# TypeScript check sem build
npx tsc --noEmit
```

---

## Apêndice B — Eventos do audit log (referência)

| Evento | Origem | Payload típico |
|---|---|---|
| ASSESSMENT_CREATED | criar avaliação | name, modality, expectedResp |
| COLLECTION_OPENED | botão abrir coleta | {} |
| RESPONSE_SUBMITTED | submit anônimo | response_id, n_answers |
| COLLECTION_CLOSED | botão encerrar | {} |
| RESULTS_PROCESSED | botão processar | iso_score, iso_risk_level, n_respondents, n_alerts |
| ECONOMIC_RECALCULATED | recalcular dashboard | iso, total_workers, na_total, ai_net |
| ACTION_PLAN_CREATED | primeira ação no plano | {} |
| ACTION_ITEM_ADDED | item manual | dimension_code, title, priority |
| ACTION_ITEMS_AUTO_SUGGESTED | sugestão automática | n_added |
| ACTION_ITEM_STATUS_CHANGED | mudar status PDCA | item_id, status |
| ACTION_ITEM_CHECKPOINT | check 30/60/90 | item_id, checkpoint |
| ACTION_PLAN_APPROVED | aprovar plano | plan_id, next_review_at |
| EVIDENCE_PACK_GENERATED | botão gerar pacote | pack_sha256, instrument_sha256, n_responses |
| PDF_GENERATED | baixar PDF (consultor) | pdf_sha256, pdf_byte_size, pdf_page_count |
| PULSE_MONITORING_ACTIVATED | ativar monitoramento | n_emails, n_invalid, day_of_week |
| PULSE_MONITORING_DEACTIVATED | desativar | {} |
| MICRO_PULSE_DISPATCHED | disparar pulso | dispatch_id, week_number, n_invites_sent |
| MICRO_PULSE_RESPONDED | responder pulso | dispatch_id, week_number, n_answers |
| PUBLIC_STATUS_TOKEN_CREATED | gerar link cliente | revoke_others |
| PUBLIC_STATUS_TOKEN_REVOKED | revogar link | token_id |
| PUBLIC_STATUS_ACCESSED | cliente abre tela | token_id |
| PUBLIC_STATUS_PDF_DOWNLOADED | cliente baixa PDF | token_id, regen_sha256, original_sha256 |
