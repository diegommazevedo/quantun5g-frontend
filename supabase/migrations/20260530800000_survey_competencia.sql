-- Competência padronizada (Q{n} - MM/YYYY) — Pentagrama + NR-01

ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_seq integer;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_month smallint;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_year smallint;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_label text;

ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_seq integer;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_month smallint;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_year smallint;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_label text;

COMMENT ON COLUMN diagnostics.competencia_label IS 'Ex.: Q1 - 05/2026 (rodada sequencial por empresa)';
COMMENT ON COLUMN nr01_assessments.competencia_label IS 'Ex.: Q1 - 05/2026 (rodada sequencial por empresa)';
