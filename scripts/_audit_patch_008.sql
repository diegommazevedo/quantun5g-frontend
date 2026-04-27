-- Patch 008 — registro de aplicação no audit log NR-01.

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_008_APPLIED',
  jsonb_build_object(
    'patch', '008',
    'changes', jsonb_build_array(
      'schema_nr01_laudo_textos_created',
      'schema_nr01_laudo_macros_created',
      'evidence_pack_laudos_pack_sha256_added',
      '50_laudos_micro_v1_1_seeded',
      '5_laudos_macro_v1_1_seeded',
      'evidence_ts_hashLaudosOficiais_added',
      'pdf_data_loads_laudos_maps',
      'pdf_template_renders_official_laudos',
      'gerarPacote_populates_laudos_pack_sha256',
      'methodology_v1_1_references_laudos_hash'
    ),
    'laudos_pack_hash', '424c9b15296acb64a6947691ceb0d53f4dfa61e434beb94ea98c203dd32b25a1',
    'n_laudos_micro', 50,
    'n_laudos_macro', 5,
    'n_dimensions_covered', 10,
    'extraction_method', 'scripts/_extract_laudos_v1.1.mjs',
    'verification_method', 'scripts/_verify_laudos_v1.1.mjs',
    'visual_inspection_samples_passed', 3,
    'rls_select_authenticated_only', true,
    'mutation_only_via_service_role', true,
    'applied_at', now()
  ),
  'consultant'
)
RETURNING id, event_type, created_at;
