-- Patch 007 — registro de aplicação no audit log NR-01.

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_007_APPLIED',
  jsonb_build_object(
    'patch', '007',
    'changes', jsonb_build_array(
      'instrument_v1_1_canonical_inserted',
      'instrument_v1_0_deactivated',
      'methodology_v1_1_published',
      'pulse_view_rebuilt_likert_scale',
      'column_defaults_bumped_to_v1_1'
    ),
    'instrument_v1_1_hash', 'd0af4ded3cee7f8427463a382ece3b844b06266b238f5a02789f3a2ee2f5229d',
    'n_questions_v1_1', 80,
    'n_questions_v1_0_deactivated', 80,
    'reverse_scored_v1_1', 0,
    'extraction_method', 'scripts/_extract_canonical_v1.1.mjs',
    'verification_method', 'scripts/_verify_canonical_v1.1.mjs',
    'visual_inspection_samples_passed', 5,
    'view_renamed_likert', 'nr01_pulse_weekly_scores rebuilt to mean Likert (1-5)',
    'applied_at', now()
  ),
  'consultant'
)
RETURNING id, event_type, created_at;
