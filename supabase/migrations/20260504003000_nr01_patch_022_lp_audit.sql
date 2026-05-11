-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch P022 — LP / landing enrichment
-- Registo append-only em nr01_audit_log (trilha de versão)
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_022_LP_NR01_ENRICHMENT',
  jsonb_build_object(
    'patch', '022',
    'type', 'lp_nr01_landing_enrichment',
    'scope', jsonb_build_array(
      'src/app/lp/nr01/page.tsx',
      'src/app/lp/nr01/layout.tsx',
      'src/app/lp/nr01/calculadora/page.tsx',
      'src/app/lp/nr01/obrigado/page.tsx',
      'src/app/api/lp/calculator/route.ts',
      'src/app/api/lp/lead/route.ts',
      'src/components/lp/RegulatoryContext.tsx',
      'src/components/lp/JovaneManifesto.tsx',
      'src/components/lp/Methodology5Pillars.tsx',
      'src/components/lp/PackageTrino.tsx',
      'src/components/lp/ContentLibrary.tsx',
      'src/components/lp/FinalCTA.tsx',
      'src/components/lp/Hero.tsx',
      'src/components/lp/PricingTiers.tsx',
      'src/components/lp/LeadCaptureForm.tsx',
      'src/components/lp/Calculator.tsx',
      'src/components/lp/FAQ.tsx',
      'src/components/lp/RegulatoryCountdown.tsx',
      'src/constants/lp-nr01.ts'
    ),
    'notes', jsonb_build_array(
      'faq_expanded_to_10',
      'content_library_gated_until_items_available',
      'public_jovane_png_optional_fallback'
    ),
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log WHERE event_type = 'PATCH_022_LP_NR01_ENRICHMENT'
);

COMMIT;
