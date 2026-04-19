-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch 002 (micro-pulsos)
-- Versão: 0.2.0 | Data: 2026-04-19
-- Aplicar APÓS nr01_patch_001.sql.
--
-- O modelo original `nr01_micro_pulses` era flat e sem o conceito de
-- "disparo semanal" como entidade. Substituído por 4 tabelas com RLS,
-- preservando anonimato matemático (email_hash separado de anon_id).
--
-- Idempotente: DROP TABLE IF EXISTS no início (vazio em prod, verificado).
--
-- Tabelas:
--   nr01_pulse_config      — uma linha por avaliação (recipientes, frequência)
--   nr01_pulse_dispatches  — uma linha por semana disparada
--   nr01_pulse_invites     — token individual por (dispatch, email_hash)
--   nr01_pulse_responses   — respostas anônimas vinculadas ao dispatch
-- ============================================================

DROP TABLE IF EXISTS nr01_pulse_responses CASCADE;
DROP TABLE IF EXISTS nr01_pulse_invites    CASCADE;
DROP TABLE IF EXISTS nr01_pulse_dispatches CASCADE;
DROP TABLE IF EXISTS nr01_pulse_config     CASCADE;
DROP TABLE IF EXISTS nr01_micro_pulses     CASCADE;  -- legado vazio do schema v1


-- ============================================================
-- 1. nr01_pulse_config — uma linha por avaliação
-- ============================================================
CREATE TABLE nr01_pulse_config (
  assessment_id        uuid PRIMARY KEY REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  enabled              boolean NOT NULL DEFAULT false,
  -- 1 = segunda, 7 = domingo (ISO 8601)
  day_of_week          smallint NOT NULL DEFAULT 1 CHECK (day_of_week BETWEEN 1 AND 7),
  -- Lista de emails (jsonb de strings). Sem PII separada — edição completa via app.
  recipient_emails     jsonb NOT NULL DEFAULT '[]'::jsonb,
  questions_per_week   smallint NOT NULL DEFAULT 3 CHECK (questions_per_week BETWEEN 1 AND 5),
  -- Janela de resposta após disparo (default 7 dias)
  window_hours         int NOT NULL DEFAULT 168 CHECK (window_hours BETWEEN 24 AND 720),
  -- Calibração: as N primeiras semanas não geram alertas preditivos
  calibration_weeks    smallint NOT NULL DEFAULT 3 CHECK (calibration_weeks BETWEEN 0 AND 8),
  last_dispatched_at   timestamptz,
  weeks_dispatched     int NOT NULL DEFAULT 0,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 2. nr01_pulse_dispatches — uma linha por semana
-- ============================================================
CREATE TABLE nr01_pulse_dispatches (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  week_number         int NOT NULL CHECK (week_number >= 1),
  dispatched_at       timestamptz NOT NULL DEFAULT now(),
  question_ids        jsonb NOT NULL,                -- array de uuid (3 por padrão)
  invites_sent_count  int NOT NULL DEFAULT 0,
  window_closes_at    timestamptz NOT NULL,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dispatch_week UNIQUE (assessment_id, week_number)
);

CREATE INDEX idx_nr01_pulse_dispatch_assess ON nr01_pulse_dispatches(assessment_id);


-- ============================================================
-- 3. nr01_pulse_invites — token individual por destinatário
-- ============================================================
CREATE TABLE nr01_pulse_invites (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id uuid NOT NULL REFERENCES nr01_pulse_dispatches(id) ON DELETE CASCADE,
  -- HMAC do email com sal por-avaliação (mesmo padrão do hashIp).
  -- Bloqueia re-identificação cruzada e cumpre LGPD.
  email_hash  text NOT NULL,
  token       uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  used_at     timestamptz,
  CONSTRAINT uq_invite UNIQUE (dispatch_id, email_hash)
);

CREATE INDEX idx_nr01_pulse_invite_token ON nr01_pulse_invites(token);


-- ============================================================
-- 4. nr01_pulse_responses — resposta anônima
--
-- ANONIMATO: anon_id (UUID gerado no momento da resposta) NÃO tem
-- FK para invites. Não há link de email → resposta.
-- ============================================================
CREATE TABLE nr01_pulse_responses (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dispatch_id  uuid NOT NULL REFERENCES nr01_pulse_dispatches(id) ON DELETE CASCADE,
  question_id  uuid NOT NULL REFERENCES nr01_questions(id) ON DELETE RESTRICT,
  anon_id      uuid NOT NULL,
  value        smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  submitted_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_pulse_response UNIQUE (dispatch_id, anon_id, question_id)
);

CREATE INDEX idx_nr01_pulse_resp_dispatch ON nr01_pulse_responses(dispatch_id);
CREATE INDEX idx_nr01_pulse_resp_question ON nr01_pulse_responses(question_id);


-- ============================================================
-- TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_nr01_pulse_config_updated_at ON nr01_pulse_config;
CREATE TRIGGER trg_nr01_pulse_config_updated_at
  BEFORE UPDATE ON nr01_pulse_config
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- RLS — pulse_config
-- ============================================================
ALTER TABLE nr01_pulse_config ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pulse_config_select" ON nr01_pulse_config;
DROP POLICY IF EXISTS "nr01_pulse_config_write"  ON nr01_pulse_config;

CREATE POLICY "nr01_pulse_config_select" ON nr01_pulse_config
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_pulse_config_write" ON nr01_pulse_config
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));


-- ============================================================
-- RLS — pulse_dispatches
-- ============================================================
ALTER TABLE nr01_pulse_dispatches ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pulse_dispatch_select" ON nr01_pulse_dispatches;
DROP POLICY IF EXISTS "nr01_pulse_dispatch_write"  ON nr01_pulse_dispatches;

CREATE POLICY "nr01_pulse_dispatch_select" ON nr01_pulse_dispatches
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_pulse_dispatch_write" ON nr01_pulse_dispatches
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));


-- ============================================================
-- RLS — pulse_invites
-- ============================================================
ALTER TABLE nr01_pulse_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pulse_invite_select"        ON nr01_pulse_invites;
DROP POLICY IF EXISTS "nr01_pulse_invite_insert_owner"  ON nr01_pulse_invites;
DROP POLICY IF EXISTS "nr01_pulse_invite_update_token"  ON nr01_pulse_invites;

-- Owner vê todos os invites do seu dispatch
CREATE POLICY "nr01_pulse_invite_select" ON nr01_pulse_invites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nr01_pulse_dispatches d
      WHERE d.id = nr01_pulse_invites.dispatch_id
        AND nr01_owns_assessment(d.assessment_id)
    )
  );

CREATE POLICY "nr01_pulse_invite_insert_owner" ON nr01_pulse_invites
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nr01_pulse_dispatches d
      WHERE d.id = nr01_pulse_invites.dispatch_id
        AND nr01_owns_assessment(d.assessment_id)
    )
  );

-- UPDATE público para marcar used_at via token (validado no handler)
CREATE POLICY "nr01_pulse_invite_update_token" ON nr01_pulse_invites
  FOR UPDATE USING (true);


-- ============================================================
-- RLS — pulse_responses
-- ============================================================
ALTER TABLE nr01_pulse_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pulse_resp_select"        ON nr01_pulse_responses;
DROP POLICY IF EXISTS "nr01_pulse_resp_insert_public" ON nr01_pulse_responses;

CREATE POLICY "nr01_pulse_resp_select" ON nr01_pulse_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nr01_pulse_dispatches d
      WHERE d.id = nr01_pulse_responses.dispatch_id
        AND nr01_owns_assessment(d.assessment_id)
    )
  );

-- INSERT público: o handler valida o token de invite ANTES de inserir.
-- A constraint UNIQUE (dispatch_id, anon_id, question_id) bloqueia duplicatas.
CREATE POLICY "nr01_pulse_resp_insert_public" ON nr01_pulse_responses
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT, INSERT, UPDATE ON nr01_pulse_invites   TO anon, authenticated;
GRANT SELECT, INSERT          ON nr01_pulse_responses TO anon, authenticated;
GRANT ALL                     ON nr01_pulse_config, nr01_pulse_dispatches TO authenticated;


-- ============================================================
-- VIEW agregada: scores por semana × dimensão (k-anonymity ≥ 3)
--
-- Apenas semanas com pelo menos 3 respostas distintas (anon_id) por dimensão.
-- Default de calibração; consultor pode usar a view bruta com cuidado.
-- ============================================================
CREATE OR REPLACE VIEW nr01_pulse_weekly_scores AS
SELECT
  d.assessment_id,
  d.week_number,
  d.dispatched_at::date           AS week_date,
  q.dimension_code,
  -- Aplica inversão para reverse_scored, normaliza para 0-100
  ROUND(
    AVG(CASE WHEN q.reverse_scored THEN (6 - r.value) ELSE r.value END - 1)
    * 100.0 / 4.0,
    2
  )                               AS score_pct,
  COUNT(DISTINCT r.anon_id)       AS n_respondents,
  COUNT(*)                        AS n_answers
FROM nr01_pulse_responses r
JOIN nr01_pulse_dispatches d ON d.id = r.dispatch_id
JOIN nr01_questions q        ON q.id = r.question_id
GROUP BY d.assessment_id, d.week_number, d.dispatched_at, q.dimension_code
HAVING COUNT(DISTINCT r.anon_id) >= 3;

COMMENT ON VIEW nr01_pulse_weekly_scores IS
  'Score 0-100 por semana × dimensão. k-anonymity ≥ 3 (mais permissivo que coleta principal por ter amostras menores).';


-- ============================================================
-- VERIFICAÇÃO
--   SELECT table_name FROM information_schema.tables
--   WHERE table_name LIKE 'nr01_pulse_%' ORDER BY table_name;
-- ============================================================
