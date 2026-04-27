-- Patch 009 — registro de aplicação no audit log NR-01.
-- Reestrutura PDF do laudo técnico para conter EXATAMENTE as 12 seções
-- oficiais do NR01_GRO.docx (seção "MODELO DE LAUDO ROBUSTO"),
-- removendo do PDF os creeps regulatórios.

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
VALUES (
  'PATCH_009_APPLIED',
  jsonb_build_object(
    'patch', '009',
    'changes', jsonb_build_array(
      'pdf_template_rewritten_12_official_sections',
      'pdf_section_1_identificacao',
      'pdf_section_2_finalidade_official_text',
      'pdf_section_3_fundamentacao_official_text',
      'pdf_section_4_metodologia_official_plus_v1_1',
      'pdf_section_5_populacao_avaliada',
      'pdf_section_6_criterios_classificacao_5_faixas_likert',
      'pdf_section_7_resultados_por_dimensao_with_micro_official',
      'pdf_section_8_analise_global_with_macro_official',
      'pdf_section_9_identificacao_riscos_psicossociais',
      'pdf_section_10_recomendacoes_plan_or_official',
      'pdf_section_11_conclusao_adapted_iso_level',
      'pdf_section_12_responsabilidade_tecnica_signature',
      'pdf_apendice_likert_scale_plus_4_hashes',
      'pdf_creep_alertas_sistemicos_removed',
      'pdf_creep_projecao_economica_removed',
      'pdf_creep_monitoramento_continuo_removed',
      'pdf_creep_bridge_pentagrama_removed',
      'css_rewritten_technical_document_format',
      'fmtMean_uses_pt_br_decimal_comma',
      'mean_likert_preferred_over_score_pct',
      'action_plan_status_official_lowercase'
    ),
    'official_source', 'docs/audit/NR01_GRO.md (linhas 621-805)',
    'creeps_removed_from_pdf', jsonb_build_array(
      'alertas_sistemicos',
      'projecao_economica',
      'monitoramento_continuo',
      'bridge_pentagrama'
    ),
    'creeps_kept_on_internal_screens', true,
    'sections_count_total', 12,
    'sections_required_present', true,
    'apendice_present', true,
    'verification_method', 'scripts/_p009_acceptance.mjs',
    'visual_inspection_required', true,
    'applied_at', now()
  ),
  'consultant'
)
RETURNING id, event_type, created_at;
