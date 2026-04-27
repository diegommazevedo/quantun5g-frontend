-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 014
-- Substituição lexical: vocabulário RT (termo vetado) → *oficial*
-- Data: 2026-04-26 | Idempotente (reexecutar = no-op nas trocas)
-- NOTA: cadeia de replace() aninhada em uma linha quebrou o parser
-- (parênteses). Aplicamos replace simples em sequência no mesmo BEGIN.
-- ============================================================

BEGIN;

-- --- nr01_laudo_textos.texto_principal (20 passos; ordem: frases → flexões) ---
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'fidedignidade canônica', 'fidedignidade ao instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'textos canônicos', 'textos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Textos canônicos', 'Textos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'laudos canônicos', 'laudos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Laudos canônicos', 'Laudos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'documento canônico', 'documento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'texto canônico', 'texto oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'instrumento canônico', 'instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'laudo canônico', 'laudo oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'versão canônica', 'versão oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'referência canônica', 'referência oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Canônicas', 'Oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Canônica', 'Oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Canônicos', 'Oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'Canônico', 'Oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'canônicas', 'oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'canônica', 'oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'canônicos', 'oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_principal = replace(texto_principal, 'canônico', 'oficial') WHERE texto_principal IS NOT NULL;

-- --- nr01_laudo_textos.texto_recomendacao (mesma sequência) ---
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'fidedignidade canônica', 'fidedignidade ao instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'textos canônicos', 'textos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Textos canônicos', 'Textos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'laudos canônicos', 'laudos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Laudos canônicos', 'Laudos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'documento canônico', 'documento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'texto canônico', 'texto oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'instrumento canônico', 'instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'laudo canônico', 'laudo oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'versão canônica', 'versão oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'referência canônica', 'referência oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Canônicas', 'Oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Canônica', 'Oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Canônicos', 'Oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'Canônico', 'Oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'canônicas', 'oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'canônica', 'oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'canônicos', 'oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_textos SET texto_recomendacao = replace(texto_recomendacao, 'canônico', 'oficial') WHERE texto_recomendacao IS NOT NULL;

-- --- nr01_laudo_macros (idem) ---
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'fidedignidade canônica', 'fidedignidade ao instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'textos canônicos', 'textos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Textos canônicos', 'Textos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'laudos canônicos', 'laudos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Laudos canônicos', 'Laudos oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'documento canônico', 'documento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'texto canônico', 'texto oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'instrumento canônico', 'instrumento oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'laudo canônico', 'laudo oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'versão canônica', 'versão oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'referência canônica', 'referência oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Canônicas', 'Oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Canônica', 'Oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Canônicos', 'Oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'Canônico', 'Oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'canônicas', 'oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'canônica', 'oficial') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'canônicos', 'oficiais') WHERE texto_principal IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_principal = replace(texto_principal, 'canônico', 'oficial') WHERE texto_principal IS NOT NULL;

UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'fidedignidade canônica', 'fidedignidade ao instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'textos canônicos', 'textos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Textos canônicos', 'Textos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'laudos canônicos', 'laudos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Laudos canônicos', 'Laudos oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'documento canônico', 'documento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'texto canônico', 'texto oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'instrumento canônico', 'instrumento oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'laudo canônico', 'laudo oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'versão canônica', 'versão oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'referência canônica', 'referência oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Canônicas', 'Oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Canônica', 'Oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Canônicos', 'Oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'Canônico', 'Oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'canônicas', 'oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'canônica', 'oficial') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'canônicos', 'oficiais') WHERE texto_recomendacao IS NOT NULL;
UPDATE nr01_laudo_macros SET texto_recomendacao = replace(texto_recomendacao, 'canônico', 'oficial') WHERE texto_recomendacao IS NOT NULL;

COMMENT ON TABLE nr01_laudo_textos IS
'Textos oficiais de laudo micro por (dimensão × nível). P014 (26/04/2026): substituição léxico aprovada pelo RT; hashes: docs/audit/laudos_v1.1_hash.txt.';

COMMENT ON TABLE nr01_laudo_macros IS
'Textos oficiais de laudo macro (ISO global) por nível. P014 (26/04/2026): substituição léxico aprovada pelo RT.';

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_014_APPLIED',
  jsonb_build_object(
    'patch', '014',
    'type', 'lexical_substitution',
    'rationale', 'Decisão direta 26/04/2026: banimento léxico aprovado (RT), substituição por *oficial* em código, docs e textos persistidos (P014).',
    'scope', jsonb_build_array(
      'code_typescript_javascript',
      'documentation_markdown',
      'sql_comments_and_migrations',
      'persisted_texts_in_database'
    ),
    'tables_touched', jsonb_build_array('nr01_laudo_textos', 'nr01_laudo_macros'),
    'laudos_v1_1_hash_note', 'Recalcular com scripts/_verify_laudos_v1.1.mjs se conteúdo de laudos no banco mudou.',
    'legacy_pdfs_policy', 'kept_as_historical_documents_pre_p014_hash_boundary',
    'sql_strategy', 'sequential_single_replace_v2',
    'applied_at', now()
  ),
  'consultant'
);

COMMIT;
