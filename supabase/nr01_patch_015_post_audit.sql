-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 015 (pós-auditoria)
-- Cosmético pdf-template + documentação de arquitetura alinhada P010/P013/P014
-- Idempotente: não insere se PATCH_015_APPLIED já existir.
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_015_APPLIED',
  jsonb_build_object(
    'patch', '015',
    'type', 'post_audit_doc_and_comment',
    'changes', jsonb_build_array(
      'pdf_template_comment_line_95_canonico_to_oficial',
      'docs_nr01_modulo_arquitetura_post_p010_p013_p014',
      'docs_nr01_manual_operacao_table_5_2_bridge_ref_removed'
    ),
    'rationale', 'Fecho pós-auditoria 2026-04: alinhar comentário de código, documento de arquitetura e tabela 5.2 do runbook ao estado pós-P010 (sem bridge), P013 (pesos uniformes) e P014 (léxico oficial).',
    'files_touched', jsonb_build_array(
      'src/lib/nr01/pdf-template.ts',
      'docs/nr01_modulo_arquitetura.md',
      'docs/nr01_manual_operacao.md'
    ),
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log WHERE event_type = 'PATCH_015_APPLIED'
);

COMMIT;
