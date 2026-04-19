-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 003 (PDF do laudo)
-- Versão: 0.3.0 | Data: 2026-04-19
-- Aplicar APÓS nr01_patch_002.sql.
--
-- Adiciona campos de rastreio do PDF no pacote de evidências.
-- O hash SHA-256 é calculado UMA vez na geração original e fica
-- imutável — defesa contra "este PDF foi adulterado depois". Diego
-- (review P4): determinismo de regeneração não é exigido em auditoria.
-- ============================================================

ALTER TABLE nr01_evidence_pack
  ADD COLUMN IF NOT EXISTS pdf_sha256        text,
  ADD COLUMN IF NOT EXISTS pdf_generated_at  timestamptz,
  ADD COLUMN IF NOT EXISTS pdf_byte_size     int,
  ADD COLUMN IF NOT EXISTS pdf_page_count    int;

COMMENT ON COLUMN nr01_evidence_pack.pdf_sha256 IS
  'SHA-256 do PDF emitido na geração original. Imutável; regenerações futuras NÃO atualizam este campo. Serve como prova de integridade do documento original.';

-- Verificação rápida
SELECT
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'nr01_evidence_pack' AND column_name = 'pdf_sha256')      AS has_pdf_sha256,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'nr01_evidence_pack' AND column_name = 'pdf_generated_at') AS has_pdf_generated_at,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'nr01_evidence_pack' AND column_name = 'pdf_byte_size')   AS has_byte_size,
  EXISTS (SELECT 1 FROM information_schema.columns
          WHERE table_name = 'nr01_evidence_pack' AND column_name = 'pdf_page_count')  AS has_page_count;
