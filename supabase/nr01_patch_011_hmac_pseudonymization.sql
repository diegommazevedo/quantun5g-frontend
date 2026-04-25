-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 011 (HMAC pseudonymization)
-- Versão: 0.11.0 | Data: 2026-04-25
-- Aplicar APÓS nr01_patch_010.
--
-- Documenta no banco a transição da pseudonimização SHA-256+pepper
-- (P004→P010, com pepper hardcoded no código) para HMAC-SHA256 com
-- chave secreta em variável de ambiente Vercel (P011+).
--
-- Não migra hashes legados (BioBloco já foi excluída; o restante eram
-- testes). Hashes anteriores ao P011 ficam no banco como bytes hex
-- não-correlacionáveis ao identificador original.
--
-- Idempotente.
-- ============================================================

BEGIN;

COMMENT ON COLUMN nr01_audit_log.ip_hash IS
  'Hash pseudonimizado do IP de origem. A partir de 2026-04-25 (P011), '
  'gerado via HMAC-SHA256 com chave NR01_IP_HASH_SALT (env Vercel, Sensitive). '
  'Hashes anteriores a esta data foram gerados com SHA-256 + pepper hardcoded '
  'e devem ser tratados como legado não-correlacionável (Art. 13 LGPD).';

COMMIT;
