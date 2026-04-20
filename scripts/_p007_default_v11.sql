-- Patch 007 alinhamento: default da coluna instrument_version → v1.1
ALTER TABLE nr01_assessments    ALTER COLUMN instrument_version SET DEFAULT 'v1.1';
ALTER TABLE nr01_questions      ALTER COLUMN instrument_version SET DEFAULT 'v1.1';
ALTER TABLE nr01_responses      ALTER COLUMN instrument_version SET DEFAULT 'v1.1';
ALTER TABLE nr01_evidence_pack  ALTER COLUMN methodology_version SET DEFAULT 'v1.1';

SELECT
  table_name, column_name, column_default
FROM information_schema.columns
WHERE column_name IN ('instrument_version', 'methodology_version')
  AND table_name LIKE 'nr01_%'
ORDER BY table_name;
