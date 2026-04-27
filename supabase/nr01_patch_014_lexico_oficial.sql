-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 014
-- Substituição lexical: vocabulário RT (termo vetado) → *oficial*
-- Data: 2026-04-26 (decisão do produto; feedback RT)
-- Idempotente: reexecutar aplica REPLACE idempotentes.
-- ============================================================

BEGIN;

-- Substituição em laudos micro (conteúdo possivelmente com herança de redação antiga)
UPDATE nr01_laudo_textos SET texto_principal = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  texto_principal,
  'fidedignidade canônica', 'fidedignidade ao instrumento oficial'),
  'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial'),
  'textos canônicos', 'textos oficiais'),
  'Textos canônicos', 'Textos oficiais'),
  'laudos canônicos', 'laudos oficiais'),
  'Laudos canônicos', 'Laudos oficiais'),
  'documento canônico', 'documento oficial'),
  'texto canônico', 'texto oficial'),
  'instrumento canônico', 'instrumento oficial'),
  'laudo canônico', 'laudo oficial'),
  'versão canônica', 'versão oficial'),
  'referência canônica', 'referência oficial'),
  'Canônicas', 'Oficiais'),
  'Canônica', 'Oficial'),
  'Canônicos', 'Oficiais'),
  'Canônico', 'Oficial'),
  'canônicas', 'oficiais'),
  'canônica', 'oficial'),
  'canônicos', 'oficiais'),
  'canônico', 'oficial')
WHERE texto_principal IS NOT NULL;

UPDATE nr01_laudo_textos SET texto_recomendacao = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  texto_recomendacao,
  'fidedignidade canônica', 'fidedignidade ao instrumento oficial'),
  'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial'),
  'textos canônicos', 'textos oficiais'),
  'Textos canônicos', 'Textos oficiais'),
  'laudos canônicos', 'laudos oficiais'),
  'Laudos canônicos', 'Laudos oficiais'),
  'documento canônico', 'documento oficial'),
  'texto canônico', 'texto oficial'),
  'instrumento canônico', 'instrumento oficial'),
  'laudo canônico', 'laudo oficial'),
  'versão canônica', 'versão oficial'),
  'referência canônica', 'referência oficial'),
  'Canônicas', 'Oficiais'),
  'Canônica', 'Oficial'),
  'Canônicos', 'Oficiais'),
  'Canônico', 'Oficial'),
  'canônicas', 'oficiais'),
  'canônica', 'oficial'),
  'canônicos', 'oficiais'),
  'canônico', 'oficial')
WHERE texto_recomendacao IS NOT NULL;

UPDATE nr01_laudo_macros SET texto_principal = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  texto_principal,
  'fidedignidade canônica', 'fidedignidade ao instrumento oficial'),
  'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial'),
  'textos canônicos', 'textos oficiais'),
  'Textos canônicos', 'Textos oficiais'),
  'laudos canônicos', 'laudos oficiais'),
  'Laudos canônicos', 'Laudos oficiais'),
  'documento canônico', 'documento oficial'),
  'texto canônico', 'texto oficial'),
  'instrumento canônico', 'instrumento oficial'),
  'laudo canônico', 'laudo oficial'),
  'versão canônica', 'versão oficial'),
  'referência canônica', 'referência oficial'),
  'Canônicas', 'Oficiais'),
  'Canônica', 'Oficial'),
  'Canônicos', 'Oficiais'),
  'Canônico', 'Oficial'),
  'canônicas', 'oficiais'),
  'canônica', 'oficial'),
  'canônicos', 'oficiais'),
  'canônico', 'oficial')
WHERE texto_principal IS NOT NULL;

UPDATE nr01_laudo_macros SET texto_recomendacao = replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(replace(
  texto_recomendacao,
  'fidedignidade canônica', 'fidedignidade ao instrumento oficial'),
  'Fidedignidade canônica', 'Fidedignidade ao instrumento oficial'),
  'textos canônicos', 'textos oficiais'),
  'Textos canônicos', 'Textos oficiais'),
  'laudos canônicos', 'laudos oficiais'),
  'Laudos canônicos', 'Laudos oficiais'),
  'documento canônico', 'documento oficial'),
  'texto canônico', 'texto oficial'),
  'instrumento canônico', 'instrumento oficial'),
  'laudo canônico', 'laudo oficial'),
  'versão canônica', 'versão oficial'),
  'referência canônica', 'referência oficial'),
  'Canônicas', 'Oficiais'),
  'Canônica', 'Oficial'),
  'Canônicos', 'Oficiais'),
  'Canônico', 'Oficial'),
  'canônicas', 'oficiais'),
  'canônica', 'oficial'),
  'canônicos', 'oficiais'),
  'canônico', 'oficial')
WHERE texto_recomendacao IS NOT NULL;

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
    'applied_at', now()
  ),
  'consultant'
);

-- Pós-checagem de resíduo: rodar grep/SQL ad-hoc se necessário (arquivo
-- evita literais proibidos no pós-verify para não poluir buscas no repositório).

COMMIT;
