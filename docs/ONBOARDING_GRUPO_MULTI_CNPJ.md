# Onboarding — Grupo multi-CNPJ (ex.: Pasola · 7 CNPJs)

## Modelo de dados (quem vê o quê)

| Entidade | Isolamento |
|----------|------------|
| `companies` | `consultant_id` = consultor que opera; `account_user_id` = cliente pagante (slots) |
| `diagnostics` / `nr01_assessments` | `consultant_id` + `company_id` |
| Respostas IC / coleta NR-01 | Anônimas; consultor só vê agregados |
| Fatura | `user_id` = licença do cliente; `consultant_id` = quem emitiu |

**Consultor (Pasola):** vê todas as empresas com `consultant_id = seu usuário`.  
**Cliente líder:** vê empresas com `account_user_id = seu usuário` (após RLS `companies_select_leader`).

## Checklist operacional — 7 CNPJs + NR-01 + Pentagrama

### 1. Contrato (admin)

1. `/contratacao` ou API fatura: módulos **NR-01 + Pentagrama (combo)**.
2. **Qtd. empresas (CNPJs) = 7**.
3. CNPJ + e-mail do **primeiro** CNPJ / líder do grupo.
4. Fluxo: emitida → **aprovada** → **paga** (só admin marca paga).
5. Confirma no perfil do cliente: `module_nr01` e `module_pentagrama` = true.

### 2. Consultor Pasola

1. Perfil `consultant` com módulos ativos (padrão do sistema: true).
2. Cadastrar **7 empresas** em `/empresas/nova` (uma por CNPJ).
3. Em cada ficha, preencher **E-mail do cliente pagante** = mesmo e-mail da fatura (consome 1 slot por CNPJ).
4. RT + líderes IL em cada empresa.

### 3. Por CNPJ (repetir 7×)

1. **NR-01:** nova avaliação → processar → devolutiva híbrida (se Pentagrama vinculado).
2. **Pentagrama:** novo diagnóstico → IL → IC → encerrar → relatório.

### 4. Produção

```bash
npm run db:apply-pending   # hybrid_reports + companies_select_leader
```

## Limites

- Slots: metadata `company_cnpj_slots` na fatura (máx. 50).
- CNPJ duplicado: bloqueado globalmente na tabela `companies`.
- CNPJ de outro consultor: `upsertCompanyByCnpj` rejeita.

## O que NÃO fazer

- Não confiar só no 1º CNPJ da fatura — os outros 6 precisam cadastro manual com vínculo ao pagante.
- Não usar mesmo CNPJ duas vezes.
- Líder **não** cadastra empresa pelo formulário consultor (role `leader` redireciona).
