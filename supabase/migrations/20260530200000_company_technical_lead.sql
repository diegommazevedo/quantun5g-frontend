-- RT (responsável técnico assinante) por empresa + snapshot na avaliação

ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_crp text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_profession text DEFAULT 'Psicólogo';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_email text;

ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS technical_lead_name text;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS technical_lead_profession text;

COMMENT ON COLUMN companies.technical_lead_name IS 'Nome do RT que assina laudos desta empresa';
COMMENT ON COLUMN companies.technical_lead_crp IS 'Registro profissional (ex. CRP 16/4948)';
COMMENT ON COLUMN nr01_assessments.technical_lead_name IS 'Snapshot do RT no processamento/emissão do laudo';
