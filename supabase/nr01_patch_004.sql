-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 004 (status público para cliente)
-- Versão: 0.4.0 | Data: 2026-04-19
-- Aplicar APÓS nr01_patch_003.sql.
--
-- Token público sem login — RH do cliente acessa /nr01/status/[token]
-- e vê 5 itens de semáforo (ver Diego, P5). Token gerado pelo consultor,
-- revogável a qualquer momento.
--
-- Idempotente: IF NOT EXISTS + DROP POLICY IF EXISTS.
-- ============================================================

CREATE TABLE IF NOT EXISTS nr01_public_status_tokens (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  -- Token de 64 caracteres: hex (32 bytes) — uuid v4 + sufixo aleatório
  token             text UNIQUE NOT NULL,
  created_by        uuid REFERENCES profiles(id),
  created_at        timestamptz NOT NULL DEFAULT now(),
  revoked_at        timestamptz,
  accessed_count    int NOT NULL DEFAULT 0,
  last_accessed_at  timestamptz,
  CONSTRAINT chk_token_length CHECK (char_length(token) >= 32)
);

CREATE INDEX IF NOT EXISTS idx_nr01_pub_token       ON nr01_public_status_tokens(token);
CREATE INDEX IF NOT EXISTS idx_nr01_pub_assessment  ON nr01_public_status_tokens(assessment_id);


-- ============================================================
-- RLS
-- ============================================================
ALTER TABLE nr01_public_status_tokens ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pub_token_select_owner" ON nr01_public_status_tokens;
DROP POLICY IF EXISTS "nr01_pub_token_select_anon"  ON nr01_public_status_tokens;
DROP POLICY IF EXISTS "nr01_pub_token_insert_owner" ON nr01_public_status_tokens;
DROP POLICY IF EXISTS "nr01_pub_token_update_anon"  ON nr01_public_status_tokens;
DROP POLICY IF EXISTS "nr01_pub_token_update_owner" ON nr01_public_status_tokens;
DROP POLICY IF EXISTS "nr01_pub_token_delete_owner" ON nr01_public_status_tokens;

-- Owner (consultor dono / admin) vê tudo do seu assessment.
CREATE POLICY "nr01_pub_token_select_owner" ON nr01_public_status_tokens
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

-- Anon: pode SELECT só linhas ativas (revoked_at IS NULL).
-- O token em si já é o "segredo" que protege o acesso (32+ bytes hex).
CREATE POLICY "nr01_pub_token_select_anon" ON nr01_public_status_tokens
  FOR SELECT USING (revoked_at IS NULL);

-- Insert apenas pelo consultor dono.
CREATE POLICY "nr01_pub_token_insert_owner" ON nr01_public_status_tokens
  FOR INSERT WITH CHECK (nr01_owns_assessment(assessment_id));

-- Update público para incrementar accessed_count + last_accessed_at
-- (controlado pelo route handler — não há UPDATE de outros campos via app).
-- Owner também pode revogar.
CREATE POLICY "nr01_pub_token_update_anon" ON nr01_public_status_tokens
  FOR UPDATE USING (revoked_at IS NULL);

CREATE POLICY "nr01_pub_token_update_owner" ON nr01_public_status_tokens
  FOR UPDATE USING (nr01_owns_assessment(assessment_id));

-- Delete só admin (revogação preferida via revoked_at, não via DELETE).
DROP POLICY IF EXISTS "nr01_pub_token_delete_admin" ON nr01_public_status_tokens;
CREATE POLICY "nr01_pub_token_delete_admin" ON nr01_public_status_tokens
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, UPDATE ON nr01_public_status_tokens TO anon, authenticated;
GRANT INSERT         ON nr01_public_status_tokens TO authenticated;


-- ============================================================
-- VERIFICAÇÃO
-- ============================================================
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_public_status_tokens') AS table_ok,
  (SELECT relrowsecurity FROM pg_class WHERE relname = 'nr01_public_status_tokens')               AS rls_ok,
  (SELECT COUNT(*) FROM pg_policies WHERE tablename = 'nr01_public_status_tokens')                 AS policies_count;
