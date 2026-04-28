-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 016
-- Harmonização visual NR-01 (paleta, labels humanos e PT-BR)
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_016_APPLIED',
  jsonb_build_object(
    'patch', '016',
    'type', 'visual_harmonization_nr01',
    'changes', jsonb_build_array(
      'accent_color_orange_to_navy_blue',
      'status_badges_regulatory_palette_green_amber_red_gray',
      'dimension_labels_human_from_nr01_gro_v1_1',
      'pt_br_numeric_formatting_on_key_screens'
    ),
    'scope', jsonb_build_array(
      'src/types/nr01.ts',
      'src/app/(nr01)/layout.tsx',
      'src/app/(nr01)/nr01/dashboard/page.tsx',
      'src/app/(nr01)/nr01/avaliacao/nova/page.tsx',
      'src/app/(nr01)/nr01/avaliacao/[id]/page.tsx',
      'src/app/(nr01)/nr01/avaliacao/[id]/plano/page.tsx',
      'src/app/(nr01)/nr01/avaliacao/[id]/monitoramento/page.tsx',
      'src/app/(nr01)/nr01/avaliacao/[id]/economico/page.tsx'
    ),
    'constraints', jsonb_build_array(
      'no_pentagrama_layout_changes',
      'no_mobile_table_refactor_in_p016',
      'no_typography_or_icon_overhaul'
    ),
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log WHERE event_type = 'PATCH_016_APPLIED'
);

COMMIT;
