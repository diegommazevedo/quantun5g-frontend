-- ============================================================
-- QUANTUM5G — NR-01 | Backfill PATCH_013 no nr01_audit_log
-- Alinhado a: supabase/nr01_schema.sql (tabela nr01_audit_log)
--
-- Motivo: o merge P013 (pesos uniformes) não deixou linha PATCH_013_APPLIED
--         em produção; a sequência no banco salta 012 → 014.
-- Idempotente: não insere se já existir event_type = PATCH_013_APPLIED.
--
-- Colunas (schema):
--   id            bigserial PK
--   assessment_id uuid NULL  — evento de patch global → NULL
--   actor_id      uuid NULL — backfill processual → NULL
--   actor_role    text      — alinhar a outros PATCH_*_APPLIED ('consultant')
--   event_type    text NOT NULL
--   payload       jsonb NOT NULL DEFAULT '{}'
--   ip_hash       text NULL
--   user_agent    text NULL
--   created_at    timestamptz NOT NULL DEFAULT now()
--
-- Executar no SQL Editor (produção) com role que consiga INSERT, ou:
--   node scripts/run_sql.mjs supabase/nr01_backfill_patch_013_audit_log.sql
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (
  assessment_id,
  actor_id,
  actor_role,
  event_type,
  payload,
  ip_hash,
  user_agent,
  created_at
)
SELECT
  NULL,
  NULL,
  'consultant',
  'PATCH_013_APPLIED',
  jsonb_build_object(
    'patch', '013',
    'type', 'methodological_correction',
    'changes', jsonb_build_array(
      'uniform_weights_1.00_all_dimensions',
      'removed_assedio_violencia_weight_1.30',
      'scoring_ts_NR01_ISO_WEIGHT_PER_DIMENSION_1.0',
      'methodology_METHODOLOGY_TEXT_V1_1_uniform_section'
    ),
    'rationale', 'Correção metodológica alinhada ao RT (Jovane Borlini da Silva, CRP) e ao instrumento NR01_GRO: ISO com peso uniforme 1,00 por dimensão; a criticidade de assédio e violência permanece nos textos oficiais do laudo, não no peso da fórmula do ISO (P006 → P013).',
    'previous_state', 'P006: dimensão assédio/violência com peso 1,30 no cálculo do ISO; demais dimensões 1,00',
    'new_state', 'P013: todas as dez dimensões com peso 1,00 (uniforme) em computeIso / scoring.ts',
    'note', 'Backfill: o INSERT de trilha em nr01_audit_log faltou na aplicação/migration P013; registado após auditoria (não altera regra de negócio).',
    'backfill', true,
    'backfill_registered_at', to_jsonb(now())
  ),
  NULL,
  NULL,
  -- Ajusta se quiseres alinhar à data/hora real do merge P013 (git: após 012, antes de 014):
  '2026-04-26T12:00:00+00'::timestamptz
WHERE NOT EXISTS (
  SELECT 1
  FROM nr01_audit_log
  WHERE event_type = 'PATCH_013_APPLIED'
);

COMMIT;
