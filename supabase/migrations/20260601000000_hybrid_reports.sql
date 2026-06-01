-- QUANTUM5G — Devolutiva híbrida Pentagrama × NR-01 (determinística, sem LLM)
-- Checkpoint: HYBRID v1.0.0 — 2026-06-01

CREATE TABLE IF NOT EXISTS hybrid_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  diagnostic_id     uuid NOT NULL REFERENCES diagnostics(id) ON DELETE CASCADE,
  crosswalk_version text NOT NULL DEFAULT '1.0.0',
  payload           jsonb NOT NULL,
  payload_sha256    text NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  generated_by      uuid REFERENCES profiles(id),
  UNIQUE (assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_hybrid_reports_diagnostic ON hybrid_reports(diagnostic_id);

COMMENT ON TABLE hybrid_reports IS
  'Devolutiva integrada NR-01 + Pentagrama. Motor TypeScript puro; payload imutável por avaliação (upsert).';

ALTER TABLE hybrid_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hybrid_report_select" ON hybrid_reports;
DROP POLICY IF EXISTS "hybrid_report_write" ON hybrid_reports;

CREATE POLICY "hybrid_report_select" ON hybrid_reports
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "hybrid_report_write" ON hybrid_reports
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));
