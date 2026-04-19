P6.fixture pronto + P7 draft entregue. Aguardando assessment_id do Jovane para fechar smoke + Estação 14.

## P6 — fixture preparado (não executado)

3 artefatos novos:

1. supabase/p6_fixture_responses.sql (NÃO ESTÁ NO supabase/, ESTÁ EM scripts/)
   → na verdade scripts/p6_fixture_responses.sql
   → cria 2 funções idempotentes:
     • nr01_p6_inject_responses(uuid) — insere 24 respostas com 24 × 80 = 1920 answers
     • nr01_p6_cleanup_responses(uuid) — remove só responses + answers do assessment
   → APLICADO no banco (somente as definições; nada injetado)
   → verificação inject_fn_present=true, cleanup_fn_present=true

2. scripts/p6_inject.mjs <assessment_id>
   → wrapper Node que valida UUID + chama nr01_p6_inject_responses
   → imprime resumo jsonb (responses_inserted, answers_inserted, leaders_simulated, window_start/end, distribution_targets)

3. scripts/p6_cleanup.mjs <assessment_id>
   → wrapper Node para nr01_p6_cleanup_responses

4. scripts/p6_audit_check.mjs <assessment_id>  (Estação 14, pronta)
   → query agrupando event_type, contagem, primeira/última ocorrência
   → checklist contra 18 eventos esperados
   → lista os faltantes

Distribuição de scores que o fixture vai gerar (após processamento via "Processar resultados"):

| Dimensão                    | Nível alvo  | Mean Likert | Score ~ |
|-----------------------------|-------------|-------------|---------|
| carga_trabalho              | elevado     | 2.7         | 42      |
| exigencias_emocionais       | elevado     | 2.7         | 42      |
| saude_bem_estar             | elevado     | 2.7         | 42      |
| lideranca_gestao            | elevado     | 2.7         | 42      |
| controle_autonomia          | atencao     | 3.3         | 57      |
| organizacao_trabalho        | atencao     | 3.3         | 57      |
| reconhecimento              | atencao     | 3.3         | 57      |
| relacoes_interpessoais      | baixo       | 3.9         | 72      |
| assedio_violencia           | baixo       | 3.9         | 72      |
| estabilidade_seguranca      | muito_baixo | 4.5         | 87      |

Variabilidade: bias por respondente uniforme [-0.5, +0.5] + jitter por questão uniforme [-0.7, +0.7]. Clamp [1,5]. Reverse_scored aplicado corretamente (armazena 6 - target para questões negativas).

Distribuição temporal: submitted_at distribuído em janela de 4-6 dias antes de now(). Realismo de auditoria.

Cortes demográficos: 5 setores rotativos × 8 funções rotativas × vínculos sortidos (4 CLT base + 1 PJ + 1 estágio + 1 terceirizado) × 5 tempos de casa. ~3 lideranças (índices 8/16/24).

Alertas sistêmicos esperados após processamento:
- PRE_BURNOUT (carga + exigências emocionais + saúde todos em elevado)
- BOLHA_SISTEMICA (4 dim em risco elevado)

Como Jovane vai usar (instruções enxutas):
1. Login + criar avaliação (Cartório do Primeiro Ofício de Linhares, 27 colab)
2. Manda o assessment_id pra mim (UUID que aparece na URL /nr01/avaliacao/<id>)
3. Eu rodo: node scripts/p6_inject.mjs <UUID> — confere o resumo
4. Jovane clica "Encerrar coleta" → "Processar resultados"
5. Jovane segue Estações 8-13 conforme docs/smoke_test_p6.md
6. Quando terminar, eu rodo: node scripts/p6_audit_check.mjs <UUID> + atualizo docs/smoke_test_p6.md com vereditos
7. Cleanup: node scripts/p6_cleanup.mjs <UUID> (quando ele autorizar limpar)

## P7 — runbook draft entregue

docs/nr01_manual_operacao.md criado, ~600 linhas, 9 seções + 2 apêndices:

1. Setup inicial de novo cliente (clique-a-clique)
2. Interpretação dos resultados + construção do plano (incluindo tabela dos 5 alertas sistêmicos)
3. Configuração de micro-pulsos sem quebrar (incluindo o "o que NÃO fazer")
4. PROTOCOLO DE FISCALIZAÇÃO — espinha dos 6 passos do auditor (este é o coração do runbook conforme ênfase do Diego)
5. Manutenção evolutiva (mapa "onde mexer quando NR-01 atualizar")
6. Operações privilegiadas — incluindo rota completa de takedown LGPD (ticket → SQL direto → log do operador), regeneração de PDF, reset de avaliação, cleanup de fixture
7. Ambientes e deploy — variáveis Vercel, ordem dos patches SQL, build com WDAC, vercel.json
8. Riscos conhecidos e mitigações — os 4 riscos reportados nos P3-P5 + WDAC + filtro de bot, todos com status (pendente / monitorar / documentado)
9. Próximas entregas pós-26/05 — fila imediata (jun-jul), tática (ago-out), estratégica (Q4-Q1)

Apêndice A: comandos rápidos (cola-cola)
Apêndice B: tabela de 22 eventos do audit log com origem e payload típico

Marcadores [SMOKE_TEST_LEARNING_*] incluídos em 4 pontos onde achados específicos do smoke test ao vivo vão entrar:
- 1.5 (criar/processar avaliação)
- 2 (interpretação + plano)
- 3 (micro-pulsos)
- 8 (riscos descobertos)

Quando smoke fechar, são 10 minutos para incorporar.

Decisões importantes registradas no P7 que merecem destaque:
- Domínio Resend é primeira pendência da seção 8 (status ❗ Pendente. Bloqueia primeiro cliente pago)
- Trigger explícito para migrar PDF para Supabase Storage = "50º PDF gerado OU primeira questão legal, o que vier primeiro"
- LGPD takedown documentado com 3 etapas (ticket no git → SQL direto → log do operador) — defesa em profundidade
- Mapa "onde mexer quando NR-01 atualizar" lista os 6 pontos de mudança comum

## Estado consolidado dos 7 passos

| Passo | Status | Observação |
|---|---|---|
| P1 | ✓ | 5/5 testes SQL passaram |
| P2 | ✓ | Dashboard econômico funcional |
| P3 | ✓ | Micro-pulsos com Resend pluggable |
| P4 | ✓ (modulo deploy real) | PDF Playwright; depende de Vercel para teste real |
| P5 | ✓ | Status público com 5 itens semáforo |
| P6 | parcial — pré-flight 12/12, fixture pronto, smoke ao vivo aguarda Jovane | |
| P7 | ✓ draft | 4 marcadores SMOKE_TEST_LEARNING para preencher após smoke |

## O que aguarda

- Jovane: executar Estação 1 (login) + Estação 2 (criar avaliação Cartório) → me manda assessment_id
- Você (Diego): confirmar variáveis Vercel + smoke test ao vivo + decidir cleanup do fixture quando terminar
- Eu: assim que receber o UUID, rodo inject + monitoro audit + fecho Estação 14 + incorporo achados no P7

Tempo P6.fixture + P7: ~1h45 em paralelo. Estamos prontos para execução final.
