-- Patch 006 — registro de aplicação no audit log NR-01.

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_006_APPLIED',
  jsonb_build_object(
    'patch', '006',
    'changes', jsonb_build_array(
      'weights_active_assedio_1_30',
      'weights_uniform_1_00_others',
      'actions_processarResultados_passes_dimensionWeights',
      'audit_RESULTS_PROCESSED_enriched_with_weights',
      'biobloco_deleted'
    ),
    'weights_after', jsonb_build_object(
      'assedio_violencia', 1.30,
      'others', 1.00
    ),
    'biobloco_id', '2bb338a5-4f57-4995-abe2-a03302fcc625',
    'biobloco_snapshot_pre_deletion', jsonb_build_object(
      'n_responses', 24,
      'n_answers', 1920,
      'n_dim_scores', 10,
      'n_audit_events_pre_deletion', 12
    ),
    'n_assessments_recomputed', 0,
    'recompute_skipped_reason', 'no concluded assessments other than BioBloco; BioBloco was deleted instead',
    'finding_audit_orphans', jsonb_build_object(
      'description', 'FK nr01_audit_log.assessment_id eh ON DELETE SET NULL — eventos historicos da BioBloco existem no banco mas perderam referencia. Snapshot preserva contagem (12 eventos), mas vinculo individual perdido.',
      'severity', 'medium',
      'recommended_fix_future_patch', 'mudar FK para ON DELETE CASCADE OU copiar assessment_id no payload antes de SET NULL (trigger BEFORE DELETE)'
    ),
    'todo_views', 'nr01_pulse_weekly_scores ainda em escala 0-100; alinhar no patch 007 junto com instrumento v1.1',
    'applied_at', now()
  ),
  'consultant'
)
RETURNING id, event_type, created_at;
