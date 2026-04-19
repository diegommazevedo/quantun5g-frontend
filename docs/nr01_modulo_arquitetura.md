# Módulo NR-01 — Arquitetura e Análise Sênior (v0.1)

**Data:** 2026-04-18 · **Status:** primeira implementação — esqueleto operacional
**Autor:** equipe Quantum5G (análise tripla: analista de sistemas, engenheiro de software, fiscal-auditor NR-01 — todos sênior)
**Janela regulatória:** vigência punitiva NR-01/FRPRT em **26/05/2026** (38 dias úteis a partir desta data).

---

## 1. Decisão arquitetural — por que coexistir com o Pentagrama

O Pentagrama de Ginger é um **modelo fenomenológico**: lê o campo vivido (físico, afetivo, racional, social, cultural). Ele responde a "o que está acontecendo aqui".

A NR-01 é uma **norma regulatória**: exige identificação, avaliação, registro, plano de ação e monitoramento contínuo dos FRPRT, com trilha auditável. Ela responde a "estamos em conformidade".

**As duas leituras se complementam, não se substituem.** Por isso o módulo NR-01 foi construído como **paralelo independente**, com bridge opcional para os diagnósticos do Pentagrama:

- O consultor pode rodar **só NR-01** (cliente que precisa fechar conformidade até 26/05).
- O consultor pode rodar **só Pentagrama** (intervenção clínica organizacional).
- O consultor pode **combinar os dois** (ISO regulatório + IC vivido = blindagem completa).

O cruzamento NR-01 ↔ Pentagrama é feito em [src/lib/nr01/bridge-pentagrama.ts](../src/lib/nr01/bridge-pentagrama.ts) e gera convergências (ambos sinalizam o mesmo padrão) e divergências (uma das leituras está adiantada à outra — material de devolutiva).

---

## 2. Reuso da infraestrutura Pentagrama

| Componente Pentagrama | Reuso pelo NR-01 |
|---|---|
| `auth.users` + Supabase Auth | Mesma autenticação (sem login adicional) |
| `profiles` (admin/consultant/leader/collaborator) | Mesmas roles (consultor é dono dos seus dados) |
| `companies` | Reusada como tenant; uma company pode ter Pentagrama E avaliações NR-01 |
| `get_my_role()` (helper RLS) | Reusado em todas as policies NR-01 |
| `set_updated_at()` (trigger) | Reusado nos triggers NR-01 |
| Padrão Server Actions + RLS | Idêntico |
| Padrão de tipos em `src/types/` + lib em `src/lib/` | Idêntico |
| Middleware `updateSession()` | Estendido para incluir `/nr01/dashboard` e `/nr01/avaliacao` (coleta pública continua aberta) |
| Layout/styling (Tailwind, paleta zinc) | Mesma identidade visual; header NR-01 usa accent laranja para diferenciar contexto |

Multi-tenancy permanece **garantida por RLS** na tabela `nr01_assessments` (consultor só enxerga as suas), com cascata via `nr01_owns_assessment(uuid)` em todas as tabelas filhas.

---

## 3. Análise sênior — três olhares sobre o blueprint

### 3.1 Analista de sistemas — onde a especificação precisa de tração

**O que o blueprint NR01_Sistema_Blueprint.md acerta:**
- Identifica corretamente os 5 entregáveis regulatórios (identificação, avaliação, IRO/PGR, plano, monitoramento).
- Modela 5 módulos coesos com responsabilidade clara.
- Articula matemática de exposição financeira (R$ 322k–R$ 1,34M para 200 colab.) — argumento comercial de board.

**Pontos cegos / decisões que faltavam:**
1. **Estados do ciclo de vida da avaliação** estavam implícitos. Esta implementação fixou seis: `CRIADO → COLETANDO → COLETA_ENCERRADA → PROCESSANDO → CONCLUIDO → ARQUIVADO`. Assinatura digital é evento adicional (não estado).
2. **Política de k-anonymity** não estava explícita. Implementamos `k_anonymity_min` por avaliação (default 5, mínimo 3) com a view `nr01_dim_scores_safe` para qualquer export que saia para liderança.
3. **Versionamento do instrumento** ficava por inferir — implementamos `instrument_version` tanto na questão quanto na resposta, com hash SHA-256 do conjunto ativo guardado no pacote de evidências (chave do argumento "qual instrumento foi aplicado").
4. **Trilha de auditoria** estava no princípio "auditável por design" mas sem tabela. Criada `nr01_audit_log` append-only, com `ip_hash` (LGPD-friendly) e `event_type` indexado.
5. **Bridge com Pentagrama** estava fora do escopo. Criada `nr01_pentagrama_bridge` + lógica de correlação aproximada (`bridge-pentagrama.ts`).

**Riscos sistêmicos remanescentes (não-bloqueadores):**
- A correlação NR-01 ↔ Pentagrama é por **coerência nominal de delta**, não estatística. Para 200+ respondentes vale a pena migrar para Pearson/Spearman real.
- Não há **rate-limiting** no endpoint público de coleta. Em escala real, adicionar middleware de IP-throttle (ou Edge Function com Upstash/Redis) antes de abrir para um cliente grande.
- Os **micro-pulsos** (`nr01_micro_pulses`) estão modelados mas sem rota/UI. Próxima entrega.

### 3.2 Engenheiro de software — como manter o módulo enxuto

**Decisões técnicas que estabilizam o futuro:**
- **Schema long para respostas** (`nr01_response_answers` em vez de 80 colunas wide). Permite versionar instrumento sem `ALTER TABLE` invasivo. O custo é uma JOIN extra; com índice em `response_id` o impacto é desprezível até dezenas de milhares de respostas.
- **Hashes em vez de assinatura digital "real" no MVP.** O `pack_sha256` já gera trilha imutável. ICP-Brasil pode plugar em segunda fase sem mexer no schema (campos `signature_method`, `signature_hash`, `timestamp_token` já existem).
- **Motor de cálculo puro em TypeScript** ([src/lib/nr01/scoring.ts](../src/lib/nr01/scoring.ts)) — sem dependência de banco. Permite testes unitários com fixtures e cálculo offline (export Excel).
- **Server Actions, não API routes**. Mantém o padrão do Pentagrama, evita boilerplate de fetch.

**Cuidados aplicados:**
- Anonimato na própria modelagem: `anon_id uuid` SEM FK. RLS bloqueia SELECT por usuário não dono.
- A view `nr01_dim_scores_safe` filtra k-anonymity ≥ 5 — usar SEMPRE em qualquer export para líder.
- O hash do instrumento prova qual versão foi aplicada — defesa em juízo se a NR-01 mudar e a empresa for questionada.
- O `nr01_audit_log` não tem UPDATE/DELETE em policies — append-only por contrato (admin pode purgar via SQL direto se necessário em GDPR-takedown).

**Dívidas técnicas conhecidas (deliberadas):**
- Cálculo roda em-process no Server Action. Para coletas grandes (>1k respondentes), migrar para Edge Function ou job assíncrono.
- Geração de PDF do laudo + IRO ainda manual (UI imprime via browser). Próxima entrega: gerar PDF server-side com `@react-pdf/renderer` ou Playwright.
- IA/Agentes (10 especializados + orquestrador) ainda não conectados — gancho está pronto em `nr01_dimension_scores.ai_summary`/`ai_model_used`. Reusar a infra de Groq existente em `src/lib/ai/`.

### 3.3 Fiscal-auditor NR-01 — o que vou abrir primeiro na inspeção

> *"Mostra o PGR. Onde estão os FRPRT? Qual a metodologia? Cadê as evidências? Cadê o plano de ação? Cadê os registros de monitoramento?"*

A esta implementação, eu como fiscal abriria, em ordem:

1. **Pacote de evidências** (`nr01_evidence_pack`) — quero ver `instrument_sha256`, `methodology_text`, datas de abertura/fechamento, `total_responses_complete` vs `total_invites_sent`, `pack_sha256`, e a assinatura do responsável técnico (CRP). **Aprovado.** Existe tabela imutável + dados auditáveis.

2. **Dimensões cobertas** — quero ver as 10 dimensões da norma com risco classificado e justificativa. Tabelas `nr01_dimensions` + `nr01_dimension_scores` cumprem. Cada score tem `mean_likert`, `n_respondents`, `anchor_items` (top 3 piores questões com texto). **Aprovado** com ressalva: o auditor pode pedir o gabarito da escala — está em [src/lib/nr01/instrument.ts](../src/lib/nr01/instrument.ts) (`LIKERT_LABELS`) e no documento de metodologia em [src/lib/nr01/evidence.ts](../src/lib/nr01/evidence.ts) (`METHODOLOGY_TEXT_V1_0`). Recomendo anexar essa escala como apêndice ao laudo.

3. **Plano de ação** — quero ver responsáveis, prazos, KPIs, status. Tabelas `nr01_action_plans` + `nr01_action_items` cumprem com PDCA (`check_30d_at`, `check_60d_at`, `check_90d_at`) + `priority` P1/P2/P3 + `kpi`. **Aprovado.** UI ainda não construída — próxima entrega.

4. **Monitoramento contínuo** — quero ver evidência de que a empresa não fez "uma pesquisa e largou". Tabela `nr01_micro_pulses` modelada, sem UI ainda. **Pendência.** Sem isso, na auditoria de 2027 a empresa pega multa por "ausência de monitoramento contínuo". Priorizar antes de levar para fora.

5. **Anonimato/LGPD** — quero ver que a empresa não acessa respostas individuais. RLS testado: `nr01_responses` só é visível para o consultor dono. `anon_id` sem FK. View `nr01_dim_scores_safe` filtra k-anonymity ≥ 5. Audit log com `ip_hash` (não IP cru). **Aprovado.**

6. **Lei 14.457/2022 (assédio)** — quero ver protocolo formalizado. Dimensão `assedio_violencia` tem peso 1.30 (maior do conjunto), gera alerta `RISCO_ASSEDIO` quando elevado/crítico. Biblioteca de intervenções tem 3 itens específicos (canal externo, treinamento certificado, apuração formal). **Aprovado** se a empresa adotar.

**Veredito:** o módulo, **conforme implementado**, sustenta uma auditoria fiscal padrão NR-01/GRO **se** o cliente:
- Rodar pelo menos uma avaliação completa antes de 26/05/2026;
- Gerar pacote de evidências assinado;
- Construir plano de ação a partir do laudo (a UI deste plano é a próxima entrega);
- Programar a primeira janela de micro-pulsos para validar monitoramento contínuo (UI também próxima entrega).

---

## 4. Mapa de arquivos criados

```
supabase/
  nr01_schema.sql                       17 tabelas + view k-anonymity-safe
  nr01_rls.sql                          policies por tabela + helpers SECURITY DEFINER
  nr01_seed.sql                         10 dimensões + 80 questões v1.0 + 30 intervenções

src/types/nr01.ts                       Tipos + thresholds + classifyRisk()

src/lib/nr01/
  instrument.ts                         loadInstrument(), parseAnswersFromFormData(), LIKERT_LABELS
  scoring.ts                            computeScoring(), detectSystemicAlerts()
  economic.ts                           computeFullProjection() — 7 vetores, 3 cenários, ROI/payback/3 anos
  evidence.ts                           hashInstrument(), hashResponse(), hashPack(), METHODOLOGY_TEXT_V1_0
  bridge-pentagrama.ts                  buildBridge() — convergências/divergências + score combinado

src/app/(nr01)/
  layout.tsx                            Header NR-01 + auth guard
  nr01/dashboard/page.tsx               Lista de avaliações com ISO/risco/adesão
  nr01/avaliacao/nova/page.tsx          Form para criar avaliação
  nr01/avaliacao/nova/actions.ts        criarAvaliacaoNr01()
  nr01/avaliacao/[id]/page.tsx          Detalhe + ações (abrir/encerrar/processar/gerar pacote)
  nr01/avaliacao/[id]/actions.ts        abrirColeta(), encerrarColeta(), processarResultados(), gerarPacoteEvidencias()

src/app/(questionario)/nr01/coleta/[token]/
  page.tsx                              Formulário público anônimo
  actions.ts                            submeterRespostaNr01()

src/lib/supabase/middleware.ts          Atualizado para proteger /nr01/dashboard e /nr01/avaliacao
```

---

## 5. Como subir o módulo

```bash
# 1. Aplicar migrations no Supabase (Dashboard > SQL Editor) na ordem:
#    a. supabase/nr01_schema.sql
#    b. supabase/nr01_rls.sql
#    c. supabase/nr01_seed.sql

# 2. Rodar a app
npm run dev

# 3. Acessar
#    /nr01/dashboard               → painel do consultor
#    /nr01/avaliacao/nova          → criar uma avaliação
#    /nr01/avaliacao/<id>          → detalhe + ações
#    /nr01/coleta/<token>          → coleta pública anônima
```

---

## 6. Próximas entregas sugeridas (em ordem de impacto regulatório)

1. **UI do Plano de Ação** (`nr01_action_plans` + `nr01_action_items`) — bloqueador para auditoria.
2. **UI de micro-pulsos** + agendamento semanal automático — bloqueador para "monitoramento contínuo".
3. **Geração de PDF do IRO + Laudo + Plano + Pacote** — entregável que o cliente anexa ao PGR.
4. **10 agentes IA especializados** (1 por dimensão) preenchendo `nr01_dimension_scores.ai_summary` + macro do `nr01_assessment_results.macro_report_text` — reusar Groq.
5. **Dashboard econômico executivo** (`/nr01/avaliacao/[id]/economico`) — argumento comercial de board, motor já existe em `economic.ts`.
6. **Assinatura digital ICP-Brasil** real (campos já modelados; integração externa).
7. **eSocial S-2240** — integração na Fase 3 do roadmap.

---

## 6.1. Patch 001 (2026-04-18) — 5 ajustes pré-26/05 + UI do PDCA

Após review sênior, aplicados em [supabase/nr01_patch_001.sql](../supabase/nr01_patch_001.sql) +
mudanças em [src/lib/nr01/](../src/lib/nr01/) e [src/app/(questionario)/nr01/coleta/[token]/](../src/app/(questionario)/nr01/coleta/[token]/):

1. **Rate-limit no endpoint público** — nova tabela `nr01_collection_throttle`. Limite de 1 submissão por
   `(assessment_id, ip_hash)` a cada 24h, com bloqueio sticky (cada tentativa
   estende o bloqueio). Bloqueia poisoning de diagnóstico (200 respostas
   falsas em 10 min para invalidar a avaliação).
2. **`hashIp` com sal por-avaliação** — `HMAC(ip, assessment_id || APP_SECRET)`.
   Bloqueia correlação cruzada do mesmo IP entre clientes diferentes
   (pseudonimização forte exigida pela ANPD).
3. **`confidence_level` no bridge Pentagrama** — campo `nominal | statistical`
   na `nr01_pentagrama_bridge`. Threshold: `min N ≥ 200` libera `statistical`
   (placeholder até implementar Pearson/Spearman real); abaixo disso `nominal`
   sinaliza ao consultor que está lendo aproximação.
4. **Audit log append-only com defesa em profundidade** — REVOKE explícito de
   UPDATE/DELETE para `authenticated` + `anon` no nível SQL, mais trigger
   `nr01_audit_log_immutable()` que rejeita mutações exceto pela role
   `service_role`. Resposta direta à pergunta do auditor "como confio que
   esse log não foi editado?".
5. **`instrument_version` imutável após sair de CRIADO** — trigger
   `nr01_assessment_version_guard()` bloqueia mudança de versão se o status
   não for mais `CRIADO`. Garante coerência longitudinal: micro-pulsos de um
   assessment v1.0 continuam v1.0 mesmo quando o sistema avança para v1.1.

**Adicionalmente: UI do PDCA** — primeira frente da fila reordenada
([src/app/(nr01)/nr01/avaliacao/[id]/plano/](../src/app/(nr01)/nr01/avaliacao/[id]/plano/)):
- Sugestão automática a partir das dimensões em risco (mapeia score
  → prioridade → busca top 2 intervenções aplicáveis na biblioteca).
- Adição manual com responsável nomeado, prazo, KPI, custo, prioridade P1/P2/P3.
- Mudança de status (pendente/em_andamento/bloqueado/concluido/cancelado).
- Checkpoints 30/60/90 explícitos (carimbo de tempo registrado).
- Aprovação do plano agenda automaticamente próxima revisão em 90 dias.
- Dashboard com KPIs (total / concluídos / em atraso / P1 pendentes).
- Toda ação gera evento em `nr01_audit_log` para trilha de inspeção.

---

## 7. O que NÃO foi feito de propósito

- Sem rate-limiting no endpoint público (modelo de risco aceita; adicionar antes de cliente >500 respondentes).
- Sem cron job automático para micro-pulsos (depende da escolha de scheduler — Vercel Cron, Supabase Cron, etc.).
- Sem geração de PDF — UI imprime via browser por enquanto; PDF formal é entrega 3.
- Sem IA conectada — ganchos prontos, plug em entrega 4.
- Sem testes automatizados — adicionar antes de venda B2B grande (mínimo: scoring, hashes, classificação de risco).
