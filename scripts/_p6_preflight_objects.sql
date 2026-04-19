SELECT 'nr01_dimensions'             AS objeto, COUNT(*)::text AS valor, '10' AS esperado FROM nr01_dimensions
UNION ALL
SELECT 'nr01_questions (v1.0 ativas)', COUNT(*)::text, '80'
  FROM nr01_questions WHERE instrument_version='v1.0' AND is_active = true
UNION ALL
SELECT 'nr01_intervention_library',     COUNT(*)::text, '30'
  FROM nr01_intervention_library
UNION ALL
SELECT 'tbl nr01_collection_throttle',  CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='nr01_collection_throttle') THEN 'true' ELSE 'false' END, 'true'
UNION ALL
SELECT 'tbl nr01_pulse_config',         CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='nr01_pulse_config') THEN 'true' ELSE 'false' END, 'true'
UNION ALL
SELECT 'tbl nr01_public_status_tokens', CASE WHEN EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='nr01_public_status_tokens') THEN 'true' ELSE 'false' END, 'true'
UNION ALL
SELECT 'col evidence_pack.pdf_sha256',  CASE WHEN EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nr01_evidence_pack' AND column_name='pdf_sha256') THEN 'present' ELSE 'missing' END, 'present'
UNION ALL
SELECT 'view nr01_pulse_weekly_scores', CASE WHEN EXISTS (SELECT 1 FROM information_schema.views WHERE table_name='nr01_pulse_weekly_scores') THEN 'present' ELSE 'missing' END, 'present'
UNION ALL
SELECT 'fn get_my_role',                CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='get_my_role') THEN 'present' ELSE 'missing' END, 'present'
UNION ALL
SELECT 'fn nr01_owns_assessment',       CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='nr01_owns_assessment') THEN 'present' ELSE 'missing' END, 'present'
UNION ALL
SELECT 'fn audit_log_immutable',        CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='nr01_audit_log_immutable') THEN 'present' ELSE 'missing' END, 'present'
UNION ALL
SELECT 'fn version_guard',              CASE WHEN EXISTS (SELECT 1 FROM pg_proc WHERE proname='nr01_assessment_version_guard') THEN 'present' ELSE 'missing' END, 'present';
