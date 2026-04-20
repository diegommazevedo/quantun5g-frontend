-- ============================================================
-- QUANTUM5G — Patch 007b: View de pulses em escala Likert
-- Versão: 0.7.0 | Data: 2026-04-19
--
-- Patch 005 migrou o sistema de scores 0-100 para média Likert 1-5.
-- A view nr01_pulse_weekly_scores ficou para trás (TODO no patch 005).
-- Este patch realinha.
--
-- Mudanças:
-- - DROP da view antiga (escala 0-100, fórmula com normalização)
-- - CREATE OR REPLACE com mean Likert puro (sem normalização)
-- - Como v1.1 não tem questões reverse_scored, removemos a inversão
-- - k-anonymity ≥ 3 mantido (amostras semanais menores que coleta principal)
-- ============================================================

DROP VIEW IF EXISTS nr01_pulse_weekly_scores CASCADE;

CREATE OR REPLACE VIEW nr01_pulse_weekly_scores AS
SELECT
  pd.assessment_id,
  pd.week_number,
  pd.dispatched_at::date AS week_date,
  q.dimension_code,
  -- Após patch 005/007: mean Likert puro (sem normalização 0-100,
  -- sem inversão — questões v1.1 são todas em sentido negativo).
  ROUND(AVG(pr.value)::numeric, 2)  AS score_pct,  -- nome mantido por compat de tipos TS
  COUNT(DISTINCT pr.anon_id)        AS n_respondents,
  COUNT(*)                          AS n_answers
FROM nr01_pulse_responses pr
JOIN nr01_pulse_dispatches pd ON pd.id = pr.dispatch_id
JOIN nr01_questions q         ON q.id = pr.question_id
WHERE q.is_active = true
GROUP BY pd.assessment_id, pd.week_number, pd.dispatched_at, q.dimension_code
HAVING COUNT(DISTINCT pr.anon_id) >= 3;

COMMENT ON VIEW nr01_pulse_weekly_scores IS
  'Score 1-5 (mean Likert) por semana × dimensão. k-anonymist ≥ 3. Patch 007b: realinhado escala canônica.';

-- Verificação
SELECT
  EXISTS (SELECT 1 FROM information_schema.views WHERE table_name = 'nr01_pulse_weekly_scores') AS view_exists;
