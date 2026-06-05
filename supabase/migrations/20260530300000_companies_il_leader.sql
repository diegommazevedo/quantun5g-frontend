-- Profissional IL (liderança / LID) por empresa — Pentagrama Ginger



ALTER TABLE companies ADD COLUMN IF NOT EXISTS il_leader_name text;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS il_leader_email text;



COMMENT ON COLUMN companies.il_leader_name IS 'Nome do respondente IL (liderança) padrão desta empresa';

COMMENT ON COLUMN companies.il_leader_email IS 'E-mail do respondente IL para envio do link';


