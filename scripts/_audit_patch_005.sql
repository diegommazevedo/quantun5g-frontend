-- Patch 005 — registro de aplicação no audit log NR-01.
-- Roda como service-equivalente (postgres direto) → trigger
-- nr01_audit_log_immutable permite (current_user = 'postgres').

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_005_APPLIED',
  jsonb_build_object(
    'patch', '005',
    'changes', jsonb_build_array(
      'likert_thresholds_to_likert_scale_1_5',
      'likert_labels_canonical',
      'bloco_1_tipo_vinculo_canonical',
      'bloco_1_tempo_empresa_canonical',
      'perguntas_abertas_4_canonical',
      'methodology_iso_declaration_corrected',
      'scoring_native_likert_no_normalize',
      'bridge_pentagrama_likert_to_pent_conversion',
      'economic_severity_thresholds_likert'
    ),
    'doc_source', 'NR01_GRO.docx (docs/audit/NR01_GRO.md)',
    'instrument_version_affected', 'v1.0',
    'remaining_for_v1_1', jsonb_build_array(
      'rewrite_80_questions_canonical',
      'reverse_scored_all_true',
      'macro_micro_laudos_canonical_50_5',
      'pdf_robust_layout_12_sections_doc'
    ),
    'todo_views', 'nr01_pulse_weekly_scores still in 0-100 scale; align in patch 007 alongside instrument v1.1'
  ),
  'consultant'
)
RETURNING id, event_type, created_at;
