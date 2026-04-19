-- Lista usuários atuais (auth.users JOIN profiles)
SELECT
  u.id,
  u.email,
  p.role,
  p.name,
  p.is_active,
  u.email_confirmed_at IS NOT NULL AS email_confirmed,
  u.last_sign_in_at,
  u.created_at
FROM auth.users u
LEFT JOIN profiles p ON p.id = u.id
ORDER BY u.created_at DESC
LIMIT 30;
