-- ============================================================
-- QUANTUM5G — RLS Patch: gaps críticos
-- Versão: 1.0 | Data: 2026-03-24
-- Corrige 3 gaps que bloqueiam o fluxo principal
-- ============================================================

-- ============================================================
-- GAP 1: il_responses — líder não consegue enviar IL
-- INSERT permitido quando diagnóstico está em AGUARDANDO_IL
-- ============================================================
CREATE POLICY "il_responses_insert_token" ON il_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = il_responses.diagnostic_id
        AND d.status = 'AGUARDANDO_IL'
    )
  );

-- DELETE admin (caso não exista)
CREATE POLICY "il_responses_delete_admin" ON il_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- GAP 2: ic_responses — colaboradores não conseguem enviar
-- INSERT permitido quando diagnóstico está em COLETANDO_IC
-- Anonimato garantido: sem verificação de auth.uid()
-- ============================================================
CREATE POLICY "ic_responses_insert_token" ON ic_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ic_responses.diagnostic_id
        AND d.status = 'COLETANDO_IC'
    )
  );

-- SELECT para consultant (caso não exista separado)
CREATE POLICY "ic_responses_select_consultant" ON ic_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM diagnostics d
      JOIN profiles p ON p.id = auth.uid()
      WHERE d.id = ic_responses.diagnostic_id
        AND (d.consultant_id = auth.uid() OR p.role = 'admin')
    )
  );

-- DELETE admin
CREATE POLICY "ic_responses_delete_admin" ON ic_responses
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- GAP 3: laudos — anon não consegue ler (formulários públicos)
-- Formulários IL e IC são acessados via token sem auth
-- ============================================================

-- Remover policy restrita (só authenticated) e substituir por pública
DROP POLICY IF EXISTS "laudos_select_authenticated" ON laudos;

CREATE POLICY "laudos_select_public" ON laudos
  FOR SELECT USING (true);


-- ============================================================
-- diagnostic_results: INSERT para Edge Function (service role)
-- e DELETE para admin
-- ============================================================
CREATE POLICY "diagnostic_results_insert_service" ON diagnostic_results
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );

CREATE POLICY "diagnostic_results_delete_admin" ON diagnostic_results
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM profiles p
      WHERE p.id = auth.uid() AND p.role = 'admin'
    )
  );


-- ============================================================
-- GRANT anon para laudos (acesso público sem autenticação)
-- ============================================================
GRANT SELECT ON laudos TO anon;


-- ============================================================
-- Verificacao final — deve retornar todas as tabelas cobertas
-- SELECT tablename, cmd, count(*) as policies
-- FROM pg_policies
-- WHERE schemaname = 'public'
-- GROUP BY tablename, cmd
-- ORDER BY tablename, cmd;
-- ============================================================
