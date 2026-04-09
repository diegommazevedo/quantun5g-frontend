-- ============================================================
-- QUANTUM5G — Row Level Security (RLS)
-- Versão: 1.0 | Data: 2026-03-24
-- Executar APÓS schema.sql e seed.sql
--
-- Roles: admin | consultant | leader | collaborator
-- Auth context: auth.uid() = id do usuário autenticado
-- ============================================================

-- ============================================================
-- HELPER: obtém role do usuário atual
-- ============================================================
CREATE OR REPLACE FUNCTION get_my_role()
RETURNS text AS $$
  SELECT role FROM profiles WHERE id = auth.uid();
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- 1. profiles
-- ============================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "profiles_select" ON profiles
  FOR SELECT USING (
    id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "profiles_update" ON profiles
  FOR UPDATE USING (id = auth.uid());


-- ============================================================
-- 2. companies
-- ============================================================
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;

CREATE POLICY "companies_select" ON companies
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "companies_insert" ON companies
  FOR INSERT WITH CHECK (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "companies_update" ON companies
  FOR UPDATE USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "companies_delete" ON companies
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 3. diagnostics
-- ============================================================
ALTER TABLE diagnostics ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostics_select" ON diagnostics
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
    OR (
      get_my_role() = 'leader'
      AND leader_email = (SELECT email FROM profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "diagnostics_insert" ON diagnostics
  FOR INSERT WITH CHECK (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "diagnostics_update" ON diagnostics
  FOR UPDATE USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "diagnostics_delete" ON diagnostics
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 4. laudos — leitura pública (necessário para relatórios via token)
-- ============================================================
ALTER TABLE laudos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "laudos_select_public" ON laudos
  FOR SELECT USING (true);

CREATE POLICY "laudos_insert_admin" ON laudos
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "laudos_update_admin" ON laudos
  FOR UPDATE USING (get_my_role() = 'admin');

CREATE POLICY "laudos_delete_admin" ON laudos
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 5. il_responses
-- INSERT via Edge Function com token (SECURITY DEFINER)
-- ============================================================
ALTER TABLE il_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "il_responses_select" ON il_responses
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = il_responses.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  );

CREATE POLICY "il_responses_insert_token" ON il_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = il_responses.diagnostic_id
        AND d.status = 'AGUARDANDO_IL'
    )
  );

CREATE POLICY "il_responses_delete" ON il_responses
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 6. ic_responses
-- ANONIMATO TOTAL: sem FK, sem identificação do respondente
-- INSERT público via token validado pela Edge Function
-- ============================================================
ALTER TABLE ic_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "ic_responses_select" ON ic_responses
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ic_responses.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  );

CREATE POLICY "ic_responses_insert_token" ON ic_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ic_responses.diagnostic_id
        AND d.status = 'COLETANDO_IC'
    )
  );

-- Sem UPDATE (respostas imutáveis após envio)
CREATE POLICY "ic_responses_delete" ON ic_responses
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 7. diagnostic_results — snapshot imutável
-- ============================================================
ALTER TABLE diagnostic_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "diagnostic_results_select" ON diagnostic_results
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = diagnostic_results.diagnostic_id
        AND (
          d.consultant_id = auth.uid()
          OR (
            get_my_role() = 'leader'
            AND d.leader_email = (SELECT email FROM profiles WHERE id = auth.uid())
          )
        )
    )
  );

CREATE POLICY "diagnostic_results_insert" ON diagnostic_results
  FOR INSERT WITH CHECK (get_my_role() = 'admin');

CREATE POLICY "diagnostic_results_delete" ON diagnostic_results
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- GRANTS
-- ============================================================
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT SELECT ON laudos TO anon;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- ============================================================
-- Verificacao: policies ativas por tabela
-- SELECT tablename, policyname, cmd
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- ORDER BY tablename, policyname;
-- ============================================================
