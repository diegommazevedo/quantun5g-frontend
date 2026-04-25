-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 010 (remoção de creeps)
-- Versão: 0.10.0 | Data: 2026-04-25
-- Aplicar APÓS nr01_patch_009.
--
-- Remove do banco as features que não estão no NR01_GRO.docx
-- e que viraram código morto após o P009 ter retirado elas do PDF:
--
--   1. Coluna `nr01_assessment_results.systemic_alerts` (alertas sistêmicos)
--   2. Tabela `nr01_pentagrama_bridge` inteira (bridge NR-01 ↔ Pentagrama)
--
-- Mantém intactas as features regulatórias com fundamento próprio:
--   - Plano de ação PDCA (NR-01 exige plano com responsáveis)
--   - Monitoramento contínuo / micro-pulsos (NR-01 exige monitoramento)
--   - Projeção econômica (decisão de produto categoria C)
--   - k-anonymity (LGPD/ANPD)
--   - Hashes SHA-256 + audit log (defesa técnica)
--
-- Idempotente.
-- ============================================================

BEGIN;

-- 1. Categoria 1 — Alertas sistêmicos
ALTER TABLE nr01_assessment_results
  DROP COLUMN IF EXISTS systemic_alerts;

-- 2. Categoria 2 — Bridge Pentagrama
DROP TABLE IF EXISTS nr01_pentagrama_bridge CASCADE;

-- Verificações
DO $$
DECLARE
  bridge_exists      boolean;
  alerts_col_exists  boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM pg_tables WHERE tablename = 'nr01_pentagrama_bridge'
  ) INTO bridge_exists;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nr01_assessment_results'
      AND column_name = 'systemic_alerts'
  ) INTO alerts_col_exists;

  IF bridge_exists THEN
    RAISE EXCEPTION 'Patch 010: nr01_pentagrama_bridge ainda existe';
  END IF;

  IF alerts_col_exists THEN
    RAISE EXCEPTION 'Patch 010: coluna systemic_alerts ainda existe';
  END IF;
END $$;

COMMIT;
