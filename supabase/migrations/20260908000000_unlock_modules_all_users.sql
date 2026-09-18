-- Libera Pentagrama e NR-01 para todos os usuários cadastrados (e membros de org).
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
