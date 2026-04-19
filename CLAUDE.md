# Quantum5G — Pentagrama de Ginger (Módulo Diagnóstico)

## Contexto do Projeto

Sistema diagnóstico organizacional digital baseado no modelo Pentagrama de Ginger.
Autor do método: Jovane Borlini da Silva (psicólogo, Gestalt-terapia, co-fundador Quantum5G).
IL validado pelo autor em 2026-03-24.

## Stack

- **Frontend/Backend:** Next.js 14+ (App Router, TypeScript, Tailwind CSS)
- **Banco de dados:** Supabase (PostgreSQL + Auth + RLS)
- **Deploy:** Vercel

## Arquivos de Contexto (ler antes de qualquer tarefa)

Todos os arquivos estão em `docs/`:

| Arquivo | Conteúdo |
|---------|----------|
| `pentagrama_contexto_desktop.md` | Briefing completo do sistema — dimensões, motor, laudos, protocolo |
| `pentagrama_IL_125q.md` | IL completo — 125 questões validadas pelo autor |
| `pentagrama_ginger_solucao_tecnologica.md` | Especificação técnica de produto — fluxos, telas, motor, alertas, banco, confidencialidade |
| `pentagrama_claude_code_prompt.md` | Prompt de entrada para Semana 1 |
| `pentagrama_cockpit_secao13.md` | Decisões de produto registradas (001–007) |
| `nr01_modulo_arquitetura.md` | Módulo NR-01 — análise sênior + mapa de arquivos + roadmap |

## Decisões de Produto Fechadas

- **001** — Laudo selecionado pelo nível do IC (campo vivido), nunca pelo IL
- **002** — Respostas individuais IC nunca expostas (apenas médias agregadas)
- **003** — IL aplicado ANTES do IC (sequência inviolável)
- **004** — Amostra mínima IC = 3; abaixo disso pesos invertem (IC 40% / IL 60%)
- **005** — Gaps negativos exibem aviso "IC superior ao IL" sem classificação de risco
- **006** — Stack: Next.js + Supabase
- **007** — IL validado por Jovane Borlini da Silva (2026-03-24) ✅

## Estrutura do Projeto

```
src/
├── app/
│   ├── (auth)/login/
│   ├── (dashboard)/dashboard/
│   ├── (diagnostico)/diagnostico/[id]/
│   ├── (questionario)/il/[token]/
│   ├── (questionario)/ic/[token]/
│   ├── (relatorio)/relatorio/[id]/
│   └── api/
│       ├── diagnostico/
│       ├── respostas/
│       └── relatorio/
├── components/
│   ├── ui/
│   ├── questionario/
│   ├── relatorio/
│   └── pentagrama/
├── lib/
│   ├── supabase/
│   ├── motor/
│   └── laudos/
├── types/
└── constants/
docs/
```

## Papéis do Sistema

| Papel | Acesso |
|-------|--------|
| ADMIN | Gerencia consultores e diagnósticos |
| CONSULTOR | Cria/conduz diagnósticos, acessa relatórios |
| LIDERANÇA (LID) | Responde IL via token — sem login |
| COLABORADOR (COL) | Responde IC via token — anônimo |

## Estados do Diagnóstico

`CRIADO → AGUARDANDO_IL → AGUARDANDO_IC → IC_EM_ANDAMENTO → ENCERRADO → ARQUIVADO`

## Regras Críticas de Implementação

1. **Motor de cálculo:** Score Combinado = (IC × 0,60) + (IL × 0,40). Se N < 3: pesos invertem.
2. **Laudos:** textos fixos no banco (seeding). 20 laudos (5 dim × 4 níveis) + 1 genérico = 21 entradas.
3. **Confidencialidade:** `respondente_anonimo_id` = UUID sem FK para usuários. Nunca expor respostas individuais IC.
4. **Alertas:** Bolha Sistêmica (≥20% em 3+ dim) ≠ Bolha por Dimensão (gap >30% em 1 dim).
5. **Controle de acesso:** consultor só vê seus próprios diagnósticos.

## Como Começar

1. Ler `docs/pentagrama_ginger_solucao_tecnologica.md`
2. Ler `docs/pentagrama_claude_code_prompt.md`
3. Configurar `.env.local` com credenciais Supabase
4. `npm run dev` — http://localhost:3000

## Módulo NR-01 (paralelo ao Pentagrama)

Sistema regulatório para Fatores de Risco Psicossocial Relacionados ao Trabalho
conforme NR-01/GRO (Portarias MTE 1.419/2024 + 765/2025). Vigência punitiva
em **26/05/2026**. Reusa auth, multi-tenancy e padrões do Pentagrama; bridge
opcional cruza ISO regulatório com IC vivido.

**Arquivos:**
- SQL: `supabase/nr01_schema.sql` + `nr01_rls.sql` + `nr01_seed.sql`
- Tipos: `src/types/nr01.ts`
- Lib: `src/lib/nr01/{instrument,scoring,economic,evidence,bridge-pentagrama}.ts`
- Rotas autenticadas: `src/app/(nr01)/nr01/{dashboard,avaliacao}`
- Coleta pública: `src/app/(questionario)/nr01/coleta/[token]`
- Análise completa: `docs/nr01_modulo_arquitetura.md`

**Estados da avaliação NR-01:**
`CRIADO → COLETANDO → COLETA_ENCERRADA → PROCESSANDO → CONCLUIDO → ARQUIVADO`

**Regras críticas NR-01:**
1. **k-anonymity ≥ 5** (configurável por avaliação) — view `nr01_dim_scores_safe`.
2. **Anon_id sem FK** — anonimato inviolável (mesma regra do IC do Pentagrama).
3. **Pacote de evidências imutável** — hash SHA-256 do instrumento + hash global
   do pacote; primeira coisa que o auditor fiscal abre.
4. **Audit log append-only** (`nr01_audit_log`) com `ip_hash` (LGPD).
5. **Cruzamento com Pentagrama é opcional** — set `linked_diagnostic_id` na
   criação para habilitar bridge.
