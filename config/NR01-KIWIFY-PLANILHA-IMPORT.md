# Planilha Kiwify NR-01 — como importar no Google Sheets

Arquivo fonte: **`nr01-kiwify-planilha.xlsx`** (regenerar: `node scripts/build-nr01-kiwify-planilha.mjs`).

## Importar sem virar "Planilha1" / "Planilha2"

1. Google Drive → **Novo → Upload** → selecione `nr01-kiwify-planilha.xlsx`.
2. Clique com o botão direito no arquivo → **Abrir com → Planilhas Google**.
3. Confira na barra inferior as abas:
   - `Faixas_t01-t15` (15 linhas de dados)
   - `Checkouts_30` (30 linhas de dados)
4. Se aparecer só uma aba ou nomes `Planilha1`: você importou **CSV** por engano. Apague e use o **.xlsx**.

**Não** use “Arquivo → Importar → CSV” para este pacote (isso cria uma aba só e perde a t11 em merges manuais).

## Renomear abas (se o Google traduziu)

| De | Para |
|----|------|
| Planilha1 | `Faixas_t01-t15` |
| Planilha2 | `Checkouts_30` |

## Conferência rápida

- **Faixas:** cabeçalho linha 1 = `Faixa | Trabalhadores | Nome do produto | ...`
- **Faixas:** linhas 2–16 = `t01` … `t15` (inclui **t11** · 101–200 · R$ 17556.00)
- **Checkouts:** linhas 2–31, `Link Kiwify` e `product_id` vazios
- Preços com **ponto** decimal (2460.00)

## Compartilhar

Compartilhar → Qualquer pessoa com o link → **Visualizador**.
