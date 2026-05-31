-- Contas operacionais da plataforma não devem usar role=leader (reservado a líder IL no relatório).

UPDATE profiles
SET
  role = 'admin',
  module_pentagrama = true,
  module_nr01 = true,
  is_active = true
WHERE lower(email) IN (
  'suporte@quantun5g.com',
  'suporte@quantum5g.com'
)
  AND role <> 'admin';
