# Organização multi-CNPJ — contratante e gerente

## Atores (pós LICENSING_V2)

| Ator | `profiles.role` | Escopo | Quem é no Pasola |
|------|-----------------|--------|------------------|
| **Admin Quantum5G** | `admin` | Plataforma inteira | suporte@ |
| **Consultor licenciado** | `consultant` | Opera CNPJs do contrato (`consultant_id`) | jovane@ (operador) |
| **Contratante** | `contratante` | Grupo contratual: todas as filiais, equipe, módulos | gerencia@pasola.com.br |
| **Gerente de filial** | `gerente` | 1+ CNPJs atribuídos pelo contratante | filiais (a criar) |
| Liderança legada | `leader` | Deprecado — migrar para `contratante` | — |

**Separação importante:** `companies.consultant_id` = operador/licença Quantum5G.  
`companies.org_account_id` = grupo do cliente (Pasola). O contratante **não** substitui o consultor na licença.

## Modelo de dados

```
org_accounts
  id, name, owner_user_id (contratante), consultant_id, created_at

companies.org_account_id → org_accounts

org_members (gerentes e delegados — não o owner)
  org_account_id, user_id, module_*, is_active, created_by

org_member_companies (só gerente)
  member_id, company_id
```

## Permissões do contratante

- Ver todas as empresas do `org_account_id`
- Convidar **gerentes** (e-mail → Supabase invite)
- Atribuir CNPJs por gerente
- Ligar/desligar módulos Pentagrama / NR-01 por gerente
- Bloquear / reativar gerente (`is_active` + ban Auth)
- Reenviar link de redefinição de senha
- **Não** altera `consultant_id` nem faturas (isso é admin/consultor)

## Permissões do gerente

- Ver/editar apenas CNPJs em `org_member_companies`
- Disparos e avaliações nas filiais atribuídas
- Sem criar outros usuários

## RLS (fases)

1. **Fase 1 (esta entrega):** regras na aplicação + service role nas actions do contratante (como `/admin/usuarios`).
2. **Fase 2:** policies `org_*` + `companies_select_contratante` / `companies_select_gerente`.

## Migração Pasola

1. `org_accounts` "Grupo Pasola", owner = `gerencia@pasola.com.br`
2. 7 CNPJs → `org_account_id`
3. `gerencia@` → role `contratante`
4. `consultant_id` permanece `jovane@` (operador)

## Rotas

- `/organizacao/equipe` — contratante gerencia gerentes
- `/admin/usuarios` — admin vê org + empresas vinculadas (ampliado)

## Riscos / efeitos colaterais

| Risco | Mitigação |
|-------|-----------|
| Gerente vê CNPJ não atribuído | Filtro `org_member_companies` em `list-for-actor` |
| Contratante sem org | Redirect + mensagem; admin cria org |
| Convite duplicado | Checar e-mail existente |
| `leader` legado | Tratado como contratante em `list-for-actor` se `owner_user_id` |
