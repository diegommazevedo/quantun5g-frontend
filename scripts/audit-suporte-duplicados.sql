-- Auditoria: perfis admin/suporte duplicados ou inconsistentes.
-- Somente leitura — revisar antes de qualquer merge/desativação.

SELECT
  p.id,
  p.email,
  p.role,
  p.name,
  p.is_active,
  p.created_at,
  (SELECT count(*) FROM nr01_assessments a WHERE a.consultant_id = p.id) AS nr01_como_consultor,
  (SELECT count(*) FROM diagnostics d WHERE d.consultant_id = p.id) AS pentagrama_como_consultor,
  (SELECT count(*) FROM companies c WHERE c.consultant_id = p.id) AS empresas_como_consultor
FROM profiles p
WHERE p.email ILIKE '%suporte%quantun5g%'
   OR p.email = 'diegomanoelmiranda@gmail.com'
ORDER BY p.email, p.created_at;

-- E-mails com mais de um perfil
SELECT email, count(*) AS perfis, array_agg(id::text ORDER BY created_at) AS ids
FROM profiles
WHERE email ILIKE '%quantun5g%'
GROUP BY email
HAVING count(*) > 1;
