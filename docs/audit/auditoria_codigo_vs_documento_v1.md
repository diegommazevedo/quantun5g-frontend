# Auditoria de Conformidade NR-01 — Código vs Documento Fundamental

**Data:** 2026-04-19
**Auditor:** Claude (sob direção de Diego Manoel)
**Status:** ⚠ **PARCIAL — Documento `NR01_GRO.docx` ausente do repositório.**

---

## ⚠ Status do documento fundamental

`NR01_GRO.docx` **não localizado** em nenhum lugar do repositório (`find . -iname '*.docx' -o -iname '*.doc' -o -iname '*.pdf'` retornou vazio; `docs/` só contém `.md` e `.txt`).

**Consequência:**
- **Tarefa 1** (extração literal do código) — executada abaixo.
- **Tarefas 2 a 7** (extração do documento, comparação, achados) — **bloqueadas até o documento chegar**.

**Para destravar:**
- Salvar o `NR01_GRO.docx` em `docs/NR01_GRO.docx` (Read tool consegue ler `.docx`).
- Ou colar o conteúdo principal em texto.

Mesmo sem o documento, **um achado preliminar pode ser afirmado com certeza** (seção 3 deste arquivo).

---

## 1. Tarefa 1 — Extração literal do código

### 1.1 Dimensões

Origem: [`supabase/nr01_seed.sql:21-46`](../../supabase/nr01_seed.sql) — confirmado idêntico no banco prod (`SELECT FROM nr01_dimensions ORDER BY ord`).

| código | nome exibido | ord | peso | cláusula NR-01 referenciada |
|---|---|---|---|---|
| `carga_trabalho` | Carga de trabalho e ritmo | 1 | 1.10 | NR-01 1.5.3.2 + Anexo Guia MTE — fatores de demanda |
| `controle_autonomia` | Controle e autonomia | 2 | 1.05 | NR-01 1.5.3.2 + Maslach: Control |
| `exigencias_emocionais` | Exigências emocionais | 3 | 1.10 | NR-01 1.5.3.2 + Guia MTE Anexo I item 5 |
| `reconhecimento` | Reconhecimento e recompensa | 4 | 1.00 | NR-01 1.5.3.2 + Maslach: Reward |
| `relacoes_interpessoais` | Relações interpessoais (clima) | 5 | 1.00 | NR-01 1.5.3.2 + Maslach: Community |
| `estabilidade_seguranca` | Segurança e estabilidade | 6 | 0.95 | NR-01 1.5.3.2 + ILO PRIMA-EF |
| `assedio_violencia` | Violência e assédio | 7 | 1.30 | Lei 14.457/2022 + NR-01 1.5.3.2 — risco crítico |
| `organizacao_trabalho` | Organização do trabalho | 8 | 1.00 | NR-01 1.5.3.2 + Maslach: Fairness |
| `lideranca_gestao` | Liderança e gestão | 9 | 1.10 | NR-01 1.5.3.2 + Guia MTE Anexo I item 7 |
| `saude_bem_estar` | Saúde e bem-estar percebidos | 10 | 1.05 | NR-01 1.5.3.2 + WHO HW Ind. |

### 1.2 Questões (80, todas literais)

Já extraídas em [`docs/nr01_instrumento_v1.0.txt`](../nr01_instrumento_v1.0.txt) — 12.621 bytes, gerado direto do banco em 2026-04-19 via [`scripts/_export_instrument.mjs`](../../scripts/_export_instrument.mjs).

Conferência:
- 80 questões ativas (`is_active = true`, `instrument_version = 'v1.0'`)
- 8 questões por dimensão × 10 dimensões = 80
- Texto NÃO foi truncado por limite SQL (campo `text` é `text` PostgreSQL, sem limite prático)
- `reverse_scored` marcado individualmente por questão; representado em TXT com `[REVERSA]`

### 1.3 Escala Likert

Origem: [`src/lib/nr01/instrument.ts:89-95`](../../src/lib/nr01/instrument.ts).

| valor | rótulo no código |
|---|---|
| 1 | `Discordo totalmente` |
| 2 | `Discordo` |
| 3 | `Indiferente` |
| 4 | `Concordo` |
| 5 | `Concordo totalmente` |

### 1.4 Cortes de risco

Origem: [`src/types/nr01.ts:497-512`](../../src/types/nr01.ts).

**ESCALA DE TRABALHO: 0–100 (score normalizado), NÃO média Likert 1–5.**

```ts
NR01_RISK_THRESHOLDS = {
  muito_baixo: 80,
  baixo:       65,
  atencao:     50,
  elevado:     35,
  critico:     0,
}

classifyRisk(scorePct, n):
  se n ≤ 0 ou scorePct nulo/NaN → 'sem_dados'
  se scorePct ≥ 80 → 'muito_baixo'
  se scorePct ≥ 65 → 'baixo'
  se scorePct ≥ 50 → 'atencao'
  se scorePct ≥ 35 → 'elevado'
  caso contrário   → 'critico'
```

**Tabela de fronteiras (interpretadas literalmente):**

| nível | faixa em score 0–100 | faixa equivalente em média Likert 1–5 |
|---|---|---|
| muito_baixo | `[80, 100]` | `[4.20, 5.00]` |
| baixo | `[65, 80)` | `[3.60, 4.20)` |
| atencao | `[50, 65)` | `[3.00, 3.60)` |
| elevado | `[35, 50)` | `[2.40, 3.00)` |
| critico | `[0, 35)` | `[1.00, 2.40)` |

**ARBÍTRIO CODIFICADO** (Tarefa 4.4):
- Fronteiras inferiores **inclusivas**, superiores **exclusivas** (operador `>=` em cascata).
- Conversão score↔Likert via fórmula `score = ((mean_likert - 1) / 4) * 100`.
- **Inversão de orientação semântica**: documento típico NR-01 usa "5 é pior" (Likert maior = mais sintoma); código usa "100 é melhor" (score maior = mais saudável). Isso é declarado na METHODOLOGY_TEXT_V1_0 (seção "Análise") e implementado via inversão automática (`6 - v`) das questões `reverse_scored = true`. Resultado final: monotônico para cima = melhor.

### 1.5 Algoritmo de scoring (pseudocódigo executável)

Origem: [`src/lib/nr01/scoring.ts`](../../src/lib/nr01/scoring.ts).

```
ENTRADA: { questions[], answers[], responseCount, kAnonymityMin, dimensionWeights? }

# 1) PARA CADA UMA DAS 10 DIMENSÕES:
PARA cada dimensionCode em NR01_DIMENSION_CODES:
    dimQuestions  = questions filtradas por dimension_code
    dimAnswers    = answers cujo question_id ∈ dimQuestions

    SE responseCount < kAnonymityMin OU dimAnswers vazio:
        score_pct  = null
        risk_level = 'sem_dados'
        # k-anonymity: bloqueio total; nada vaza
        CONTINUE

    # 2) APLICA INVERSÃO DAS QUESTÕES REVERSE_SCORED
    normalized = []
    PARA cada answer em dimAnswers:
        q = pergunta correspondente
        v = q.reverse_scored ? (6 - answer.value) : answer.value
        normalized.push(v)

    # 3) AGREGA
    mean = soma(normalized) / count(normalized)   # média escala 1-5
    median = mediana(normalized)
    stddev = desvio_padrão(normalized, n-1)        # amostral

    # 4) NORMALIZA PARA 0-100
    score_pct = ((mean - 1) / 4) * 100             # bijeção 1↔0, 5↔100
    score_pct = round2(score_pct)

    # 5) CLASSIFICA
    risk_level = classifyRisk(score_pct, responseCount)

    # 6) TOP 3 ITENS-ÂNCORA (questões com pior média já invertida)
    perQMeans = média por question_id
    anchor_items = perQMeans ordenado ASC, top 3

    EMITE: { dimension_code, score_pct, risk_level, mean_likert, median_likert, stddev_likert, n_respondents, anchor_items }

# 7) ISO GLOBAL = MÉDIA PONDERADA DAS DIMENSÕES VÁLIDAS
valid = dimensions COM score_pct ≠ null
SE valid vazio: iso = null, level = 'sem_dados'
SENÃO:
    weightedSum = Σ (d.score_pct × (weights[d.code] ?? 1.0))
    weightTotal = Σ (weights[d.code] ?? 1.0)
    iso = weightedSum / weightTotal
    iso_risk_level = classifyRisk(iso, valid[0].n_respondents)

# 8) DETECTA ALERTAS SISTÊMICOS
alerts = []

# Alerta 1: PRE_BURNOUT
SE carga_trabalho.risk ∈ {elevado, critico}
   AND saude_bem_estar.risk ∈ {elevado, critico}
   AND exigencias_emocionais.risk ∈ {atencao, elevado, critico}:
    alerts.push({ tipo: 'PRE_BURNOUT', severidade: 'critico',
                  dimensoes: [carga, saude, emocional] })

# Alerta 2: INTENCAO_SAIDA
SE reconhecimento.risk ∈ {elevado, critico}
   AND relacoes_interpessoais.risk ∈ {elevado, critico}:
    alerts.push({ tipo: 'INTENCAO_SAIDA', severidade: 'atencao',
                  dimensoes: [reconhecimento, relacoes] })

# Alerta 3: RISCO_ASSEDIO
SE assedio_violencia.risk ∈ {elevado, critico}:
    alerts.push({ tipo: 'RISCO_ASSEDIO', severidade: 'critico',
                  dimensoes: [assedio_violencia] })

# Alerta 4: GAP_LIDERANCA
SE lideranca_gestao.risk ∈ {elevado, critico}
   AND organizacao_trabalho.risk ∈ {elevado, critico}:
    alerts.push({ tipo: 'GAP_LIDERANCA', severidade: 'atencao',
                  dimensoes: [lideranca, organizacao] })

# Alerta 5: BOLHA_SISTEMICA
inRisk = dimensions filtradas por risk_level ∈ {elevado, critico}
SE inRisk.length ≥ 3:
    alerts.push({ tipo: 'BOLHA_SISTEMICA', severidade: 'critico',
                  dimensoes: inRisk.map(d => d.code) })

RETORNA: { dimensions, iso_score, iso_risk_level, systemic_alerts, n_respondents }
```

**Pesos por dimensão usados na ponderação do ISO:** vêm de `dimensionWeights` (parâmetro). Quando NÃO informado (caso atual em `actions.ts:processarResultados` que NÃO passa `dimensionWeights`), todos os pesos viram `1.0` (média simples). Os pesos definidos na coluna `nr01_dimensions.weight` (1.30 para assédio, 1.10 para carga/emocional/liderança, etc.) **NÃO estão sendo aplicados na prática** — são definidos no banco mas não consumidos pelo `processarResultados`. **Achado prévio: discrepância entre intenção declarada (METHODOLOGY_TEXT diz "pesos calibrados conforme o Guia MTE") e implementação real (pesos = 1 fixo).**

### 1.6 Metodologia canônica (literal)

Origem: [`src/lib/nr01/evidence.ts:24-55`](../../src/lib/nr01/evidence.ts).

```
## Metodologia da avaliação dos Fatores de Risco Psicossocial Relacionados ao Trabalho (FRPRT)

A presente avaliação foi conduzida em conformidade com a NR-01 (item 1.5.3.2),
suas atualizações pelas Portarias MTE 1.419/2024 e 765/2025, e o Guia Técnico
sobre Fatores de Risco Psicossocial relacionados ao Trabalho (MTE/SIT, 2024).

### Instrumento
Foi aplicado o instrumento **Pentagrama NR-01 v1.0**, composto por 80 questões
distribuídas em 10 dimensões (Carga, Controle, Exigências Emocionais,
Reconhecimento, Relações Interpessoais, Estabilidade, Assédio, Organização,
Liderança e Saúde), em escala Likert de 5 pontos. As dimensões cobrem os FRPRT
explicitados no Anexo I do Guia MTE e mantêm pontes com o modelo de Maslach
(Carga, Controle, Recompensa, Comunidade, Justiça e Valores).

### Confidencialidade
A coleta é anônima por construção: respostas individuais não são acessíveis pelo
empregador; apenas agregados com k-anonymity ≥ 5 são divulgados, conforme
recomendação da ANPD para tratamento de dados sensíveis em saúde ocupacional.

### Análise
O score por dimensão é a média Likert normalizada para o intervalo 0–100, com
inversão prévia das questões reversas. A classificação de risco segue cinco
faixas (muito_baixo / baixo / atenção / elevado / crítico). O Índice de Saúde
Organizacional (ISO) é a média ponderada dos scores das dimensões com dados
suficientes, com pesos calibrados conforme o Guia MTE.

### Validade técnica
Esta avaliação é assinada pelo responsável técnico abaixo e mantém pacote de
evidências (instrumento aplicado, datas, adesão, hashes) imutável para fins
de auditoria fiscal e de defesa em eventual contencioso.
```

### 1.7 Biblioteca de intervenções

Origem: [`supabase/nr01_seed.sql:130-261`](../../supabase/nr01_seed.sql) (seção `nr01_intervention_library`). 30 intervenções no seed.

| code | dimension_code | applicable_levels | porte | título | duração típica (dias) | cost_band |
|---|---|---|---|---|---|---|
| INT-CARGA-001 | carga_trabalho | atencao,elevado,critico | qualquer | Auditoria de dimensionamento de equipe | 60 | medio |
| INT-CARGA-002 | carga_trabalho | elevado,critico | qualquer | Política de priorização e regra do "não" institucional | 30 | baixo |
| INT-CARGA-003 | carga_trabalho | atencao,elevado | qualquer | Direito à desconexão formal | 21 | baixo |
| INT-CONTROLE-001 | controle_autonomia | atencao,elevado,critico | qualquer | Redesenho de papéis com matriz RACI | 45 | medio |
| INT-CONTROLE-002 | controle_autonomia | atencao,elevado | qualquer | Ritmo de feedback estruturado (1:1 quinzenal) | 30 | baixo |
| INT-EMOCIONAL-001 | exigencias_emocionais | elevado,critico | qualquer | Programa de apoio psicológico (PAE/EAP) | 45 | medio |
| INT-EMOCIONAL-002 | exigencias_emocionais | atencao,elevado | qualquer | Treinamento de regulação emocional para áreas de contato com cliente | 60 | baixo |
| INT-RECONHECIMENTO-001 | reconhecimento | atencao,elevado,critico | qualquer | Programa de reconhecimento não-financeiro estruturado | 30 | baixo |
| INT-RECONHECIMENTO-002 | reconhecimento | elevado,critico | media | Revisão de equidade salarial por papel/perfil | 90 | alto |
| INT-CLIMA-001 | relacoes_interpessoais | atencao,elevado | qualquer | Workshop de comunicação não-violenta para times críticos | 90 | medio |
| INT-CLIMA-002 | relacoes_interpessoais | elevado,critico | qualquer | Mediação formal de conflitos | 45 | medio |
| INT-ESTABILIDADE-001 | estabilidade_seguranca | atencao,elevado,critico | qualquer | Comunicação cadenciada sobre futuro da empresa | 90 | baixo |
| INT-ESTABILIDADE-002 | estabilidade_seguranca | elevado,critico | qualquer | Protocolo de mudança organizacional respeitosa | 30 | baixo |
| INT-ASSEDIO-001 | assedio_violencia | atencao,elevado,critico | qualquer | Canal externo de denúncias com proteção | 45 | medio |
| INT-ASSEDIO-002 | assedio_violencia | elevado,critico | qualquer | Treinamento obrigatório anti-assédio com certificação | 60 | baixo |
| INT-ASSEDIO-003 | assedio_violencia | critico | qualquer | Apuração formal e auditoria independente | 60 | alto |
| INT-ORG-001 | organizacao_trabalho | atencao,elevado | qualquer | Mapeamento e simplificação de processos críticos | 90 | medio |
| INT-ORG-002 | organizacao_trabalho | atencao,elevado,critico | qualquer | Política de gestão de reuniões | 30 | baixo |
| INT-LIDERANCA-001 | lideranca_gestao | atencao,elevado,critico | qualquer | Programa de desenvolvimento de líderes (6 encontros) | 180 | alto |
| INT-LIDERANCA-002 | lideranca_gestao | atencao,elevado | qualquer | Feedback 360° trimestral para liderança | 90 | medio |
| INT-LIDERANCA-003 | lideranca_gestao | elevado,critico | qualquer | Coaching individual para líderes em risco | 180 | alto |
| INT-SAUDE-001 | saude_bem_estar | atencao,elevado,critico | qualquer | Telemedicina e telepsicologia 24x7 | 45 | medio |
| INT-SAUDE-002 | saude_bem_estar | atencao,elevado | qualquer | Pausa estruturada e ginástica laboral | 30 | baixo |
| INT-SAUDE-003 | saude_bem_estar | elevado,critico | media | Núcleo de saúde mental ocupacional | 90 | alto |
| INT-MULTI-001 | carga_trabalho | critico | qualquer | Comitê de gestão de risco psicossocial | 30 | baixo |
| INT-MULTI-002 | organizacao_trabalho | atencao,elevado | qualquer | Onboarding estruturado de 90 dias | 90 | baixo |
| INT-MULTI-003 | reconhecimento | atencao,elevado | qualquer | Stay interview com talentos-chave | 60 | baixo |
| INT-MULTI-004 | controle_autonomia | atencao,elevado | qualquer | Modelo de trabalho híbrido formalizado | 45 | baixo |
| INT-MULTI-005 | exigencias_emocionais | atencao,elevado | qualquer | Rodas de conversa sobre saúde mental | 90 | baixo |
| INT-MULTI-006 | saude_bem_estar | elevado,critico | qualquer | Acompanhamento pós-afastamento (RTW) | 180 | medio |

---

## 2. Tarefas 2 a 7 — BLOQUEADAS

Não posso executar sem `NR01_GRO.docx`. Especificamente:

- **2.1 a 2.8**: extração literal do documento — preciso do arquivo
- **3**: matriz de convergência (depende de 1 + 2)
- **4.1 a 4.7**: auditorias item a item (dependem de 2 + 3)
- **5**: classificação de severidade (depende de 4)
- **6**: relatório consolidado

---

## 3. Achado preliminar afirmável SEM o documento

### ACHADO PRÉVIO 1: Sistema NR-01 não tem laudos micro padronizados.

**Evidência direta no banco de produção** (verificada 2026-04-19):

```
tem_tbl_nr01_laudos:        false
tem_tbl_laudos_pentagrama:  true   (mas é dim Pentagrama, não NR-01)
qtd_laudos_pentagrama:      21    (5 dim × 4 níveis + 1 genérico)
```

**Não existe** tabela `nr01_laudos`, `nr01_laudo_textos`, ou equivalente no schema NR-01. O sistema:

- ✅ Calcula score por dimensão e classifica em 5 níveis de risco
- ✅ Gera frase de "âncora" (top 3 piores questões) por dimensão
- ✅ Detecta 5 alertas sistêmicos com texto descritivo curto
- ✅ Renderiza tabelas e cards no PDF com scores + nível
- ❌ **NÃO armazena nem renderiza textos canônicos de laudo por (dimensão × nível)**
- ❌ Campos `ai_summary` em `nr01_dimension_scores` e `macro_report_text` em `nr01_assessment_results` existem mas estão **vazios** (não há geração ativa)

**Severidade preliminar:** **MATERIAL** (afeta resultado apresentado ao cliente).

**Não-conformidade vs documento (presumida — confirmar com `NR01_GRO.docx`):** se o documento define 50 textos micro padronizados (10 dim × 5 níveis) + 5 macros, e o cliente pode esperar esses textos no laudo técnico, o sistema **promete** apresentar laudo formal mas **entrega** classificação de risco + tabela. Defensável em fiscalização (fiscal aceita score + descritivo curto), mas é **promessa de produto que precisa fechar** antes do primeiro cliente premium.

**Arquitetura para fechar (estimativa):**
1. Migration `nr01_patch_005.sql` cria `nr01_laudo_textos (dimensao_code, nivel, texto_principal, texto_recomendacao)`
2. Seed com os 50 textos do documento + 5 macros
3. Update em `pdf-template.ts` na seção 4 (Resultado por dimensão) para incluir `texto_principal` + `texto_recomendacao` por linha
4. Update na seção 5 (ISO global) para incluir `texto_macro` correspondente ao `iso_risk_level`
5. Esforço: ~3-4 horas

### ACHADO PRÉVIO 2: Pesos por dimensão definidos mas não aplicados.

**Evidência:**
- [`supabase/nr01_seed.sql:21-46`](../../supabase/nr01_seed.sql) define pesos calibrados (1.30 assédio, 1.10 carga/emocional/liderança, 1.05 controle/saúde, 1.00 reconhecimento/clima/organização, 0.95 estabilidade)
- [`src/lib/nr01/scoring.ts:160-179`](../../src/lib/nr01/scoring.ts) `computeIso()` aceita `weights` opcional, mas...
- [`src/app/(nr01)/nr01/avaliacao/[id]/actions.ts`](../../src/app/(nr01)/nr01/avaliacao/[id]/actions.ts) — `processarResultados` chama `computeScoring(input)` **sem passar `dimensionWeights`** → cai no fallback `weights[code] ?? 1.0` → **média simples, ignorando os pesos do banco**.
- [`src/lib/nr01/evidence.ts:48`](../../src/lib/nr01/evidence.ts) METHODOLOGY_TEXT_V1_0 declara: *"O Índice de Saúde Organizacional (ISO) é a média ponderada dos scores das dimensões com dados suficientes, **com pesos calibrados conforme o Guia MTE**."*

**Severidade preliminar:** **MATERIAL** (descasamento entre metodologia declarada ao fiscal e cálculo real). Em fiscalização, o fiscal abre o pacote, lê a metodologia, abre o cálculo. Se o cálculo é média simples mas o texto promete ponderada, isso é constrangimento.

**Correção (10 min):**
- Em `processarResultados`, carregar `nr01_dimensions` e passar `Object.fromEntries(dims.map(d => [d.code, d.weight]))` como `dimensionWeights` para `computeScoring`.

---

## 4. O que falta para fechar a auditoria

1. Salvar `NR01_GRO.docx` em `docs/NR01_GRO.docx` (preferido) **OU** colar conteúdo principal em chat
2. Reabrir esta auditoria, executar Tarefas 2 a 7
3. Aplicar correções sugeridas pelos achados (separadamente: 2 quickfixes já identificados nesta auditoria parcial, mais o que vier do diff completo)

---

## 5. Atalhos para o próximo deploy

Mesmo sem o documento, **2 correções podem subir já** (ambas têm fundamento no próprio código + METHODOLOGY_TEXT_V1_0):

1. **Aplicar pesos do banco no ISO.** Patch de 5 linhas em `processarResultados`. Risco zero — código já comporta.
2. **Documentar a inversão de orientação semântica.** Já está parcialmente em METHODOLOGY_TEXT_V1_0 ("inversão prévia das questões reversas"); pode-se adicionar no `nr01_instrumento_v1.0.txt` o aviso de "scores 0–100, maior = mais saudável" para evitar leitura errada offline.

Aguardando seu OK pra aplicar essas duas + chegada do `NR01_GRO.docx` para fechar o resto.
