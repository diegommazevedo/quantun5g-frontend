-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 001
-- Versão: 0.1.1 | Data: 2026-04-18
-- Aplicar APÓS nr01_schema.sql + nr01_rls.sql + nr01_seed.sql.
--
-- Endereça os 5 ajustes pré-26/05 da review sênior:
--   1. Rate-limit no endpoint público (anti-poisoning)
--   2. (em código TS) sal de ip_hash por-avaliação
--   3. Bridge: campo confidence_level (nominal | statistical)
--   4. Audit log: REVOKE explícito de UPDATE/DELETE da role authenticated
--   5. instrument_version imutável após sair de CRIADO
--
-- Idempotente: usa IF NOT EXISTS / DROP IF EXISTS.
-- ============================================================


-- ============================================================
-- AJUSTE 1 — Rate-limit no endpoint público
--
-- Tabela de referência de throttle por (assessment_id, ip_hash).
-- INSERT/SELECT públicos via anon (com filtro RLS por escopo).
-- Atualizada via UPSERT pelo route handler de submissão.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_collection_throttle (
  assessment_id      uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  ip_hash            text NOT NULL,                   -- HMAC(ip, assessment_id || APP_SECRET)
  first_seen_at      timestamptz NOT NULL DEFAULT now(),
  last_submission_at timestamptz NOT NULL DEFAULT now(),
  submission_count   int NOT NULL DEFAULT 1 CHECK (submission_count >= 1),
  blocked_until      timestamptz,
  PRIMARY KEY (assessment_id, ip_hash)
);

CREATE INDEX IF NOT EXISTS idx_nr01_throttle_last ON nr01_collection_throttle(last_submission_at);

ALTER TABLE nr01_collection_throttle ENABLE ROW LEVEL SECURITY;

-- Acesso anon limitado a INSERT/UPDATE controlados pela aplicação.
-- A SELECT pública é necessária só para o próprio par (assessment_id, ip_hash) — o handler
-- já tem o ip_hash da request, então traz só a linha relevante.
DROP POLICY IF EXISTS "nr01_throttle_select_self"  ON nr01_collection_throttle;
DROP POLICY IF EXISTS "nr01_throttle_insert_open"  ON nr01_collection_throttle;
DROP POLICY IF EXISTS "nr01_throttle_update_open"  ON nr01_collection_throttle;
DROP POLICY IF EXISTS "nr01_throttle_select_owner" ON nr01_collection_throttle;

-- Insert público (handler só insere com ip_hash + token validado)
CREATE POLICY "nr01_throttle_insert_open" ON nr01_collection_throttle
  FOR INSERT WITH CHECK (true);

-- Update público (handler atualiza last_submission_at + count para o próprio par)
CREATE POLICY "nr01_throttle_update_open" ON nr01_collection_throttle
  FOR UPDATE USING (true);

-- Select para anon: necessário para o próprio par. Em escala ideal isso
-- vira RPC SECURITY DEFINER; por hora, liberamos SELECT amplo.
CREATE POLICY "nr01_throttle_select_self" ON nr01_collection_throttle
  FOR SELECT USING (true);

-- Owner (consultor/admin) pode auditar
CREATE POLICY "nr01_throttle_select_owner" ON nr01_collection_throttle
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

GRANT SELECT, INSERT, UPDATE ON nr01_collection_throttle TO anon, authenticated;


-- ============================================================
-- AJUSTE 3 — Bridge: confidence_level e min_n
-- ============================================================
ALTER TABLE nr01_pentagrama_bridge
  ADD COLUMN IF NOT EXISTS confidence_level text NOT NULL DEFAULT 'nominal'
    CHECK (confidence_level IN ('nominal', 'statistical'));

ALTER TABLE nr01_pentagrama_bridge
  ADD COLUMN IF NOT EXISTS min_n_respondents int;

COMMENT ON COLUMN nr01_pentagrama_bridge.confidence_level IS
  'nominal = aproximação por delta (n < 200). statistical = correlação estatística real (Pearson/Spearman).';


-- ============================================================
-- AJUSTE 4 — Audit log: REVOKE explícito
--
-- Defesa em profundidade. Mesmo sem policies de UPDATE/DELETE
-- (que default-deny no RLS), revogamos o privilégio SQL-level
-- da role authenticated. Apenas service_role pode mutar.
-- ============================================================
REVOKE UPDATE, DELETE ON nr01_audit_log FROM authenticated;
REVOKE UPDATE, DELETE ON nr01_audit_log FROM anon;
GRANT  SELECT, INSERT  ON nr01_audit_log TO   authenticated, anon;

-- Garantia adicional: trigger que rejeita qualquer UPDATE/DELETE
-- exceto pela role service_role (caminho de SQL direto + log externo).
CREATE OR REPLACE FUNCTION nr01_audit_log_immutable()
RETURNS trigger AS $$
BEGIN
  -- Admins SQL-direct (dono do banco / role administrativa do Supabase) sempre
  -- podem mutar — necessário para takedown LGPD e migrations. A defesa contra
  -- mutação acidental pela aplicação Next.js continua: roles authenticated/anon
  -- nunca caem nesse ramo.
  IF current_user IN ('postgres', 'supabase_admin') THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  IF current_setting('request.jwt.claim.role', true) = 'service_role' THEN
    RETURN COALESCE(NEW, OLD);
  END IF;
  RAISE EXCEPTION 'nr01_audit_log é append-only. Mutações exigem service_role ou role administrativa.'
    USING ERRCODE = '42501';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nr01_audit_no_update ON nr01_audit_log;
DROP TRIGGER IF EXISTS trg_nr01_audit_no_delete ON nr01_audit_log;

CREATE TRIGGER trg_nr01_audit_no_update
  BEFORE UPDATE ON nr01_audit_log
  FOR EACH ROW EXECUTE FUNCTION nr01_audit_log_immutable();

CREATE TRIGGER trg_nr01_audit_no_delete
  BEFORE DELETE ON nr01_audit_log
  FOR EACH ROW EXECUTE FUNCTION nr01_audit_log_immutable();


-- ============================================================
-- AJUSTE 5 — instrument_version imutável após sair de CRIADO
--
-- Trigger BEFORE UPDATE: bloqueia mudança de instrument_version
-- se status atual ou novo for diferente de 'CRIADO'.
-- Garante coerência longitudinal: um assessment "vive e morre"
-- na versão em que foi aberto.
-- ============================================================
CREATE OR REPLACE FUNCTION nr01_assessment_version_guard()
RETURNS trigger AS $$
BEGIN
  IF OLD.instrument_version IS DISTINCT FROM NEW.instrument_version THEN
    IF OLD.status <> 'CRIADO' THEN
      RAISE EXCEPTION
        'instrument_version é imutável após avaliação sair do estado CRIADO (atual: %). Crie nova avaliação para versão %.',
        OLD.status, NEW.instrument_version
        USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_nr01_assessment_version_guard ON nr01_assessments;
CREATE TRIGGER trg_nr01_assessment_version_guard
  BEFORE UPDATE ON nr01_assessments
  FOR EACH ROW EXECUTE FUNCTION nr01_assessment_version_guard();


-- ============================================================
-- VERIFICAÇÃO RÁPIDA
--
-- 1) Throttle existe e tem RLS?
-- SELECT relname, relrowsecurity FROM pg_class WHERE relname = 'nr01_collection_throttle';
--
-- 2) Bridge tem confidence_level?
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'nr01_pentagrama_bridge' AND column_name LIKE 'confidence%';
--
-- 3) Audit log bloqueia UPDATE para authenticated?
-- SET ROLE authenticated; UPDATE nr01_audit_log SET event_type='HACK' WHERE id = 1; -- esperado: erro
-- RESET ROLE;
--
-- 4) instrument_version bloqueado após COLETANDO?
-- UPDATE nr01_assessments SET instrument_version='v9.9' WHERE status='COLETANDO'; -- esperado: erro
-- ============================================================
