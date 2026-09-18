-- Pentagrama: escopo de disparo (geral vs departamentos pré-selecionados)
ALTER TABLE diagnostics
  ADD COLUMN IF NOT EXISTS dispatch_scope text NOT NULL DEFAULT 'geral';

ALTER TABLE diagnostics
  ADD COLUMN IF NOT EXISTS dispatch_departments text[] NOT NULL DEFAULT '{}';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'diagnostics_dispatch_scope_check'
  ) THEN
    ALTER TABLE diagnostics
      ADD CONSTRAINT diagnostics_dispatch_scope_check
      CHECK (dispatch_scope IN ('geral', 'departamento'));
  END IF;
END $$;

COMMENT ON COLUMN diagnostics.dispatch_scope IS
  'geral = todos departamentos no disparo IL/IC; departamento = pré-seleção em dispatch_departments';
COMMENT ON COLUMN diagnostics.dispatch_departments IS
  'Chaves de department (company_contacts) pré-marcadas no disparo; vazio se scope=geral';
