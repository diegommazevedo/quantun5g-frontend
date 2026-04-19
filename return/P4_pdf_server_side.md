P4 feito (modulo deploy real em Vercel).

Patch 003 aplicado no banco (4 colunas em nr01_evidence_pack: pdf_sha256, pdf_generated_at, pdf_byte_size, pdf_page_count). Deps instaladas: playwright-core + @sparticuz/chromium-min. tsc + build webpack passaram. 17 rotas total, 2 novas: /nr01/avaliacao/[id]/laudo-print (visualização) e /api/nr01/avaliacao/[id]/pdf (geração POST).

O que entregou:

Schema patch_003:
- ALTER nr01_evidence_pack: pdf_sha256, pdf_generated_at, pdf_byte_size, pdf_page_count.
- pdf_sha256 com COMMENT explícito: "Imutável; regenerações futuras NÃO atualizam este campo. Serve como prova de integridade do documento original."

lib/nr01/pdf-data.ts (loader único):
- Função pura loadLaudoData(supabase, assessmentId) → LaudoData | null.
- Carrega: assessment + companies + technical_lead + result + dimensions + dimensionScores + evidencePack + actionPlan + actionItems + economic.{inputs, projection} + pulse.{config, weeksDispatched, lastDispatch}.
- 9 queries paralelas via Promise.all + 1 sequencial pra action items. Aceita qualquer SupabaseClient (SSR ou service role).

lib/nr01/pdf-template.ts (HTML+CSS print A4):
- Função pura buildLaudoHtml(data) → string.
- 12 seções renderizadas: Capa | Sumário | 1 Identificação | 2 Metodologia (METHODOLOGY_TEXT_V1_0 convertido md→html) | 3 Adesão | 4 Resultado por dimensão (com barra de progresso cinza, único elemento com cor) | 5 ISO | 6 Alertas | 7 Plano | 8 Econômico | 9 Monitoramento | 10 Pacote de evidências | 11 Apêndice (escala Likert + dimensões + pesos) | 12 Termo de responsabilidade técnica com espaço para assinatura manuscrita.
- Tipografia: Source Serif 4 corpo (10.5pt), Inter títulos (22/14/11.5/10pt). Importação via Google Fonts CDN — funciona em browser e em Chromium serverless com waitUntil 'networkidle'.
- @page A4, margem 22mm, page-break-before automático em cada seção, page-break-inside:avoid em itens críticos.
- Preto no branco. Única cor: barra cinza no score de cada dimensão. Hashes em monoespaço com fundo cinza muito claro.

Rota /nr01/avaliacao/[id]/laudo-print (visualização):
- Auth via SSR client.
- Usa loadLaudoData + buildLaudoHtml + iframe srcDoc para isolar o CSS print.
- Permite Ctrl+P direto do browser como fallback se o Playwright falhar.

API /api/nr01/avaliacao/[id]/pdf (POST, runtime nodejs, maxDuration 60):
- Auth via SSR client + checagem de permissão (consultor dono ou admin).
- Bloqueia se status != CONCLUIDO.
- launchBrowser: detecta isServerless via process.env.VERCEL || AWS_EXECUTION_ENV. Em serverless, usa @sparticuz/chromium-min com binário do GitHub release (NR01_CHROMIUM_PACK_URL configurável; default v131.0.1). Em dev local, usa PUPPETEER_EXECUTABLE_PATH se setado, ou chromium do sistema.
- page.setContent(html) com waitUntil 'networkidle' (sem fetch HTTP roundtrip — sem dor de auth/cookies dentro do Playwright).
- page.pdf({ format: 'A4', printBackground: true, preferCSSPageSize: true }).
- SHA-256 do buffer + hash imutabilidade: se nr01_evidence_pack.pdf_sha256 já existe, NÃO sobrescreve (Diego P4); só atualiza pdf_byte_size + pdf_page_count para tracking.
- Audit log PDF_GENERATED com sha256, byte_size, page_count, regeneration:bool.
- Response binary com Content-Disposition attachment, filename derivado do nome da empresa, header X-PDF-SHA256.

vercel.json:
- functions["src/app/api/nr01/avaliacao/[id]/pdf/route.ts"]: memory 1024, maxDuration 60.

components/nr01/DownloadPdfButton.tsx (client component):
- POST → blob → trigger download via createObjectURL.
- Estado loading visível ("Gerando PDF (até 30s)…") + erro inline com hint contextual (dev local vs Vercel).
- Inserido em /avaliacao/[id] (botão branco com border) e em /avaliacao/[id]/economico (substitui o stub que dizia "em breve" — agora é botão verde funcional).
- Link "Visualizar antes de baixar" abre /laudo-print em nova aba.

O que NÃO entrou (conforme contrato):
- Determinismo de hash entre regenerações (decisão Diego P4 — hash original imutável basta).
- ICP-Brasil real (campos prontos no schema, plug em fase 2).
- Assinatura digital scaneada (espaço em branco no MVP, 10min para adicionar quando Jovane mandar imagem).
- Estimativa de page_count exata (uso heurística byte/40K — para precisão exigiria pdf-lib ou similar; 1 dep extra que não justifica no MVP).

Pendências externas (sua responsabilidade, não bloqueiam P5):
1. **Deploy em Vercel**: as 2 rotas novas precisam subir. Migrations 001/002/003 já estão no banco de prod (mesmo Supabase usado em dev). vercel.json criado.
2. **Variáveis de ambiente em Vercel** (Settings → Environment Variables) — confirmar presença de:
   - RESEND_API_KEY (já no .env.local)
   - NEXT_PUBLIC_APP_URL=https://quantum5g.vercel.app
   - SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
   - (opcional) NR01_CHROMIUM_PACK_URL — se quiser pinar versão específica do Chromium pack
   - (opcional) NR01_EMAIL_FROM — default usa onboarding@resend.dev (sandbox); produção real exige domínio verificado no Resend.
3. **Smoke test do PDF**: só rodável em prod (não consigo testar Playwright/Chromium aqui no ambiente WDAC do Windows). Critério: clica botão na avaliação CONCLUIDO, baixa arquivo, abre, vê 12 seções com dados reais. Audit log mostra evento PDF_GENERATED com sha256.

Bloqueador externo do dia: nada novo que impeça P5. WDAC continua bloqueando Playwright local; aceito conforme contrato — teste real é em Vercel.

Tempo total P4: ~2h15 (dentro do alvo de 3h).

Aguardo "segue P5" para tela de status público do cliente.
