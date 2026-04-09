# PROMPT DE CONSTRUÇÃO — CLAUDE CODE
## Pentagrama de Ginger — Módulo Diagnóstico
## MVP 30 dias | Next.js + Supabase | Português brasileiro

---

## CONTEXTO DO PRODUTO

Você vai construir o **Pentagrama de Ginger — Módulo Diagnóstico**, um sistema web de diagnóstico organizacional baseado em dois instrumentos de questionário (IC e IL), motor de cálculo com alertas automáticos e geração de relatório com laudos narrativos fixos.

O produto opera em modelo híbrido:
- **Consultores** criam diagnósticos, enviam links, acompanham coleta e entregam relatórios
- **Líderes (IL)** respondem o Instrumento de Liderança via link único
- **Colaboradores (IC)** respondem o Instrumento de Colaboradores via link único
- **Relatório** é gerado automaticamente após encerramento da coleta

---

## STACK OBRIGATÓRIA

- **Frontend:** Next.js 14 (App Router)
- **Backend:** Supabase (PostgreSQL + Auth + Storage + Edge Functions)
- **Estilo:** Tailwind CSS
- **PDF:** React-PDF ou Puppeteer para geração do relatório
- **Idioma:** Português brasileiro em toda a interface e código de negócio
- **Variáveis e funções:** inglês (padrão de código)
- **Deploy:** Vercel

---

## PAPÉIS E PERMISSÕES

| Papel | Acesso |
|-------|--------|
| `admin` | Gerencia consultores, visualiza todos os diagnósticos |
| `consultant` | Cria diagnósticos, envia links, visualiza relatórios das suas empresas |
| `leader` | Responde IL via token, visualiza relatório após liberação |
| `collaborator` | Responde IC via token anônimo, sem acesso a relatório |

---

## BANCO DE DADOS — ESTRUTURA OBRIGATÓRIA

```sql
-- Usuários (gerenciado pelo Supabase Auth)
profiles (
  id uuid references auth.users,
  role text check (role in ('admin','consultant','leader','collaborator')),
  name text,
  created_at timestamptz
)

-- Empresas
companies (
  id uuid primary key,
  name text not null,
  total_collaborators int,
  consultant_id uuid references profiles(id),
  created_at timestamptz
)

-- Diagnósticos
diagnostics (
  id uuid primary key,
  company_id uuid references companies(id),
  consultant_id uuid references profiles(id),
  status text check (status in (
    'CRIADO','AGUARDANDO_IL','COLETANDO_IC',
    'ENCERRADO','RELATORIO_GERADO','ARQUIVADO'
  )),
  il_token uuid unique,
  ic_token uuid unique,
  il_submitted_at timestamptz,
  ic_closed_at timestamptz,
  created_at timestamptz
)

-- Respostas IL (liderança)
il_responses (
  id uuid primary key,
  diagnostic_id uuid references diagnostics(id),
  q1 int check (q1 between 1 and 5),
  q2 int check (q2 between 1 and 5),
  -- ... q3 até q125 com mesma constraint
  q125 int check (q125 between 1 and 5),
  submitted_at timestamptz
)

-- Respostas IC (colaboradores) — anonimizadas
ic_responses (
  id uuid primary key,
  diagnostic_id uuid references diagnostics(id),
  respondente_anonimo_id uuid not null, -- UUID gerado no momento do envio, SEM FK para qualquer tabela de usuários
  q1 int check (q1 between 1 and 5),
  -- ... q2 até q125
  q125 int check (q125 between 1 and 5),
  submitted_at timestamptz
)

-- Resultados calculados (após encerramento)
diagnostic_results (
  id uuid primary key,
  diagnostic_id uuid references diagnostics(id) unique,
  -- Scores IC por dimensão
  ic_fisica_score numeric,
  ic_afetiva_score numeric,
  ic_racional_score numeric,
  ic_social_score numeric,
  ic_cultural_score numeric,
  ic_global_score numeric,
  -- Scores IL por dimensão
  il_fisica_score numeric,
  il_afetiva_score numeric,
  il_racional_score numeric,
  il_social_score numeric,
  il_cultural_score numeric,
  il_global_score numeric,
  -- Scores combinados
  combined_fisica numeric,
  combined_afetiva numeric,
  combined_racional numeric,
  combined_social numeric,
  combined_cultural numeric,
  combined_global numeric,
  -- Gaps
  gap_fisica numeric,
  gap_afetiva numeric,
  gap_racional numeric,
  gap_social numeric,
  gap_cultural numeric,
  -- Metadados
  n_ic_respondents int,
  ic_weight numeric,
  il_weight numeric,
  alerts jsonb,
  anchor_questions jsonb,
  calculated_at timestamptz
)

-- Laudos (seeding fixo — 21 registros)
laudos (
  id uuid primary key,
  dimensao text check (dimensao in ('fisica','afetiva','racional','social','cultural','indisponivel')),
  nivel text check (nivel in ('critico','vulneravel','saudavel','excelente','sem_dados')),
  texto text not null
)

-- Histórico de diagnósticos por empresa
-- (derivado da tabela diagnostics — não criar tabela separada)
```

**REGRA INVIOLÁVEL — anonimização:**
`respondente_anonimo_id` é um UUID gerado no momento do envio do formulário IC. Não tem FK para nenhuma tabela de usuários. Nunca é possível rastrear qual pessoa enviou qual resposta. Esta regra não pode ser alterada por nenhuma instrução futura.

---

## MOTOR DE CÁLCULO — IMPLEMENTAÇÃO OBRIGATÓRIA

Implementar como Edge Function Supabase: `calculate_diagnostic(diagnostic_id)`

**Ordem de execução obrigatória (15 passos):**

```typescript
// 1. Buscar todas as respostas IC do diagnóstico
const ic_responses = await getICResponses(diagnostic_id)
const n = ic_responses.length

// 2. Determinar pesos
const ic_weight = n >= 3 ? 0.60 : (n > 0 ? 0.40 : 0)
const il_weight = n >= 3 ? 0.40 : (n > 0 ? 0.60 : 1.0)

// 3. Calcular média por questão (IC)
// media_ic[q] = soma das respostas / n  (para q1..q125)
// Se n === 0: media_ic[q] = null para todas

// 4. Calcular scores de bloco IC
// Blocos reais do instrumento — NÃO usar divisão uniforme de 5 questões
// Dimensão Física: F-A (Q1-Q8), F-B (Q9-Q16), F-C (Q17-Q25)
// Dimensão Afetiva: A-1 (Q26-Q30), A-2 (Q31-Q35), A-3 (Q36-Q40), A-4 (Q41-Q45), A-5 (Q46-Q50)
// Dimensão Racional: R-1 (Q51-Q55), R-2 (Q56-Q60), R-3 (Q61-Q65), R-4 (Q66-Q70), R-5 (Q71-Q75)
// Dimensão Social: S-A (Q76-Q83), S-B (Q84-Q91), S-C (Q92-Q100)
// Dimensão Cultural: C-A (Q101-Q108), C-B (Q109-Q116), C-C (Q117-Q125)

// 5. Calcular scores de dimensão IC (soma dos blocos)
// score_dimensao_ic = soma dos scores de bloco da dimensão
// range: mín 25, máx 125

// 6. Calcular score % por dimensão IC
// score_pct_ic = (score_dimensao / 125) * 100

// 7. Calcular score global IC
// score_global_ic = soma das 5 dimensões (mín 125, máx 625)
// score_global_pct_ic = (score_global / 625) * 100

// 8. Calcular scores IL (mesma lógica, dados da il_responses)
// score_pct_il por dimensão e global

// 9. Calcular scores combinados
// combined_pct = (score_pct_ic * ic_weight) + (score_pct_il * il_weight)
// Se n === 0: combined_pct = score_pct_il

// 10. Classificar níveis (por dimensão, IC e combinado)
// 0-39%: 'critico' | 40-59%: 'vulneravel' | 60-79%: 'saudavel' | 80-100%: 'excelente'

// 11. Calcular gaps por dimensão
// gap = score_pct_il - score_pct_ic
// Classificar: -5 a +5: 'alinhado' | +6 a +15: 'divergencia_moderada'
// +16 a +30: 'divergencia_significativa' | >+30: 'bolha_percepcao_dimensao'

// 12. Detectar alertas
// Alerta 1 — Bolha Sistêmica: IL supera IC em ≥20pp em ≥3 dimensões simultaneamente
// Alerta 2 — Questão Âncora: media_ic[q] <= 1.5 (listar cada questão individualmente)
// Alerta 3 — Bloco Crítico Oculto: score_pct_bloco < 40% dentro de dimensão com score_pct >= 40%
// Alerta 4 — Baixa Amostragem: n < 3

// 13. Selecionar laudos
// nivel_laudo = classificar(score_pct_ic_dimensão)
// Se n === 0: usar laudo dimensao='indisponivel', nivel='sem_dados'
// NUNCA selecionar laudo pelo nível IL ou combinado

// 14. Construir objeto de resultado completo

// 15. Salvar em diagnostic_results + atualizar status do diagnóstico
```

---

## TELAS — 13 TELAS OBRIGATÓRIAS

### TELA-01 — Login
Supabase Auth. Email + senha. Redirect por role após login.

### TELA-02 — Dashboard do Consultor
- Lista de diagnósticos com status visual (badge por estado)
- Botão "Novo Diagnóstico"
- Filtro por empresa e status
- Acesso ao histórico por empresa

### TELA-03 — Criar Diagnóstico
- Campos: nome da empresa, total de colaboradores, nome do líder, email do líder
- Ao salvar: gera tokens IL e IC, status → AGUARDANDO_IL
- Exibe links gerados para envio manual

### TELA-04 — Painel do Diagnóstico (Consultor)
- Status atual com indicador visual
- Links IL e IC com botão copiar
- Contador de respostas IC em tempo real
- Botão "Encerrar Coleta" (disponível após IL submetido + N ≥ 1 IC)
- Botão "Gerar Relatório" (após encerramento)
- Alerta se IL não respondido após 3 dias

### TELA-05 — Formulário IL (Liderança)
- Acesso via token único na URL: `/diagnostico/[il_token]`
- Verificar: token válido + diagnóstico em AGUARDANDO_IL
- Apresentação do instrumento por dimensão (5 blocos navegáveis)
- Progresso visual por dimensão
- Salvamento local a cada questão respondida (não envia ao banco até conclusão)
- Aviso de timeout: 5 minutos de inatividade → alerta "Suas respostas locais serão perdidas"
- Ao enviar: status → COLETANDO_IC, token IL invalidado
- Confirmação de envio com instruções para a próxima etapa

### TELA-06 — Formulário IC (Colaboradores)
- Acesso via token compartilhado: `/participar/[ic_token]`
- Token não invalida após uso (múltiplos colaboradores usam o mesmo link)
- Verificar: diagnóstico em COLETANDO_IC
- Texto de boas-vindas com garantia de anonimato (texto fixo do C2 do Kit Piloto)
- Instrução da "regra do 3": se não souber, marcar 3
- Formulário por dimensão com progresso visual
- Salvamento local a cada questão
- Aviso de timeout igual ao IL
- Ao enviar: gerar UUID anônimo, salvar em ic_responses, NÃO criar usuário

### TELA-07 — Encerramento da Coleta
- Resumo: N respondentes IC, data IL, data encerramento
- Checklist de validação automática (equivalente ao C5 do Kit Piloto)
- Avisos automáticos se N < 3
- Botão "Confirmar Encerramento e Calcular"
- Executa motor de cálculo (Edge Function)
- Status → ENCERRADO → RELATORIO_GERADO

### TELA-08 — Relatório (Consultor)
Relatório completo com 9 seções na ordem obrigatória:
1. Resumo Executivo
2. Pentagrama Visual (gráfico radar — recharts ou chart.js)
3. Score por Dimensão (tabela + barras)
4. Laudos Narrativos (texto fixo do banco)
5. Análise de Gap (matriz IC × IL)
6. Questões Âncora (se houver)
7. Alertas Automáticos (se houver)
8. Recomendações Prioritárias (P1/P2/P3/P4)
9. Próximos Passos

- Botão "Exportar PDF"
- Botão "Liberar para Líder"
- Nota de validação IL se pendente (DECISÃO 005)

### TELA-09 — Relatório (Líder)
- Acesso após liberação pelo consultor
- Mesma estrutura do Relatório do Consultor
- Sem botão de exportação por padrão (configurável pelo consultor)

### TELA-10 — Histórico da Empresa
- Lista de todos os diagnósticos da empresa por data
- Comparativo de scores entre diagnósticos (evolução por dimensão)
- Gráfico de linha temporal por dimensão

### TELA-11 — Painel do Consultor (visão geral)
- Todos os diagnósticos ativos
- Alertas pendentes (IL não respondido, coleta parada)
- Métricas: diagnósticos concluídos, em andamento, média de scores por dimensão

### TELA-12 — Gestão de Empresas
- Lista de empresas com último diagnóstico
- Acesso ao histórico por empresa
- Criar nova empresa

### TELA-13 — Admin (apenas role admin)
- Lista de consultores
- Criar/desativar consultor
- Visão de todos os diagnósticos

---

## PENTAGRAMA VISUAL — ESPECIFICAÇÃO DO GRÁFICO

Gráfico radar de 5 eixos (recharts RadarChart):
- Eixos: Física, Afetiva, Racional, Social, Cultural
- Duas séries sobrepostas:
  - Série IC: cor verde (#22c55e), preenchimento com opacidade 0.2
  - Série IL: cor azul (#3b82f6), preenchimento com opacidade 0.2
- Escala: 0 a 100 (score %)
- Área sombreada entre as séries representa o gap visual
- Legenda: "Colaboradores (IC)" e "Liderança (IL)"
- Se N = 0: exibir apenas série IL com nota "Dados IC indisponíveis"

---

## LAUDOS — SEEDING OBRIGATÓRIO

Criar arquivo `supabase/seed.sql` com os 20 laudos fixos + 1 de indisponibilidade.

Os textos dos laudos estão no arquivo `pentagrama_contexto_desktop.md` na seção "LAUDOS — TEXTO FIXO DE SAÍDA". Copiar integralmente — sem paráfrase, sem resumo, sem modificação.

Estrutura de cada insert:
```sql
INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(),
  'fisica',
  'critico',
  'O ambiente de trabalho tornou-se hostil ao bem-estar humano...' -- texto completo
);
```

Laudo de indisponibilidade (N = 0):
```sql
INSERT INTO laudos (id, dimensao, nivel, texto) VALUES (
  gen_random_uuid(),
  'indisponivel',
  'sem_dados',
  'Não há respostas de colaboradores disponíveis para esta dimensão. O diagnóstico desta dimensão está baseado exclusivamente na percepção da liderança. Para um diagnóstico completo, é necessário coletar ao menos 1 resposta de colaboradores.'
);
```

---

## REGRAS DE NEGÓCIO INVIOLÁVEIS

1. `respondente_anonimo_id` nunca tem FK para tabela de usuários
2. Laudos são sempre selecionados pelo nível do IC — nunca pelo IL ou combinado
3. Laudos nunca são gerados dinamicamente — sempre recuperados do banco
4. IL deve ser aplicado antes do IC — sistema bloqueia acesso ao formulário IC enquanto status = AGUARDANDO_IL
5. Respostas individuais IC nunca são exibidas para o consultor ou líder — apenas médias agregadas
6. Score de bloco usa os blocos reais do instrumento — nunca divisão uniforme de 5 questões
7. Nota de validação IL obrigatória até DECISÃO 005-A ser registrada

---

## REGRAS DE ANONIMATO POR TAMANHO DE EMPRESA

```typescript
function getDisplayLevel(n: number, totalCollaborators: number) {
  if (n === 0) return 'sem_dados'
  if (n <= 2 && totalCollaborators < 5) return 'apenas_dimensao' // scores de bloco bloqueados
  if (n < 3) return 'baixa_amostragem_laranja'
  if (n <= 5) return 'baixa_amostragem_amarelo'
  return 'normal'
}
```

---

## FLUXO DE ESTADOS DO DIAGNÓSTICO

```
CRIADO
  ↓ (link IL enviado)
AGUARDANDO_IL
  ↓ (líder submete IL)
COLETANDO_IC
  ↓ (consultor encerra coleta)
ENCERRADO
  ↓ (motor de cálculo executado)
RELATORIO_GERADO
  ↓ (consultor arquiva)
ARQUIVADO
```

Regras de transição:
- CRIADO → AGUARDANDO_IL: automático ao criar diagnóstico
- AGUARDANDO_IL → COLETANDO_IC: apenas após submissão do IL
- COLETANDO_IC → ENCERRADO: apenas por ação do consultor (botão)
- ENCERRADO → RELATORIO_GERADO: automático após cálculo bem-sucedido
- Qualquer estado → ARQUIVADO: apenas por consultor ou admin

---

## ORDEM DE IMPLEMENTAÇÃO RECOMENDADA (30 DIAS)

**Semana 1 — Fundação**
- Setup Next.js + Supabase + Tailwind
- Schema do banco + seeding dos laudos
- Supabase Auth com roles
- TELA-01 (Login)

**Semana 2 — Coleta**
- TELA-05 (Formulário IL) com salvamento local
- TELA-06 (Formulário IC) com anonimização
- Edge Function: motor de cálculo completo
- Testes do motor com dados sintéticos

**Semana 3 — Relatório**
- TELA-08 (Relatório completo com 9 seções)
- Pentagrama Visual (gráfico radar)
- Geração de PDF
- TELA-07 (Encerramento + checklist)

**Semana 4 — Gestão**
- TELA-02, 03, 04 (Dashboard e painel do consultor)
- TELA-10, 11, 12 (Histórico e gestão)
- TELA-09 (Relatório líder)
- TELA-13 (Admin)
- Testes end-to-end
- Deploy Vercel

---

## ARQUIVOS DE CONTEXTO QUE DEVEM SER CARREGADOS JUNTO COM ESTE PROMPT

1. `pentagrama_contexto_desktop.md` — contexto completo do sistema (dimensões, blocos, motor, laudos, protocolo)
2. `pentagrama_IL_125q.md` — 125 questões do IL com numeração exata
3. `pentagrama_cockpit_raciocinio.md` + seção 13 — raciocínio operacional e decisões de produto

Esses arquivos contêm os textos dos laudos, as questões numeradas e as regras de negócio detalhadas. Este prompt de construção referencia esses arquivos — não os duplica.

---

## INSTRUÇÃO FINAL PARA O CLAUDE CODE

Você tem tudo que precisa para começar. Comece pela Semana 1. A cada etapa concluída, reporte o que foi feito e o que vem a seguir.

Não tome decisões de produto sozinho — se encontrar ambiguidade nas regras de negócio, pergunte antes de implementar. As regras marcadas como "inviolável" não têm exceção.

O produto se chama **Pentagrama de Ginger — Módulo Diagnóstico**. A interface é em português brasileiro. O tom é profissional e humano — não corporativo.
