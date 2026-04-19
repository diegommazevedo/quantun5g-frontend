P5 feito.

Tela de status público no ar. Patch 004 aplicado (1 tabela + 6 policies). Duas novas rotas: /nr01/status/[token] (público, sem auth) e /api/nr01/status/[token]/pdf (PDF via token). 19 rotas total. tsc + build webpack passaram.

O que entregou:

Schema patch_004:
- nr01_public_status_tokens: id, assessment_id FK, token (64 chars hex / 256 bits), created_by, created_at, revoked_at (soft delete), accessed_count, last_accessed_at.
- 6 policies RLS: SELECT owner + SELECT anon (revoked_at IS NULL) + INSERT owner + UPDATE anon (incrementa counter) + UPDATE owner + DELETE admin.
- Token é o segredo (32 bytes de entropia); RLS anon permite SELECT só de tokens ativos, mas exige token correto na query.

lib/nr01/status.ts (computePublicStatus):
- Função pura: LaudoData → { items[5], next_action, next_action_due_date, has_pdf_available }.
- 5 itens com cor verde/amarelo/vermelho/cinza:
  1. Avaliação completa: verde se status=CONCLUIDO e <1 ano; vermelho vencido.
  2. Plano aprovado: verde se status in (aprovado/em_execucao/concluido); amarelo rascunho; vermelho não criado.
  3. Micro-pulsos: verde último <7d; amarelo 7-14d; vermelho >14d ou desativado.
  4. Revisão 90d: verde futuro; amarelo <14d; vermelho atrasado; cinza se plano não aprovado.
  5. Reavaliação anual: verde <10 meses; amarelo 10-12; vermelho >12 (vencido).
- Frase "próxima ação obrigatória" calculada por menor pending_priority. Se tudo verde, aponta próxima atividade programada (revisão ou reavaliação).

UI consultor (seção nova em /avaliacao/[id]):
- "Link público para o cliente" só aparece com status=CONCLUIDO.
- Sem link ativo: botão "Gerar link público para o cliente".
- Com link: URL completa em código quebrável + botão "Copiar link" (componente client com clipboard API + fallback execCommand) + counter "Visualizado N vez(es) · último acesso ..." + botão "Revogar" + botão "Revogar e gerar novo" + link "Abrir como cliente (nova aba)".

Server actions (status-publico/actions.ts):
- criarTokenStatusPublico: gera 32 bytes hex via crypto.randomBytes, opcionalmente revoga outros tokens ativos antes (revoke_others=true), insere, audita PUBLIC_STATUS_TOKEN_CREATED.
- revogarTokenStatusPublico: UPDATE revoked_at = now() onde id e assessment_id batem, audita PUBLIC_STATUS_TOKEN_REVOKED.

UI pública /nr01/status/[token]:
- Sem auth (rota dentro de (questionario)).
- Token inválido/revogado: mensagem neutra "Link inválido ou expirado. Contate seu responsável técnico."
- Header sóbrio em serifa: nome da empresa grande, "Status de conformidade NR-01 / GRO" como subtítulo uppercase letterspacing.
- Bloco "FOCO AGORA" com border-left preto: frase de próxima ação em serifa + prazo de referência se houver.
- Lista dos 5 itens com badge colorido (verde/amarelo/vermelho/cinza) + ícone bullet + label + caption descrevendo estado real.
- Seção "Documentação técnica NR-01": link para PDF se evidence_pack.pdf_sha256 existe; senão "aguardando emissão do laudo técnico".
- Footer 100% discreto: "Portal mantido pela equipe técnica NR-01 da empresa · Sistema por Quantum 5G".
- Identidade do CLIENTE, não do produto. Quantum 5G só no rodapé como co-assinatura.

Rota auxiliar Server Action registerAccess:
- Best-effort: try/catch silencia falhas (não bloqueia render).
- Filtro de bot via regex no User-Agent (bot|crawl|spider|fetch|curl|wget).
- Incrementa accessed_count + last_accessed_at + audit log PUBLIC_STATUS_ACCESSED com ip_hash salgado por-avaliação e user_agent.

API pública /api/nr01/status/[token]/pdf (GET):
- Valida token ativo.
- Bloqueia se evidence_pack.pdf_sha256 IS NULL ("aguardando emissão") — cliente não baixa documento incompleto.
- Reusa launchBrowser + buildLaudoHtml + setContent → page.pdf, mesma stack do P4.
- REGENERA o PDF a cada request (Diego: nota explícita — quando Supabase Storage entrar, passa a servir o original armazenado; por hora regen com documento equivalente).
- Header X-PDF-Original-SHA256 expõe o hash imutável original para verificação.
- Audit PUBLIC_STATUS_PDF_DOWNLOADED com regen_sha256 + original_sha256 + token_id.

Eventos de auditoria novos:
- PUBLIC_STATUS_TOKEN_CREATED (revoke_others)
- PUBLIC_STATUS_TOKEN_REVOKED (token_id)
- PUBLIC_STATUS_ACCESSED (token_id; só se não-bot)
- PUBLIC_STATUS_PDF_DOWNLOADED (token_id, regen_sha256, original_sha256)

O que NÃO entrou (conforme contrato):
- Dashboard completo (semáforo, não painel)
- Múltiplos PDFs (só o principal)
- Login do cliente
- Mensagens entre cliente e consultor
- Customização visual por cliente
- Notificações automáticas

Decisões aplicadas (todas do Diego):
1. Token público sem login (256 bits de entropia).
2. Cinco itens, só cinco.
3. Uma frase de "próxima ação obrigatória" calculada pela pendência mais urgente.
4. Acesso ao PDF discreto no rodapé.
5. Identidade do cliente, Quantum 5G só co-assinando.
6. Estados vivos calculados em tempo real.

Ressalvas técnicas para próximo deploy/runbook (P7):
- Patch 004 já está em prod (mesmo banco); só falta o deploy do código.
- Variável NEXT_PUBLIC_APP_URL precisa estar em prod para o link público mostrar URL absoluta correta no clipboard. Em dev sem ela, mostra URL relativa.
- Filter de bot é simples (regex User-Agent); em escala maior pode entrar fingerprinting + Vercel Edge Config para deny lists.

Tempo total P5: ~1h20 (dentro do alvo de 1h30).

Aguardo "segue P6" para smoke test end-to-end de todo o sistema.
