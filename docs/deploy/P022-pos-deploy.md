# P022 — Pós-deploy (LP NR-01 + audit log)

Checklist executável. Sem tráfego pago até CRP real e páginas legais completas.

## Pré-requisitos

- [ ] Commit com P022 em `main` (ou branch que a Vercel faz deploy).
- [ ] `.env.local` com connection string `postgresql://...` se fores aplicar SQL pelo cliente.

---

## 1. Supabase — migration P022

**Ficheiro:** `supabase/migrations/20260504003000_nr01_patch_022_lp_audit.sql`

Aplicar com o fluxo habitual do projeto (`supabase db push`, migration CI, ou SQL Editor).

### Validação SQL

```sql
SELECT id, event_type, actor_role, payload->>'patch' AS patch, created_at
FROM nr01_audit_log
WHERE event_type = 'PATCH_022_LP_NR01_ENRICHMENT'
ORDER BY id DESC
LIMIT 5;
```

**Aceite:** ≥ 1 linha com `event_type = 'PATCH_022_LP_NR01_ENRICHMENT'`.  
**Se 0 linhas:** migration não correu ou correu noutro projeto/ref.

---

## 2. Variáveis de ambiente

| Variável | Onde | Nota |
|----------|------|------|
| `NEXT_PUBLIC_JOVANE_CRP` | `.env.local` + Vercel (Preview/Production) | Opcional até divulgação paga; sem número inventado. |
| `NEXT_PUBLIC_APP_URL` | Vercel | Já usado em metadata LP; confirmar URL canónica. |

**Aceite:** build na Vercel sem erros; LP renderiza texto CRP conforme env (ou fallback do código).

---

## 3. Asset — foto Jovane

- [ ] Colocar `public/jovane.png` (retrato ~4:5), **ou** aceitar fallback “Fotografia oficial pendente” até haver ficheiro.

**Aceite:** em `/lp/nr01`, bloco manifesto sem erro 404 de imagem no Network (ou fallback visível).

---

## 4. Git push + deploy Vercel

```bash
git status
git add -A
git commit -m "P022: LP NR-01 enriquecida + migração audit log"
git push origin main
```

Aguardar deploy a concluir (tipicamente 2-6 min).

### Validação HTTP

```bash
curl.exe -sI "https://quantum5g.vercel.app/lp/nr01"
```

**Aceite:** `HTTP/2 200` ou `HTTP/1.1 200` (não `404`).  
**Se 404:** build antigo, branch errada, ou cache CDN — esperar + repetir `curl`; no painel Vercel confirmar deployment do commit certo e “Redeploy” se necessário.

### Smoke manual (navegador, janela anónima)

- [ ] `/lp/nr01` — Hero, countdown, 6 blocos novos, FAQ com 10 itens, rodapé.
- [ ] Âncoras `#planos` e `#captura-diagnostico` a partir do CTA final.
- [ ] **Lead capture:** preencher formulário, consentimento, enviar → redirect esperado (página obrigado ou erro tratado).
- [ ] **Calculadora:** pedido a `/api/lp/calculator` com sucesso.
- [ ] **Mobile:** scroll horizontal inaceitável ausente nos blocos principais.

---

## 5. Lighthouse (opcional mas recomendado)

Rodar localmente ou CI após deploy (Performance / Accessibility).  
**Aceite alvo do pedido original:** mobile performance ≥ 85, accessibility ≥ 95 (ajustar se não atingir).

---

## Troubleshooting

| Sintoma | Verificar |
|---------|-----------|
| 404 em `/lp/nr01` | Deployment do commit com `src/app/lp/nr01/page.tsx`; `curl -I` noutra região ou purge cache. |
| Migration sem linha no audit | Projeto Supabase errado; SQL não executado; ver erros no Editor. |
| Imagem partida | `public/jovane.png` ausente; permissões; `next/image` e path `/jovane.png`. |
| Form falha | `/api/lp/lead`, envs Resend/Supabase, CORS não aplica em same-origin; ver Network + response body. |
| Calculadora falha | `/api/lp/calculator`, payload JSON, logs Vercel. |
| `tsc` falha por pasta `exports/` | `tsconfig.json` deve excluir `"exports"` (já aplicado em `main` em `fd90c04`). |

---

## Pós-P022 (não bloqueia este deploy)

- **P021:** quando existir merge, criar `docs/deploy/P021-pos-deploy.md` no mesmo espírito; extrair secção comum (URLs, curl, Supabase) para `docs/deploy/_common-pos-deploy.md` **só se** houver duplicação real.
- **Checkout “Contratar agora”:** ligar após P021.
- **LGPD:** `/privacidade` + termos antes de captação paga agressiva.
- **ContentLibrary:** ativar ao marcar `available: true` e `href` real em `src/constants/lp-nr01.ts` (`LP_CONTENT_ITEMS`).
