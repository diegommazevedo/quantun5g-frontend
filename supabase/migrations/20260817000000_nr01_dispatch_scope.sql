-- NR-01: escopo de disparo (geral vs departamentos pré-selecionados)
ALTER TABLE nr01_assessments
  ADD COLUMN IF NOT EXISTS dispatch_scope text NOT NULL DEFAULT 'geral';

ALTER TABLE nr01_assessments
  ADD COLUMN IF NOT EXISTS dispatch_departments text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'nr01_assessments_dispatch_scope_check'
  ) THEN
    ALTER TABLE nr01_assessments
      ADD CONSTRAINT nr01_assessments_dispatch_scope_check
      CHECK (dispatch_scope IN ('geral', 'departamento'));
  END IF;
END $$;

COMMENT ON COLUMN nr01_assessments.dispatch_scope IS
  'geral = todos departamentos no disparo; departamento = pré-seleção em dispatch_departments';
COMMENT ON COLUMN nr01_assessments.dispatch_departments IS
  'Chaves de department (company_contacts) pré-marcadas no disparo; vazio se scope=geral';
