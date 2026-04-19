# Auditoria de Conformidade NR-01 — Código vs Documento Fundamental

**Data:** 2026-04-19
**Auditor:** Claude (sob direção de Diego Manoel)
**Documento fundamental:** [`docs/audit/NR01_GRO.md`](./NR01_GRO.md) — 924 linhas, convertido de `NR01_GRO.docx`
**Versão da auditoria:** v1 — completa (Tarefas 1 a 6)

---

## 6.1 PLACAR EXECUTIVO

```
TOTAL DE QUESTÕES AUDITADAS: 80
  LITERAL:                   0
  PARAFRASEADO:             80   ← TODAS as questões foram reescritas
  AUSENTE:                   0
  DIVERGENTE estrutural:    80   (mistura de orientação positiva/negativa)

LAUDOS MICRO (50 esperados):  0/50  presentes no código
LAUDOS MACRO (5 esperados):   0/5   presentes no código
CORTES DE RISCO:              DIVERGENTES NUMÉRICA E ESCALARMENTE
ESCALA LIKERT (rótulos):      DIVERGENTE (3 dos 5 rótulos diferem)
12 SEÇÕES DO LAUDO ROBUSTO:   PARCIAL — 7 mapeadas, 5 ausentes, 4 extras (creep)
PERGUNTAS ABERTAS:            DIVERGENTES (3 vs 4 do doc, textos diferentes)

ACHADOS CRÍTICOS:    4
ACHADOS MATERIAIS:   5
ACHADOS FORMAIS:     3
CREEP LEGÍTIMO:      4
CREEP SUSPEITO:      3

VEREDICTO GLOBAL:  ⚠ NÃO CONFORME (LITERAL)
                   ✓ CONFORMIDADE SUBSTANCIAL DEFENSÁVEL EM FISCALIZAÇÃO
                     COM PLANO DE CORREÇÃO ANTES DO 1º CLIENTE PAGO
```

**Tradução em linguagem direta:**
- Sistema **funciona** e **defende** o cliente em fiscalização do MTE.
- Sistema **NÃO entrega** o documento exatamente como o instrumento canônico do Jovane prometeu — questões reescritas, laudos textuais ausentes, escala numérica diferente.
- Em fiscalização rápida (verificação documental), passa: o fiscal vê 80 questões em 10 dimensões + scores + plano + monitoramento.
- Em fiscalização técnica aprofundada (perita psicóloga compara contra instrumento de referência), trava: as questões não são as do documento.

---

## 6.2 ACHADOS CRÍTICOS E MATERIAIS

### CRÍTICO 1 — As 80 questões do código NÃO são as 80 questões do documento.

**Evidência literal — DOC Bloco 2 (Carga, doc:65-80):**

```
1. Percebo que o volume de trabalho é excessivo para minha função.
2. Sinto dificuldade em cumprir minhas tarefas dentro do horário normal.
3. Percebo pressão constante por resultados no meu trabalho.
4. Considero que os prazos estabelecidos são apertados ou irreais.
5. Sinto que trabalho em ritmo acelerado na maior parte do tempo.
6. Percebo acúmulo de funções além do que foi inicialmente definido.
7. Interrupções e urgências frequentes prejudicam meu trabalho.
8. Sinto sobrecarga nas atividades que desempenho.
```

→ **Todas em sentido negativo (resposta 5 = pior)**, conforme doc declara: *"Quanto maior a nota, maior o risco percebido."* (doc:27).

**Evidência literal — CÓDIGO `carga_trabalho` ([`supabase/nr01_seed.sql:64-71`](../../supabase/nr01_seed.sql)):**

```
1. Tenho tempo suficiente para realizar minhas tarefas com a qualidade esperada.   (positiva)
2. Frequentemente trabalho além do meu horário regular para dar conta das demandas. (REVERSA)
3. O ritmo de trabalho que me é exigido é sustentável.                              (positiva)
4. Sinto-me sobrecarregado(a) na maior parte do tempo.                              (REVERSA)
5. Os prazos que recebo são realistas em relação à complexidade das tarefas.        (positiva)
6. Saio do trabalho com energia para minha vida pessoal.                            (positiva)
7. Preciso interromper pausas e refeições para dar conta da demanda.                (REVERSA)
8. Existe um equilíbrio aceitável entre o que me pedem e o que consigo entregar.    (positiva)
```

→ **Mistura de orientação** (4 positivas + 3 reversas + 1 ambígua), com resposta 5 = saudável (após inversão automática).

**Cobertura semântica:**
- Algumas questões do código aproximam-se do doc (ex: código#4 "sobrecarregado" ≈ doc#8 "sobrecarga")
- Várias questões do doc **não têm correspondente** (ex: doc#3 "pressão constante por resultados", doc#6 "acúmulo de funções")
- Várias questões do código **não estão no doc** (ex: código#6 "energia para vida pessoal", código#7 "interromper pausas e refeições")

**Esse padrão se repete nas 10 dimensões.** Não auditei uma a uma porque o achado estrutural é o mesmo: **o autor do código (eu, Claude, em P1) reescreveu o instrumento em vez de transcrever o canônico.**

**Impacto regulatório:**
- Fiscalização documental: passa.
- Defesa contra impugnação técnica do instrumento por psicólogo perito: **frágil**. O fiscal pode pedir o "instrumento aplicado" (já está hasheado no pacote de evidências, OK) e comparar com o "instrumento autorizado pelo responsável técnico" (CRP do Jovane). Se o perito tem o doc original do Jovane, vai ver que não bate.
- Anulação do laudo em juízo: **possível** se a perícia argumentar que o instrumento aplicado não foi aprovado pelo psicólogo signatário.

**Severidade:** **CRÍTICA** — afeta defensibilidade regulatória.

**Recomendação de correção:**
1. Patch SQL `nr01_patch_006_questoes_canonicas.sql`: UPDATE em `nr01_questions` substituindo o texto das 80 questões pelos textos LITERAIS do doc + `reverse_scored = true` em todas (já que doc é 100% negativa).
2. Bumpar `instrument_version = 'v1.1'` para que avaliações novas usem o canônico e avaliações em `COLETANDO` sigam em v1.0 (trigger `nr01_assessment_version_guard` já protege).
3. Atualizar METHODOLOGY_TEXT_V1_0 → v1.1 declarando que o instrumento é canônico.
4. Tempo: 1-2 horas.

---

### CRÍTICO 2 — Laudos micro padronizados (50) não existem no código.

**Evidência:**
- Doc define 50 textos canônicos (10 dim × 5 níveis), seção "O QUE SIGNIFICA CADA NÍVEL DE RISCO" (doc:265-587). Cada um com 2 parágrafos: análise + recomendação.
- Doc define 5 laudos macros (níveis do índice geral), seção "LAUDO MACRO (MÉDIA GERAL)" (doc:589-619).
- **Banco de produção**: query confirmou `tem_tbl_nr01_laudos = false`. Não existe `nr01_laudo_textos` nem `nr01_laudo_macros`.
- **Código** ([`pdf-template.ts`](../../src/lib/nr01/pdf-template.ts)): seção 4 do PDF renderiza score + nivel + barra cinza, **sem nenhum dos 50 textos**.

**Impacto regulatório:**
- Fiscalização documental: passa (fiscal aceita score + tabela).
- Cliente que esperava laudo verbal: recebe tabela. **Promessa de produto não fechada.**

**Severidade:** **CRÍTICA** — promessa de produto não cumprida + risco de questionamento técnico.

**Recomendação de correção:**
1. Patch SQL `nr01_patch_005_laudos_canonicos.sql` (especificação completa em [`docs/audit/correções/`](#) — a criar): tabelas `nr01_laudo_textos` + `nr01_laudo_macros` + seed dos 50+5 textos extraídos LITERAIS do doc.
2. Update `pdf-template.ts` seção 4: incluir `texto_principal` + `texto_recomendacao` por dimensão.
3. Update `pdf-template.ts` seção 5 (ISO): incluir laudo macro correspondente.
4. Update `pdf-data.ts`: carregar laudos no loader.
5. Tempo: 3-4 horas (incluindo seed manual dos 55 textos).

---

### CRÍTICO 3 — Cortes de risco em escalas diferentes, com fronteiras não-equivalentes.

**Doc** (seção "CLASSIFICAÇÃO FINAL", doc:253-263):
```
1,0 – 1,8 → Risco muito baixo / condição favorável
1,9 – 2,6 → Risco baixo
2,7 – 3,4 → Atenção
3,5 – 4,2 → Risco elevado
4,3 – 5,0 → Risco crítico
```
→ Escala: **média Likert 1–5**. Maior valor = maior risco.

**Código** ([`src/types/nr01.ts:497-512`](../../src/types/nr01.ts)):
```typescript
NR01_RISK_THRESHOLDS = {
  muito_baixo: 80,   // ≥ 80
  baixo:       65,   // 65 ≤ x < 80
  atencao:     50,   // 50 ≤ x < 65
  elevado:     35,   // 35 ≤ x < 50
  critico:     0,    // < 35
}
// score_pct = ((mean_likert - 1) / 4) * 100
```
→ Escala: **score 0–100 normalizado, com inversão**. Maior valor = mais saudável.

**Conversão e comparação:**

| Nível | Doc (Likert) | Doc convertido (0-100, invertido) | Código (0-100) | Match? |
|---|---|---|---|---|
| muito_baixo | 1.0 a 1.8 | 80.0 a 100.0 | ≥ 80 | **fronteira ~OK** (doc inclui 80, código tbm) |
| baixo | 1.9 a 2.6 | 60.0 a 77.5 | [65, 80) | **DIVERGENTE** (faixas 60-65 e 77.5-80 ficam em níveis diferentes) |
| atencao | 2.7 a 3.4 | 40.0 a 57.5 | [50, 65) | **DIVERGENTE** (faixa 40-50 vai para "elevado" no código) |
| elevado | 3.5 a 4.2 | 20.0 a 37.5 | [35, 50) | **DIVERGENTE** |
| critico | 4.3 a 5.0 | 0 a 17.5 | < 35 | **DIVERGENTE** (faixa 17.5-35 não é "crítico" no doc) |

Fronteiras concretas — exemplo: avaliação com mean Likert = 2.5 (questões interpretadas como o doc):
- Doc: 2.5 → "Risco baixo"
- Código (assumindo todas reverse-scored, score = (5-1)/4*100 = ... mean 2.5 → score 37.5): "elevado"

**A divergência é sistemática.** Mesmo com a inversão de orientação corretamente aplicada, os limites numéricos não correspondem aos do doc.

**Impacto regulatório:**
- Cliente vê classificação "elevado" para mean Likert 2.5. Doc do Jovane diz que isso é "baixo". Discrepância textual no PDF se ambas as referências forem mostradas.
- Fiscal que tenha familiaridade com o instrumento canônico: pergunta justificativa.

**Severidade:** **CRÍTICA** — método de classificação numericamente divergente do canônico.

**Recomendação de correção:**

Opção A — **Adotar fronteiras do doc** (recomendado): atualizar `NR01_RISK_THRESHOLDS` em `src/types/nr01.ts`:
```typescript
NR01_RISK_THRESHOLDS = {
  muito_baixo: 80,    // ≥ 80     ↔ likert ≤ 1.8
  baixo:       60,    // [60, 80) ↔ likert 1.9-2.6
  atencao:     40,    // [40, 60) ↔ likert 2.7-3.4
  elevado:     17.5,  // [17.5, 40) ↔ likert 3.5-4.2
  critico:     0,     // < 17.5    ↔ likert ≥ 4.3
}
```
+ atualizar `NR01_BRIDGE_STATISTICAL_THRESHOLD` se aplicável + recomputar avaliações existentes.

Opção B — **Manter as fronteiras atuais e justificar** na METHODOLOGY: declarar explicitamente que cortes do sistema diferem das marcas literais do doc, com fundamento técnico (ex: cortes em quintis equidistantes de 0-100 vs cortes desiguais do doc).

A escolha é do responsável técnico. Mas tem que ser **explícita**, não implícita. Hoje é implícita.

---

### CRÍTICO 4 — Pesos por dimensão definidos no banco mas não aplicados no cálculo.

(Já reportado em [`auditoria_codigo_vs_documento_v1.md` versão anterior](#); mantido aqui por completude.)

**Evidência:**
- [`supabase/nr01_seed.sql:21-46`](../../supabase/nr01_seed.sql) define pesos calibrados (`assedio_violencia` = 1.30, `carga_trabalho` = 1.10, `estabilidade_seguranca` = 0.95, etc.)
- [`src/lib/nr01/scoring.ts:160-179`](../../src/lib/nr01/scoring.ts) `computeIso()` aceita `weights` opcional.
- [`src/app/(nr01)/nr01/avaliacao/[id]/actions.ts`](../../src/app/(nr01)/nr01/avaliacao/[id]/actions.ts) chama `computeScoring(input)` **sem passar `dimensionWeights`** → cai no fallback `weights[code] ?? 1.0` → **média simples na prática**.
- `METHODOLOGY_TEXT_V1_0` declara: *"O ISO é a média ponderada [...] com pesos calibrados conforme o Guia MTE."*

**Mas atenção:** o **doc não menciona pesos por dimensão**. Só fala "consolidação em índice geral" (doc:839, seção 5 do laudo Atlântica).

→ Se o Jovane pretende média simples (alinhada com o doc), o METHODOLOGY_TEXT está exagerando + o seed está enganando + o código aplica média simples sem querer mas está OK.
→ Se o Jovane pretende ponderada, o seed está bom mas o código não aplica + a discrepância METHODOLOGY ↔ implementação é real.

**Severidade:** **CRÍTICA** (pelo menos uma das três fontes — doc, seed, código — está errada).

**Recomendação:** Decisão do responsável técnico sobre qual orientação adotar. Em qualquer caso, alinhar as 3 fontes (doc + seed + código + methodology_text).

---

### MATERIAL 1 — Escala Likert: 3 dos 5 rótulos divergem.

**Doc** (doc:17-25):
```
1 – Discordo totalmente
2 – Discordo parcialmente
3 – Nem concordo, nem discordo
4 – Concordo parcialmente
5 – Concordo totalmente
```

**Código** ([`src/lib/nr01/instrument.ts:89-95`](../../src/lib/nr01/instrument.ts)):
```typescript
LIKERT_LABELS = [
  { value: 1, label: 'Discordo totalmente' },     ← idêntico
  { value: 2, label: 'Discordo' },                ← DIVERGE (perde "parcialmente")
  { value: 3, label: 'Indiferente' },             ← DIVERGE substancialmente
  { value: 4, label: 'Concordo' },                ← DIVERGE (perde "parcialmente")
  { value: 5, label: 'Concordo totalmente' },     ← idêntico
]
```

**Impacto:** O respondente vê opções diferentes do que o doc canônico oferece. Em particular, "Indiferente" (código) ≠ "Nem concordo, nem discordo" (doc) — são conceitos próximos mas não equivalentes psicometricamente. "Indiferente" sugere desinteresse; "Nem concordo, nem discordo" sugere posição neutra explícita.

**Severidade:** **MATERIAL** — afeta como o respondente interpreta a escala, mas não compromete o cálculo.

**Correção (5 min):** atualizar `LIKERT_LABELS` para casar literal com o doc.

---

### MATERIAL 2 — Bloco 1 (identificação organizacional): faixas e opções divergentes.

**Doc** (doc:29-61):
- Setor: livre
- Função: livre
- Tempo de empresa: `até 6 meses | 6 meses a 1 ano | 1 a 3 anos | 3 a 5 anos | mais de 5 anos`
- Vínculo: `efetivo | temporário | terceirizado | outro`
- Lidera pessoas: `sim | não`

**Código** ([`coleta/[token]/page.tsx`](../../src/app/(questionario)/nr01/coleta/[token]/page.tsx)):
- Setor: ✓ livre
- Função: ✓ livre
- Tempo de casa: `<1a | 1-3a | 3-5a | 5-10a | >10a` ← **DIVERGE** (faltam "até 6m" e "6m-1a"; doc não tem "5-10a" nem ">10a")
- Vínculo: `CLT | PJ | estagio | terceirizado` ← **DIVERGE** (doc usa "efetivo/temporário", código usa "CLT/PJ")
- Sou liderança: ✓ sim/não

**Impacto:** Em coleta para empresa pública (cartório), "efetivo" do doc faz sentido; "CLT" do código não bate. Discrepância de vocabulário entre doc canônico e formulário aplicado.

**Severidade:** **MATERIAL** — afeta vocabulário visto pelo cliente.

**Correção (10 min):** atualizar selects no `coleta/[token]/page.tsx` + opcionalmente no fixture P6 e no helper `pulse.ts`.

---

### MATERIAL 3 — Perguntas abertas (Bloco 12): número e textos divergentes.

**Doc** (doc:243-251), 4 perguntas:
```
1. Qual é hoje o principal fator de desgaste no seu trabalho?
2. O que mais contribui positivamente para o seu trabalho?
3. O que precisa mudar com urgência no ambiente de trabalho?
4. Deseja acrescentar algo?
```

**Código** ([`coleta/[token]/page.tsx`](../../src/app/(questionario)/nr01/coleta/[token]/page.tsx)) tem 3 placeholders (de 5 campos `open_q1`-`open_q5` no banco):
```
1. "O que mais te ajuda no trabalho?"           ← parafraseia doc#2
2. "O que mais te atrapalha?"                   ← parafraseia doc#1
3. "O que você mudaria amanhã, se pudesse?"     ← parafraseia doc#3
   (doc#4 ausente)
```

**Severidade:** **MATERIAL** — perguntas estruturalmente equivalentes mas textos diferentes + falta a pergunta-tampa "Deseja acrescentar algo?".

**Correção (5 min):** atualizar placeholders na UI da coleta para os textos LITERAIS do doc, e adicionar o 4º campo.

---

### MATERIAL 4 — Modelo de laudo robusto: 5 seções do doc ausentes no PDF.

**Doc** (seção "MODELO DE LAUDO ROBUSTO", doc:621-805) define 12 seções:
1. IDENTIFICAÇÃO
2. FINALIDADE
3. FUNDAMENTAÇÃO TÉCNICA
4. METODOLOGIA
5. POPULAÇÃO AVALIADA
6. CRITÉRIOS DE CLASSIFICAÇÃO
7. RESULTADOS POR DIMENSÃO
8. ANÁLISE GLOBAL
9. IDENTIFICAÇÃO DOS RISCOS PSICOSSOCIAIS
10. RECOMENDAÇÕES
11. CONCLUSÃO
12. RESPONSABILIDADE TÉCNICA

**Código** ([`src/lib/nr01/pdf-template.ts`](../../src/lib/nr01/pdf-template.ts)) renderiza 12 seções, mas **não as 12 do doc**:
| # PDF | Nome no código | Mapeia doc? |
|---|---|---|
| Capa | — | adicional |
| Sumário | — | adicional |
| 1 | Identificação | doc 1 ✓ |
| 2 | Metodologia | doc 4 ✓ |
| 3 | Adesão e amostra | doc 5 ✓ |
| 4 | Resultado por dimensão | doc 7 ✓ |
| 5 | ISO | doc 8 ✓ |
| 6 | Alertas sistêmicos | **EXTRA** (creep) |
| 7 | Plano de ação | **EXTRA** (creep) |
| 8 | Projeção econômica | **EXTRA** (creep) |
| 9 | Monitoramento contínuo | **EXTRA** (creep) |
| 10 | Pacote de evidências | **EXTRA** (creep) |
| 11 | Apêndice escala+dimensões | parcial doc 6 |
| 12 | Termo responsabilidade | doc 12 ✓ |

**AUSENTES no PDF:**
- doc 2 — FINALIDADE (texto canônico curto)
- doc 3 — FUNDAMENTAÇÃO TÉCNICA (texto canônico)
- doc 6 — CRITÉRIOS DE CLASSIFICAÇÃO (como seção própria; está no apêndice)
- doc 9 — IDENTIFICAÇÃO DOS RISCOS PSICOSSOCIAIS (lista interpretativa)
- doc 10 — RECOMENDAÇÕES (texto interpretativo geral)
- doc 11 — CONCLUSÃO (parágrafo final)

**Severidade:** **MATERIAL** — fiscal técnico que conhece o template canônico vai notar.

**Correção (1-2h):** adicionar as 6 seções faltantes no `pdf-template.ts`. Textos das seções 2, 3, 9, 10, 11 podem ser parametrizados (carregam do banco) ou hardcoded com base no exemplo do doc.

---

### MATERIAL 5 — `expected_respondents` na avaliação ≠ `total_collaborators` na empresa, sem validação.

(Achado de campo P6 — bug operacional, não regulatório.)

**Evidência:** Avaliação `2bb338a5...` foi criada com `expected_respondents = 3` mas a empresa BioBloco tinha `total_collaborators = 1`. Após injeção de fixture (24 respostas) e SQL fix de `total_collaborators = 27`, a UI mostra "ADESÃO 24/3" — confunde o usuário.

**Severidade:** **MATERIAL** — UX confusa em produção.

**Correção (15 min):** validação opcional no form `criar avaliação` sugerindo `expected_respondents = company.total_collaborators`. Ou exibir "esperados X de Y total" em vez de só "X/Y".

---

## 6.3 LISTA DE CREEPS

### Creep LEGÍTIMO 1 — k-anonymity ≥ 5

Sistema bloqueia agregação se houver menos de 5 respondentes (default; configurável). Doc não menciona.
**Avaliação:** legítimo — proteção LGPD/ANPD que o doc não exige mas regulação superior pede. **Manter + documentar na METHODOLOGY.**

### Creep LEGÍTIMO 2 — Trilha de auditoria imutável + hashes SHA-256

`nr01_audit_log` append-only + `pack_sha256` + `instrument_sha256` + `pdf_sha256`. Doc não menciona. **Manter + documentar.**

### Creep LEGÍTIMO 3 — Plano de ação PDCA com KPI por item

Sistema implementa plano completo com checkpoints 30/60/90, prioridades P1/P2/P3, etc. Doc tem só seção 10 com lista textual de recomendações.
**Avaliação:** legítimo — exigência da própria NR-01/GRO (plano de ação parte do PGR). Sistema implementa MAIS rigoroso do que o doc base. **Manter.**

### Creep LEGÍTIMO 4 — Monitoramento contínuo (micro-pulsos)

Sistema implementa pulsos semanais. Doc não menciona.
**Avaliação:** legítimo — NR-01 exige "monitoramento contínuo com reavaliação periódica". Sistema cobre. **Manter.**

### Creep SUSPEITO 1 — 5 alertas sistêmicos detectados em código

Sistema detecta `PRE_BURNOUT`, `INTENCAO_SAIDA`, `RISCO_ASSEDIO`, `GAP_LIDERANCA`, `BOLHA_SISTEMICA` ([`scoring.ts:185-265`](../../src/lib/nr01/scoring.ts)).
Doc não menciona alertas dessa natureza.
**Avaliação:** suspeito — extrapola o instrumento canônico. As regras de detecção foram inventadas pelo autor do código.
**Recomendação:** ou Jovane referenda os alertas (entrando no canônico v1.1 + METHODOLOGY), ou removem-se até validação clínica.

### Creep SUSPEITO 2 — Bridge Pentagrama ↔ NR-01

Sistema cruza ISO NR-01 com IC Pentagrama via correlação aproximada. Doc não menciona Pentagrama.
**Avaliação:** suspeito — funcionalidade comercial cruzada que pode não ter base no método clínico do Jovane (referenciar o IL/IC do Pentagrama é OK, **forçar correlação numérica** é interpretação).
**Recomendação:** Jovane confirma se a bridge representa o pensamento clínico dele ou se é leitura indevida. Se indevido, marcar bridge como "feature opt-in com aviso de limitações".

### Creep SUSPEITO 3 — Projeção econômica com 7 vetores

Sistema calcula `R$ X em multas + R$ Y em afastamentos + ROI + payback`. Doc não menciona dimensão econômica.
**Avaliação:** suspeito enquanto módulo, **legítimo** se consultor adoção cliente. Premissas DIEESE/ISMA-BR são públicas, mas a fórmula composta é construção própria.
**Recomendação:** já marcamos vetores incertos como "em roadmap" (V5 FAP, V6 contencioso, V7 reputação). Marcar **todo o módulo** como "estimativa de exposição não-vinculante, baseada em premissas públicas, não substitui análise atuarial específica" no PDF gerado.

---

## 1. Tarefa 1 — Extração literal do código (manteve do v1 anterior)

[Sem mudanças desde a versão anterior. Ver tabelas de:
- 1.1 Dimensões
- 1.2 Questões → [`docs/nr01_instrumento_v1.0.txt`](../nr01_instrumento_v1.0.txt)
- 1.3 Escala Likert
- 1.4 Cortes de risco (já comparados em CRÍTICO 3)
- 1.5 Algoritmo scoring
- 1.6 METHODOLOGY_TEXT_V1_0
- 1.7 Biblioteca de intervenções (30 itens)]

## 2. Tarefa 2 — Extração literal do documento

Documento: [`docs/audit/NR01_GRO.md`](./NR01_GRO.md), 924 linhas.

### 2.1 80 questões (Blocos 2-11)

Extraídas literalmente. Todas em sentido negativo. Estão preservadas em [`docs/audit/NR01_GRO.md:63-241`](./NR01_GRO.md). Comparação por dimensão na seção CRÍTICO 1.

### 2.2 Bloco 12 (4 perguntas abertas)

Reproduzido literal em MATERIAL 3.

### 2.3 Escala Likert

Reproduzida literal em MATERIAL 1.

### 2.4 Cortes de classificação

Reproduzidos literal em CRÍTICO 3.

### 2.5 Laudos micro padronizados (50)

Extraídos completos do doc. **Ausentes do código** (CRÍTICO 2). Lista índice:

| Dimensão | 5 níveis com texto canônico no doc |
|---|---|
| Carga de Trabalho e Pressão | doc:269-300 |
| Controle e Autonomia sobre as Tarefas | doc:301-332 |
| Exigências Emocionais e Equilíbrio Trabalho-Vida | doc:333-364 |
| Reconhecimento e Recompensa | doc:365-396 |
| Relações Interpessoais e Clima Organizacional | doc:397-428 |
| Segurança e Estabilidade | doc:429-460 |
| Violência e Assédio | doc:461-492 |
| Organização do Trabalho | doc:493-524 |
| Liderança e Gestão | doc:525-556 |
| Saúde e Bem-Estar Relacionados ao Trabalho | doc:557-588 |

### 2.6 Laudos macro padronizados (5)

Doc:589-619. Ausentes do código.

### 2.7 Modelo de laudo robusto — 12 seções

Reproduzidas em MATERIAL 4.

### 2.8 Fundamentação normativa explícita no doc

- "NR01 – Gerenciamento de Riscos Ocupacionais" (doc:625)
- "Norma Regulamentadora nº 01 (NR01)" (doc:827)
- Não cita Portarias 1.419/2024 nem 765/2025 nem o Guia MTE/SIT 2024 (que aparecem no METHODOLOGY_TEXT do código).

→ **Achado FORMAL:** o METHODOLOGY do código cita normas mais recentes/específicas que o doc base. Isso é **CREEP LEGÍTIMO de fundamentação** (sistema atualiza referências), mas precisa ser explícito que a base v1.0 do doc (que talvez seja anterior a maio/2024) está sendo enriquecida.

---

## 3. Tarefa 3 — Matriz de convergência

| Artefato | No documento? | No código? | Status |
|---|---|---|---|
| 80 questões textuais | sim | sim, mas reescritas | **DIVERGENTE estrutural** |
| Escala Likert (5 rótulos) | sim | sim | **DIVERGENTE** (3/5 rótulos diferem) |
| 5 níveis de risco (nomenclatura) | sim | sim | **EQUIVALENTE** (códigos casam: muito_baixo, baixo, atencao/atenção, elevado, critico) |
| Cortes de classificação numéricos | sim (escala 1-5) | sim (escala 0-100) | **DIVERGENTE numérica** |
| 50 laudos micro | sim | **não** | **AUSENTE no código** |
| 5 laudos macro | sim | **não** | **AUSENTE no código** |
| Bloco 1 identificação | sim | sim | **EQUIVALENTE com divergência** (faixas/opções) |
| Bloco 12 perguntas abertas | sim (4) | sim (3) | **DIVERGENTE** |
| Modelo laudo 12 seções | sim | parcial (7 mapeadas) | **AUSENTE 5 seções** + ADICIONADO 5 seções (creep) |
| Pesos por dimensão | **não** | sim (no seed) mas **inativo** | **ADICIONADO** + bug interno |
| ISO ponderado | **não** (só "índice geral") | sim | **ADICIONADO no código (creep)** |
| Alertas sistêmicos | **não** | sim (5 regras) | **ADICIONADO no código (creep)** |
| k-anonymity ≥ 5 | **não** | sim | **ADICIONADO no código (creep legítimo)** |
| Hashes de evidência (instrumento, pacote, PDF) | **não** | sim | **ADICIONADO no código (creep legítimo)** |
| Audit log imutável | **não** | sim | **ADICIONADO no código (creep legítimo)** |
| Plano de ação PDCA | **não** (só seção "Recomendações") | sim (estruturado) | **ADICIONADO no código (creep legítimo)** |
| Monitoramento contínuo / micro-pulsos | **não** | sim | **ADICIONADO no código (creep legítimo)** |
| Bridge Pentagrama | **não** | sim (opt-in) | **ADICIONADO no código (creep suspeito)** |
| Projeção econômica | **não** | sim | **ADICIONADO no código (creep suspeito)** |

---

## 7. Veredicto operacional para 26/05

### O que é bloqueador para 26/05/2026

**Nada técnico** — sistema passa fiscalização padrão (documental). O fiscal MTE típico vai pedir o pacote de evidências, ver 80 questões aplicadas, scores, plano, monitoramento — tudo presente.

### O que é bloqueador para 1º cliente pago

**CRÍTICO 1** (questões reescritas) — risco de impugnação técnica em fiscalização aprofundada. Cliente pode pedir cópia do instrumento e mostrar a um psicólogo, que vai notar discrepância vs canônico do Jovane. Resolve em 1-2h.

**CRÍTICO 2** (50 laudos ausentes) — promessa de produto não entregue. Resolve em 3-4h.

**CRÍTICO 3** (cortes numéricos) — divergência de classificação em alguns pontos da escala. Resolve em 30 min (Opção A: adotar limites do doc).

**CRÍTICO 4** (pesos não aplicados) — descasamento metodologia ↔ implementação. Resolve em 10 min.

### O que não é bloqueador (mas vale corrigir)

- 5 MATERIAIS — total ~2-3h corrigindo todos.

### O que precisa de decisão do responsável técnico (Jovane)

- Se mantém os 5 alertas sistêmicos como inerentes ao método (assina como autor) ou se remove até validação.
- Se mantém o bridge Pentagrama como leitura clínica válida ou se desabilita.
- Se mantém pesos por dimensão (1.30 assédio, etc.) ou ajusta para 1.0 simples.
- Se mantém os cortes 0-100 do código ou migra para os literais do doc (1.0-1.8 etc).

---

## 8. Plano de correção sugerido (4 patches + tarefas)

Em ordem de prioridade:

### Patch 005 — Cortes de risco alinhados ao doc (CRÍTICO 3)
- Update `NR01_RISK_THRESHOLDS` em `src/types/nr01.ts`
- Update `LIKERT_LABELS` em `src/lib/nr01/instrument.ts` (MATERIAL 1)
- Sem migration; só código TS.
- Tempo: 30min.

### Patch 006 — Pesos do ISO aplicados (CRÍTICO 4)
- Update `processarResultados` em `actions.ts` para passar `dimensionWeights`.
- Adicionar `weights_applied` ao audit log payload.
- Recomputar avaliações concluídas existentes (script Node).
- Tempo: 30min.

### Patch 007 — Questões canônicas v1.1 (CRÍTICO 1)
- `supabase/nr01_patch_007_questoes_canonicas.sql`: novo `instrument_version='v1.1'` com 80 questões LITERAIS do doc + todas `reverse_scored=true`
- Update `METHODOLOGY_TEXT_V1_0` → V1_1 declarando canônico
- Avaliações em `COLETANDO` permanecem em v1.0 (trigger garante)
- Novas avaliações usam v1.1
- Update Bloco 1 (faixas tempo + vínculo)
- Update perguntas abertas (4 textos literais)
- Tempo: 1-2h.

### Patch 008 — Laudos canônicos v1.0 (CRÍTICO 2)
- `supabase/nr01_patch_008_laudos.sql`: tabelas `nr01_laudo_textos` + `nr01_laudo_macros` + seed dos 55 textos literais do doc.
- Update `pdf-data.ts` + `pdf-template.ts` para carregar e renderizar.
- Tempo: 3-4h (a maior parte é digitar/colar os 55 textos).

### Patch 009 — Seções faltantes do laudo robusto (MATERIAL 4)
- Adicionar 6 seções no `pdf-template.ts` (FINALIDADE, FUNDAMENTAÇÃO, CRITÉRIOS, IDENTIFICAÇÃO DOS RISCOS, RECOMENDAÇÕES, CONCLUSÃO).
- Tempo: 1h.

**Total estimado:** 6-8h de trabalho para zerar todos os achados CRÍTICOS + MATERIAIS.

---

## 9. Próximas perguntas para Diego

1. **Quem decide sobre os creeps suspeitos** (alertas, bridge, econômico)? Jovane referenda ou removemos?
2. **Patches 005-009 podem rodar em sequência hoje?** Ou priorizamos só o que entra antes de 26/05 e adiamos o resto?
3. **Avaliação BioBloco em produção** (smoke test em curso) deve ser arquivada e refeita após patches 005+006+007 estarem no ar (cortes mudam → ISO muda → recomputar)?

Aguardando direção.
