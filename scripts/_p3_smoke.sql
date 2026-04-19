-- ============================================================
-- P3 — Smoke test mínimo das tabelas de pulsos
-- Verifica existência das 4 tabelas + view, sem mexer em dados.
-- ============================================================

SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_config')      AS has_config,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_dispatches')  AS has_dispatches,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_invites')     AS has_invites,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_pulse_responses')   AS has_responses,
  EXISTS (SELECT 1 FROM information_schema.views  WHERE table_name = 'nr01_pulse_weekly_scores') AS has_view;

SELECT
  COUNT(*) FILTER (WHERE relname IN ('nr01_pulse_config','nr01_pulse_dispatches','nr01_pulse_invites','nr01_pulse_responses')
                   AND relrowsecurity = true) AS rls_ok_count
FROM pg_class
WHERE relkind = 'r' AND relname LIKE 'nr01_pulse_%';

SELECT
  policyname, tablename
FROM pg_policies
WHERE tablename LIKE 'nr01_pulse_%'
ORDER BY tablename, policyname;
