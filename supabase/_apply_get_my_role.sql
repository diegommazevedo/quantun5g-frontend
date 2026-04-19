-- ============================================================
-- HOTFIX — recriar get_my_role()
-- Necessário porque rls.sql do Pentagrama foi parcialmente aplicado:
-- as policies estão lá, a função sumiu. CREATE OR REPLACE é seguro.
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;

-- Confirmação
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') AS get_my_role_ok;
