
---

## 13. DECISÕES DE PRODUTO — REGISTRO PERMANENTE

> Decisões tomadas pelo responsável do projeto. Não reabrir sem justificativa explícita.
> Data: 2026-03-24

---

### DECISÃO 001 — Estrutura de blocos na planilha de cálculo (C4)

**Contexto:** O Agente 2 gerou a planilha C4 com divisão uniforme de 5 questões por bloco para simplificação. O instrumento original tem blocos de tamanhos variados (5 a 8 questões por bloco conforme a dimensão).

**Decisão:** Blocos reais do instrumento. A variação de tamanho entre blocos é intencional e de autoria do Jovane Borlini da Silva — não é arbitrária. Divisão uniforme gera scores de bloco incorretos e invalida o alerta de Bloco Crítico Oculto.

**Impacto:** C4 precisa ser refeita com os blocos reais conforme especificados no contexto principal. Qualquer planilha ou implementação digital que use divisão uniforme de 5 questões por bloco está incorreta.

**Inviolável:** sim.

---

### DECISÃO 002 — Comportamento do sistema com amostras pequenas (k-anonymity)

**Contexto:** A Seção 6 da Especificação Técnica sugeriu limiar de k-anonymity em N ≤ 5 com decisão pendente entre bloquear scores de bloco ou apenas avisar.

**Decisão:** Avisar, não bloquear — com uma exceção de proteção ética.

**Regra completa para implementação:**

| Condição | Comportamento do sistema |
|----------|--------------------------|
| N ≥ 6 | Operação normal. Sem avisos adicionais. |
| N entre 3 e 5 | Aviso amarelo em todas as seções dependentes de IC: *"Amostra reduzida — dados interpretados com cautela."* Scores exibidos normalmente. |
| N menor que 3 | Protocolo de baixa amostragem: pesos invertidos (IC=40%, IL=60%). Aviso laranja. Scores exibidos com ressalva explícita. |
| N igual a 1 ou 2 E empresa com menos de 5 colaboradores no total | Scores de bloco bloqueados. Apenas score de dimensão exibido. Aviso de proteção de anonimato. Esta é a exceção de bloqueio. |
| N = 0 | Sem dados IC. Sem scores IC. Sem laudos. Relatório parcial apenas com IL. Aviso vermelho. |

**Justificativa da exceção:** em empresas com menos de 5 colaboradores, scores por bloco podem identificar respondentes individuais. O bloqueio é proteção ética — não configuração opcional.

**Inviolável:** a exceção de bloqueio para N ≤ 2 em empresas com menos de 5 colaboradores totais é inviolável. Os demais limiares podem ser revisados com justificativa.

---

### DECISÃO 003 — Laudos: seleção pelo nível do IC, nunca pelo IL ou combinado

**Contexto:** Definição operacional de qual score determina qual laudo é exibido no relatório.

**Decisão:** O laudo é sempre selecionado pelo nível do IC. O laudo descreve o campo como vivido pelos colaboradores — não como percebido pela liderança e não como média ponderada.

**Regra para implementação:**
```
nivel_laudo = classificar(score_pct_IC_dimensão)
laudo_exibido = banco_laudos[dimensão][nivel_laudo]
```

**Exceção (N = 0):** exibir texto único de indisponibilidade — não selecionar laudo por nível IL.

**Inviolável:** sim.

---

### DECISÃO 004 — Laudos são seeding fixo no banco, nunca geração dinâmica

**Contexto:** Os laudos são textos de autoria de Jovane Borlini da Silva. São a voz clínica do produto.

**Decisão:** Os 20 laudos (5 dimensões × 4 níveis) são inseridos como registros fixos no banco de dados na inicialização do sistema. O sistema os recupera — nunca os gera, resume, parafraseia ou modifica.

**Estrutura mínima da tabela:**
```
laudos (
  id,
  dimensao,     -- fisica | afetiva | racional | social | cultural
  nivel,        -- critico | vulneravel | saudavel | excelente
  texto         -- texto integral, imutável
)
```
Total: 20 registros. Mais 1 registro de indisponibilidade (N=0). Total mínimo: 21 entradas.

**Inviolável:** sim. Qualquer geração dinâmica de laudo é proibida.

---

### DECISÃO 005 — IL não validado: nota obrigatória até validação autoral

**Contexto:** O IL foi construído por espelhamento lógico do IC. Não passou por revisão formal de Jovane Borlini da Silva.

**Decisão:** Até a validação autoral ser concluída e registrada, toda saída que use dados do IL deve exibir nota:

> *"O Instrumento de Liderança (IL) está pendente de validação autoral por Jovane Borlini da Silva. Resultados do IL devem ser interpretados com cautela em aplicações formais."*

**Condição de remoção:** nota removida após confirmação escrita de validação pelo autor. A confirmação deve ser registrada neste arquivo como DECISÃO 005-A.

**Inviolável:** a nota é obrigatória até 005-A ser registrada.

---

### DECISÃO 005-A — Nota de cautela IL removida

**Condição cumprida:** validação autoral concluída em 2026-03-24
**Registrado em:** 2026-03-24

A nota de cautela do IL **não deve aparecer no produto.** A condição definida em DECISÃO 005 foi satisfeita com a validação de Jovane Borlini da Silva.

**Impacto na implementação:** remover qualquer exibição da nota de cautela do IL no código. Nenhuma tela, relatório ou exportação deve exibir o aviso de validação pendente.

**Inviolável:** sim — a remoção é definitiva após esta confirmação.

---

### DECISÃO 006 — Stack tecnológica do produto digital

**Status: CONCLUÍDO**
**Data:** 2026-03-24

**Stack definida:**
- Frontend/Backend: Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- Banco de dados: Supabase (PostgreSQL + Auth + RLS + Edge Functions)
- Deploy: Vercel

---

### DECISÃO 007 — Validação autoral do IL (Jovane Borlini da Silva)

**Status: CONCLUÍDO**
**Validado por:** Jovane Borlini da Silva (co-fundador, Quantum5G)
**Data:** 2026-03-24
**Resultado:** IL aprovado para uso em aplicações formais

O Instrumento de Liderança (125 questões espelhadas) foi revisado e validado pelo autor do método. A lógica de espelhamento, os vetores por dimensão e os itens individuais foram aprovados para uso diagnóstico formal.

---

### CAMPOS RESERVADOS PARA DECISÕES FUTURAS

```
DECISÃO 008 — Teste piloto: organização e data
Status: PENDENTE
Responsável: [proprietário do projeto]
Prazo: após lançamento do MVP
```
