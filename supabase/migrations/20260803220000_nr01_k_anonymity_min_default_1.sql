-- NR-01: permite k-anonymity mínimo = 1 (desbloqueia emissão de laudo a partir de 1 resposta).
-- Mantém a checagem no motor; apenas baixa o piso e o default.

ALTER TABLE nr01_assessments
  DROP CONSTRAINT IF EXISTS nr01_assessments_k_anonymity_min_check;

ALTER TABLE nr01_assessments
  ADD CONSTRAINT nr01_assessments_k_anonymity_min_check
  CHECK (k_anonymity_min >= 1);

ALTER TABLE nr01_assessments
  ALTER COLUMN k_anonymity_min SET DEFAULT 1;
