# Equipe, listas de transmissão e disparo tokenizado

Documento de produto — alinhamento Pentagrama Ginger + NR-01 (2026-05).

## Visão de negócio

O SaaS atende **dois produtos** sobre a mesma base de **empresas clientes** e **consultores**:

| Módulo | Valor entregue | Público da pesquisa |
|--------|----------------|---------------------|
| **Pentagrama** | Diagnóstico organizacional (IL × IC, gap, laudos) | Líderes (IL) e colaboradores (IC), papéis distintos |
| **NR-01** | Conformidade GRO / fatores psicossociais | Coleta **anônima**; disparo não distingue papel |

**Ativo compartilhado:** cadastro da empresa (CNPJ, RT, equipe). A equipe alimenta **listas de transmissão** usadas pelo disparo de e-mail do próprio SaaS (Resend em produção; log no console sem `RESEND_API_KEY`).

## Modelo de dados

- `company_contacts` — equipe: `leader` | `collaborator`, e-mail único por empresa.
- `survey_invites` — um convite tokenizado por pessoa × campanha (`module` + `survey_kind` + `reference_id`).
- `email_dispatch_batches` / `email_dispatch_items` — auditoria de cada disparo.

Migração: `supabase/migrations/20260530500000_company_contacts_survey_dispatch.sql`.

## Regras de disparo

| Contexto | Destinatários | Link |
|----------|---------------|------|
| Pentagrama IL | Contatos `leader` ativos | `/il/{il_token}?invite={uuid}` |
| Pentagrama IC | Contatos `collaborator` ativos | `/ic/{ic_token}?invite={uuid}` |
| NR-01 coleta | **Todos** contatos ativos | `/nr01/coleta/{collection_token}?invite={uuid}` |

- `?invite=` rastreia **envio/abertura** do convite; **não** identifica resposta no IC nem na NR-01 (anonimato preservado).
- Pentagrama: status do diagnóstico restringe disparo (`AGUARDANDO_IL` → IL; `COLETANDO_IC` → IC).
- NR-01: disparo quando avaliação em `COLETANDO`.

## Telas

- `/empresas/[id]/equipe` — CRUD da equipe e resumo (líderes / colaboradores / lista NR-01).
- `/diagnostico/[id]/disparos` — disparo IL/IC.
- `/nr01/avaliacao/[id]/disparos` — disparo coleta.

## Limitações conhecidas (roadmap)

1. **IL:** ainda uma resposta IL por diagnóstico; múltiplos líderes recebem convite, mas o formulário IL não está multi-respondente.
2. Sincronização legado `company_il_leaders` → preferir apenas `company_contacts` no formulário de empresa.
3. Reenvio individual, CSV e preview de e-mail — não implementados.

## Aplicar no Supabase

```bash
npx supabase db push
```

Incluir na ordem as migrations anteriores de empresas/usuários se ainda não aplicadas.
