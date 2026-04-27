-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 006 (pesos do ISO)
-- Versão: 0.6.0 | Data: 2026-04-19
-- Aplicar APÓS nr01_patch_005 (alinhamento oficial).
--
-- Alinhamento com decisão do responsável técnico (Jovane Borlini):
-- - NR01_GRO.docx oficial NÃO menciona pesos por dimensão
-- - Única exceção mantida: peso 1.30 para Violência e Assédio,
--   por força da Lei 14.457/2022 (risco crítico explícito)
-- - Demais 9 dimensões: peso uniforme 1.00 (média aritmética simples)
--
-- Idempotente.
-- ============================================================

UPDATE nr01_dimensions SET weight = 1.30 WHERE code = 'assedio_violencia';
UPDATE nr01_dimensions SET weight = 1.00 WHERE code <> 'assedio_violencia';

-- Verificação imediata
DO $$
DECLARE
  weight_assedio numeric;
  weight_others_distinct integer;
BEGIN
  SELECT weight INTO weight_assedio
    FROM nr01_dimensions WHERE code = 'assedio_violencia';

  SELECT COUNT(DISTINCT weight) INTO weight_others_distinct
    FROM nr01_dimensions WHERE code <> 'assedio_violencia';

  IF weight_assedio <> 1.30 THEN
    RAISE EXCEPTION 'Patch 006: peso assédio incorreto (esperado 1.30, encontrado %)', weight_assedio;
  END IF;

  IF weight_others_distinct <> 1 THEN
    RAISE EXCEPTION 'Patch 006: demais pesos não uniformes (% valores distintos)', weight_others_distinct;
  END IF;

  RAISE NOTICE 'Patch 006: pesos OK — assédio=1.30, demais=1.00';
END $$;

-- Confirmação visual
SELECT code, name, weight FROM nr01_dimensions ORDER BY ord;
