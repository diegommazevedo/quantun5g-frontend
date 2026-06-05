# LICENSING_V2 — modelo comercial unificado

**Flag:** `NEXT_PUBLIC_LICENSING_V2=true` (default off em produção).

## Ator único

| Antes | Depois (V2) |
|-------|-------------|
| Leader paga, consultor opera | **Consultor licenciado** paga e opera |
| Slots em `account_user_id` | Slots em `consultant_id` |
| IL = usuário líder | IL = **contato de pesquisa** (token), não login |

## Planos porta a porta

- `b2c` — 1 CNPJ (default)
- `b2b` — N CNPJs (`metadata.company_cnpj_slots`)

Rota: `/contratacao?plan=b2c|b2b` — fatura com `user_id` = consultor logado.

## Migração cirúrgica

1. V2 off: comportamento legado (`account_user_id`, role `leader`).
2. V2 on: limite e contagem por `consultant_id`; `account_user_email` só admin (legado Pasola).
3. Dados existentes preservados; sem remover colunas.

## Backup pré-implementação

`backups/quantum5g_pre-licensing-v2_*.zip` — fonte + subset SQL.

## Sprints

| Sprint | Entrega |
|--------|---------|
| S0 | `model.ts`, flag, este doc |
| S1 | `countConsultantCompanies`, assert em `criarEmpresa`, banner `/empresas` |
| S2 | `/contratacao?plan=`, fatura self |
| S3 | Nav/copy unificados |
| S4 | `account_user_email` admin-only, soft-deprecar `leader` na nav |
