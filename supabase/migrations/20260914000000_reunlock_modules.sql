-- Garante módulos liberados para todos os perfis (corrige regressão de flags).
UPDATE public.profiles
SET
  module_pentagrama = true,
  module_nr01 = true
WHERE module_pentagrama IS DISTINCT FROM true
   OR module_nr01 IS DISTINCT FROM true;

UPDATE public.org_members
SET
  module_pentagrama = true,
  module_nr01 = true
WHERE module_pentagrama IS DISTINCT FROM true
   OR module_nr01 IS DISTINCT FROM true;

-- Default explícito para novos inserts
ALTER TABLE public.profiles
  ALTER COLUMN module_pentagrama SET DEFAULT true,
  ALTER COLUMN module_nr01 SET DEFAULT true;
