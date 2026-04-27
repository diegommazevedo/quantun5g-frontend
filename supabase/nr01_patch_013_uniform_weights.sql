-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 013 (pesos uniformes no ISO)
-- Data: 2026-04-26
--
-- Metodologia (RT Jovane Borlini, 25/04/2026): todas as dimensões
-- NR-01/GRO têm peso 1,00 no cálculo do ISO. Diferenciação de
-- violência/assédio permanece nos textos oficiais do laudo (P008),
-- não na fórmula.
--
-- Aplicar APÓS nr01_patch_006_pesos.sql (ou qualquer estado anterior).
-- Idempotente.
-- ============================================================

UPDATE nr01_dimensions SET weight = 1.00;

DO $$
DECLARE
  bad_count integer;
  dim_count integer;
BEGIN
  SELECT COUNT(*) INTO bad_count FROM nr01_dimensions WHERE weight <> 1.00;
  IF bad_count > 0 THEN
    RAISE EXCEPTION 'P013: esperado weight = 1.00 para todas as dimensões (% linhas fora do padrão)', bad_count;
  END IF;
  SELECT COUNT(*) INTO dim_count FROM nr01_dimensions;
  IF dim_count <> 10 THEN
    RAISE EXCEPTION 'P013: esperadas 10 dimensões NR-01, encontrado %', dim_count;
  END IF;
  RAISE NOTICE 'P013: pesos uniformes OK — 10 dimensões @ 1.00';
END $$;

SELECT code, name, weight FROM nr01_dimensions ORDER BY ord;
