-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Schema SQL
-- Versão: 0.1 | Data: 2026-04-18
-- Executar APÓS schema.sql + rls.sql do Pentagrama.
--
-- Princípios:
--   • Reusa profiles + companies do Pentagrama (multi-tenancy preservada).
--   • Avaliações NR-01 vivem em paralelo aos diagnostics; cruzamento opcional.
--   • Trilha de evidências imutável (hash SHA-256 + carimbo de tempo).
--   • Anonimato dos respondentes (sem FK para auth.users).
--   • k-anonymity ≥ 5 garantida em consultas agregadas.
--
-- ORDEM DE CRIAÇÃO:
--   1. nr01_dimensions             (catálogo fixo das 10 dimensões NR-01)
--   2. nr01_questions              (banco de questões por dimensão)
--   3. nr01_assessments            (avaliação — equivalente a diagnostic)
--   4. nr01_invites                (convites/tokens individuais)
--   5. nr01_responses              (respostas anônimas)
--   6. nr01_response_answers       (resposta item-a-item)
--   7. nr01_dimension_scores       (snapshot por dimensão)
--   8. nr01_assessment_results     (snapshot global + ISO)
--   9. nr01_evidence_pack          (pacote auditável)
--  10. nr01_intervention_library   (biblioteca curada — seed)
--  11. nr01_action_plans           (plano de ação por avaliação)
--  12. nr01_action_items           (itens individuais com PDCA)
--  13. nr01_economic_inputs        (parâmetros econômicos do cliente)
--  14. nr01_economic_projections   (saída do motor econômico)
--  15. nr01_audit_log              (trilha imutável de eventos)
--  16. nr01_pentagrama_bridge      (cruzamento com diagnostics)
--  17. nr01_micro_pulses           (monitoramento contínuo)
--  18. Triggers + funções auxiliares
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";


-- ============================================================
-- PRÉ-CHECK — garante que o Pentagrama base está aplicado.
-- Aborta com mensagem clara se faltar dependência.
-- ============================================================
DO $$
DECLARE
  has_companies     boolean;
  has_profiles      boolean;
  has_diagnostics   boolean;
  has_set_updated   boolean;
  has_get_my_role   boolean;
BEGIN
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'companies')   INTO has_companies;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'profiles')    INTO has_profiles;
  SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'diagnostics') INTO has_diagnostics;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'set_updated_at')                   INTO has_set_updated;
  SELECT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role')                      INTO has_get_my_role;

  IF NOT (has_companies AND has_profiles AND has_diagnostics
          AND has_set_updated AND has_get_my_role) THEN
    RAISE EXCEPTION
      'NR-01 depende do Pentagrama. Aplique primeiro (na ordem): supabase/schema.sql, supabase/rls.sql, supabase/seed.sql. Faltando: companies=%, profiles=%, diagnostics=%, set_updated_at=%, get_my_role=%',
      has_companies, has_profiles, has_diagnostics, has_set_updated, has_get_my_role
      USING ERRCODE = '42883';
  END IF;

  RAISE NOTICE 'Pré-check OK — todas as dependências do Pentagrama presentes.';
END $$;


-- ============================================================
-- 1. nr01_dimensions  — catálogo fixo (seed)
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_dimensions (
  code         text PRIMARY KEY,
  ord          smallint NOT NULL,
  name         text NOT NULL,
  description  text NOT NULL,
  nr01_clause  text NOT NULL,            -- referência regulatória
  weight       numeric(3,2) NOT NULL DEFAULT 1.00 CHECK (weight > 0)
);

COMMENT ON TABLE nr01_dimensions IS
  'Catálogo das 10 dimensões NR-01/GRO. Read-only para consultores. Editável apenas por admin.';


-- ============================================================
-- 2. nr01_questions  — banco de questões versionado
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_questions (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_code  text NOT NULL REFERENCES nr01_dimensions(code) ON DELETE RESTRICT,
  ord             smallint NOT NULL,
  text            text NOT NULL,
  reverse_scored  boolean NOT NULL DEFAULT false,
  instrument_version text NOT NULL DEFAULT 'v1.0',
  is_active       boolean NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_question_ord UNIQUE (dimension_code, ord, instrument_version)
);

CREATE INDEX IF NOT EXISTS idx_nr01_questions_dim ON nr01_questions(dimension_code);
CREATE INDEX IF NOT EXISTS idx_nr01_questions_version ON nr01_questions(instrument_version);


-- ============================================================
-- 3. nr01_assessments — avaliação NR-01
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_assessments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id            uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  consultant_id         uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  -- Identificação da avaliação
  name                  text NOT NULL,
  reference_period      text,                     -- "Q2 2026", "Anual 2026"
  instrument_version    text NOT NULL DEFAULT 'v1.0',
  status                text NOT NULL DEFAULT 'CRIADO' CHECK (status IN (
                          'CRIADO',
                          'COLETANDO',
                          'COLETA_ENCERRADA',
                          'PROCESSANDO',
                          'CONCLUIDO',
                          'ARQUIVADO'
                        )),
  -- Configuração de coleta
  modality              text NOT NULL DEFAULT 'WEB' CHECK (modality IN ('WEB','QR','WHATSAPP','KIOSK','PAPER')),
  collection_token      uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),  -- link público de coleta
  expected_respondents  int NOT NULL DEFAULT 0 CHECK (expected_respondents >= 0),
  k_anonymity_min       int NOT NULL DEFAULT 5 CHECK (k_anonymity_min >= 3),
  -- Janela
  collection_opens_at   timestamptz,
  collection_closes_at  timestamptz,
  -- Resp. técnico (assina o laudo — geralmente Jovane CRP)
  technical_lead_id     uuid REFERENCES profiles(id),
  technical_lead_crp    text,
  -- Pentagrama bridge (opcional)
  linked_diagnostic_id  uuid REFERENCES diagnostics(id) ON DELETE SET NULL,
  -- Auditoria
  created_at            timestamptz NOT NULL DEFAULT now(),
  updated_at            timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_assessments_company    ON nr01_assessments(company_id);
CREATE INDEX IF NOT EXISTS idx_nr01_assessments_consultant ON nr01_assessments(consultant_id);
CREATE INDEX IF NOT EXISTS idx_nr01_assessments_status     ON nr01_assessments(status);
CREATE INDEX IF NOT EXISTS idx_nr01_assessments_token      ON nr01_assessments(collection_token);
CREATE INDEX IF NOT EXISTS idx_nr01_assessments_diagnostic ON nr01_assessments(linked_diagnostic_id);


-- ============================================================
-- 4. nr01_invites — convites individuais (opcional)
--   Permite controle de adesão sem quebrar anonimato:
--   token é validado e marcado como "usado", mas nunca cruzado com a resposta.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_invites (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  invite_token  uuid UNIQUE NOT NULL DEFAULT gen_random_uuid(),
  invited_at    timestamptz NOT NULL DEFAULT now(),
  used_at       timestamptz,
  -- Cortes demográficos opcionais (para análise sem identificação)
  setor         text,
  funcao        text,
  vinculo       text,    -- CLT/PJ/estagio/terceirizado
  is_leader     boolean NOT NULL DEFAULT false,
  CONSTRAINT chk_invite_used_after CHECK (used_at IS NULL OR used_at >= invited_at)
);

CREATE INDEX IF NOT EXISTS idx_nr01_invites_assessment ON nr01_invites(assessment_id);
CREATE INDEX IF NOT EXISTS idx_nr01_invites_token      ON nr01_invites(invite_token);


-- ============================================================
-- 5. nr01_responses — resposta anônima (cabeçalho)
--   anon_id: UUID gerado no cliente, SEM FK. Anonimato inviolável.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id  uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  anon_id        uuid NOT NULL,                    -- UUID gerado no cliente — SEM FK
  -- Cortes demográficos auto-declarados (sempre opcionais; checagem de k-anonymity na consulta)
  setor          text,
  funcao         text,
  vinculo        text,
  tempo_casa    text,                              -- <1a, 1-3a, 3-5a, 5-10a, >10a
  is_leader      boolean NOT NULL DEFAULT false,
  -- Perguntas abertas (até 5 — opcionais; processadas por NLP)
  open_q1        text,
  open_q2        text,
  open_q3        text,
  open_q4        text,
  open_q5        text,
  -- Metadados
  instrument_version text NOT NULL,
  client_locale  text DEFAULT 'pt-BR',
  submitted_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_nr01_response UNIQUE (assessment_id, anon_id)
);

CREATE INDEX IF NOT EXISTS idx_nr01_responses_assessment ON nr01_responses(assessment_id);


-- ============================================================
-- 6. nr01_response_answers — resposta item-a-item
--   Estrutura long em vez de wide para permitir versionar instrumento
--   sem ALTER TABLE invasivo.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_response_answers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id  uuid NOT NULL REFERENCES nr01_responses(id) ON DELETE CASCADE,
  question_id  uuid NOT NULL REFERENCES nr01_questions(id) ON DELETE RESTRICT,
  value        smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  CONSTRAINT uq_response_answer UNIQUE (response_id, question_id)
);

CREATE INDEX IF NOT EXISTS idx_nr01_answers_response ON nr01_response_answers(response_id);
CREATE INDEX IF NOT EXISTS idx_nr01_answers_question ON nr01_response_answers(question_id);


-- ============================================================
-- 7. nr01_dimension_scores — snapshot por dimensão
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_dimension_scores (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id   uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  dimension_code  text NOT NULL REFERENCES nr01_dimensions(code),
  -- Score normalizado 0-100 (após inversão das reverse_scored)
  score_pct       numeric(5,2) NOT NULL CHECK (score_pct BETWEEN 0 AND 100),
  -- Classificação NR-01 de risco
  risk_level      text NOT NULL CHECK (risk_level IN (
                    'muito_baixo','baixo','atencao','elevado','critico','sem_dados'
                  )),
  -- Estatísticas
  mean_likert     numeric(4,2),
  median_likert   numeric(4,2),
  stddev_likert   numeric(4,2),
  n_respondents   int NOT NULL DEFAULT 0,
  -- Top 3 questões com pior score (jsonb com {question_id, mean, text})
  anchor_items    jsonb NOT NULL DEFAULT '[]',
  -- Justificativa textual gerada pelo agente IA
  ai_summary      text,
  ai_model_used   text,
  ai_generated_at timestamptz,
  -- Auditoria
  calculated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_dim_score UNIQUE (assessment_id, dimension_code)
);

CREATE INDEX IF NOT EXISTS idx_nr01_dim_scores_assessment ON nr01_dimension_scores(assessment_id);


-- ============================================================
-- 8. nr01_assessment_results — snapshot global
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_assessment_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       uuid NOT NULL UNIQUE REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  -- ISO — Índice de Saúde Organizacional (0-100)
  iso_score           numeric(5,2) NOT NULL CHECK (iso_score BETWEEN 0 AND 100),
  iso_risk_level      text NOT NULL CHECK (iso_risk_level IN (
                        'muito_baixo','baixo','atencao','elevado','critico','sem_dados'
                      )),
  -- Adesão
  total_invites       int NOT NULL DEFAULT 0,
  total_responses     int NOT NULL DEFAULT 0,
  adherence_pct       numeric(5,2),
  -- Alertas sistêmicos (jsonb com array de objetos {tipo, descricao, dimensoes, severidade})
  systemic_alerts     jsonb NOT NULL DEFAULT '[]',
  -- Texto do laudo macro gerado pela IA (revisado pelo responsável técnico)
  macro_report_text   text,
  macro_report_status text NOT NULL DEFAULT 'rascunho' CHECK (macro_report_status IN (
                        'rascunho','revisado','assinado'
                      )),
  -- Bridge Pentagrama (opcional)
  pentagrama_correlation jsonb,                -- jsonb com mapeamento dimensão NR-01 ↔ dimensão Pentagrama
  -- Metadados
  ic_weight           numeric(3,2) NOT NULL DEFAULT 1.00,
  calculated_at       timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 9. nr01_evidence_pack — pacote auditável imutável
--   Hash SHA-256 + carimbo de tempo. O fiscal abre isso primeiro.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_evidence_pack (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id            uuid NOT NULL UNIQUE REFERENCES nr01_assessments(id) ON DELETE RESTRICT,
  -- Hash do instrumento aplicado (prova qual versão foi usada)
  instrument_sha256        text NOT NULL,
  -- Metadados de coleta
  collection_started_at    timestamptz NOT NULL,
  collection_ended_at      timestamptz NOT NULL,
  total_invites_sent       int NOT NULL,
  total_responses_complete int NOT NULL,
  adherence_pct            numeric(5,2) NOT NULL,
  -- Metodologia declarada (texto canônico — anexado ao PGR)
  methodology_text         text NOT NULL,
  methodology_version      text NOT NULL DEFAULT 'v1.0',
  -- Assinaturas
  technical_lead_name      text NOT NULL,
  technical_lead_crp       text,
  signed_at                timestamptz,
  signature_hash           text,                  -- hash da assinatura digital
  signature_method         text CHECK (signature_method IN ('icp_brasil','platform_internal','external')),
  -- Carimbo de tempo confiável (RFC 3161)
  timestamp_authority      text,
  timestamp_token          text,
  -- Hash global do pacote (todos os campos acima + lista ordenada de hashes de respostas)
  pack_sha256              text NOT NULL,
  -- Auditoria
  generated_at             timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_evidence_assessment ON nr01_evidence_pack(assessment_id);


-- ============================================================
-- 10. nr01_intervention_library — biblioteca curada (seed)
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_intervention_library (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code                text UNIQUE NOT NULL,           -- ex: "INT-CARGA-001"
  dimension_code      text NOT NULL REFERENCES nr01_dimensions(code),
  applicable_levels   text[] NOT NULL,                -- ex: ARRAY['atencao','elevado','critico']
  company_size        text NOT NULL DEFAULT 'qualquer' CHECK (company_size IN (
                        'qualquer','pequena','media','grande'
                      )),
  title               text NOT NULL,
  description         text NOT NULL,
  rollout_steps       jsonb NOT NULL DEFAULT '[]',
  expected_impact_pct numeric(4,1),                   -- ganho esperado no score da dimensão
  typical_duration_days int,
  cost_band           text CHECK (cost_band IN ('baixo','medio','alto')),
  evidence_refs       jsonb NOT NULL DEFAULT '[]',    -- array de strings com referências
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_intlib_dim   ON nr01_intervention_library(dimension_code);


-- ============================================================
-- 11. nr01_action_plans — plano de ação da avaliação
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_action_plans (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id uuid NOT NULL UNIQUE REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  status        text NOT NULL DEFAULT 'rascunho' CHECK (status IN (
                  'rascunho','aprovado','em_execucao','revisao','concluido'
                )),
  approved_by   uuid REFERENCES profiles(id),
  approved_at   timestamptz,
  next_review_at date,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 12. nr01_action_items — item PDCA do plano
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_action_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  action_plan_id     uuid NOT NULL REFERENCES nr01_action_plans(id) ON DELETE CASCADE,
  dimension_code     text NOT NULL REFERENCES nr01_dimensions(code),
  intervention_id    uuid REFERENCES nr01_intervention_library(id),
  -- Atribuição
  owner_name         text NOT NULL,
  owner_email        text,
  -- Conteúdo
  title              text NOT NULL,
  description        text,
  kpi                text,                       -- métrica de sucesso
  -- Cronograma
  due_date           date NOT NULL,
  priority           text NOT NULL DEFAULT 'P2' CHECK (priority IN ('P1','P2','P3')),
  estimated_cost_brl numeric(12,2),
  -- PDCA
  status             text NOT NULL DEFAULT 'pendente' CHECK (status IN (
                       'pendente','em_andamento','bloqueado','concluido','cancelado'
                     )),
  check_30d_at       timestamptz,
  check_60d_at       timestamptz,
  check_90d_at       timestamptz,
  completion_notes   text,
  completed_at       timestamptz,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_actions_plan      ON nr01_action_items(action_plan_id);
CREATE INDEX IF NOT EXISTS idx_nr01_actions_due       ON nr01_action_items(due_date);
CREATE INDEX IF NOT EXISTS idx_nr01_actions_status    ON nr01_action_items(status);


-- ============================================================
-- 13. nr01_economic_inputs — parâmetros do cliente
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_economic_inputs (
  id                          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id               uuid NOT NULL UNIQUE REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  -- Folha
  total_workers               int NOT NULL CHECK (total_workers > 0),
  avg_monthly_salary_brl      numeric(12,2) NOT NULL CHECK (avg_monthly_salary_brl >= 0),
  total_payroll_brl_year      numeric(14,2) GENERATED ALWAYS AS (
                                avg_monthly_salary_brl * total_workers * 13.33    -- 12 + 13º + 1/3 férias
                              ) STORED,
  -- Saúde ocupacional
  cid_f_absences_last_year    int NOT NULL DEFAULT 0,
  avg_absence_days            numeric(5,1) NOT NULL DEFAULT 15.0,
  voluntary_turnover_pct      numeric(4,1) NOT NULL DEFAULT 0,
  -- RAT/FAP
  rat_aliquot_pct             numeric(3,1) NOT NULL DEFAULT 1.0 CHECK (rat_aliquot_pct IN (1.0,2.0,3.0)),
  fap_multiplier              numeric(3,2) NOT NULL DEFAULT 1.00 CHECK (fap_multiplier BETWEEN 0.5 AND 2.0),
  -- Litigância (passivo médio em aberto)
  active_lawsuits             int NOT NULL DEFAULT 0,
  avg_lawsuit_provision_brl   numeric(12,2) NOT NULL DEFAULT 0,
  -- Programa
  program_annual_cost_brl     numeric(12,2) NOT NULL DEFAULT 0,
  -- Auditoria
  created_at                  timestamptz NOT NULL DEFAULT now(),
  updated_at                  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 14. nr01_economic_projections — saída do motor (3 cenários × 7 vetores)
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_economic_projections (
  id                       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id            uuid NOT NULL UNIQUE REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  -- Cenário NÃO AGIR (12 meses)
  na_fines_exposure_brl    numeric(14,2) NOT NULL DEFAULT 0,
  na_absence_cost_brl      numeric(14,2) NOT NULL DEFAULT 0,
  na_turnover_cost_brl     numeric(14,2) NOT NULL DEFAULT 0,
  na_productivity_loss_brl numeric(14,2) NOT NULL DEFAULT 0,
  na_fap_extra_cost_brl    numeric(14,2) NOT NULL DEFAULT 0,
  na_litigation_risk_brl   numeric(14,2) NOT NULL DEFAULT 0,
  na_total_brl             numeric(14,2) NOT NULL DEFAULT 0,
  -- Cenário AGIR PARCIAL (12 meses)
  ap_total_savings_brl     numeric(14,2) NOT NULL DEFAULT 0,
  ap_program_cost_brl      numeric(14,2) NOT NULL DEFAULT 0,
  ap_net_brl               numeric(14,2) NOT NULL DEFAULT 0,
  -- Cenário AGIR INTEGRAL (12 meses)
  ai_total_savings_brl     numeric(14,2) NOT NULL DEFAULT 0,
  ai_program_cost_brl      numeric(14,2) NOT NULL DEFAULT 0,
  ai_net_brl               numeric(14,2) NOT NULL DEFAULT 0,
  ai_roi_pct               numeric(6,1),
  ai_payback_months        numeric(4,1),
  -- 36 meses
  ai_3y_total_savings_brl  numeric(14,2),
  ai_3y_total_cost_brl     numeric(14,2),
  ai_3y_roi_pct            numeric(7,1),
  -- Premissas usadas (jsonb para auditoria do cálculo)
  assumptions              jsonb NOT NULL DEFAULT '{}',
  calculated_at            timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 15. nr01_audit_log — trilha imutável de eventos
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_audit_log (
  id            bigserial PRIMARY KEY,
  assessment_id uuid REFERENCES nr01_assessments(id) ON DELETE SET NULL,
  actor_id      uuid REFERENCES profiles(id) ON DELETE SET NULL,
  actor_role    text,
  event_type    text NOT NULL,            -- ex: 'ASSESSMENT_CREATED', 'INVITES_SENT', 'RESPONSE_SUBMITTED', 'PACK_SIGNED'
  payload       jsonb NOT NULL DEFAULT '{}',
  ip_hash       text,                     -- SHA-256 do IP (LGPD)
  user_agent    text,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_audit_assessment ON nr01_audit_log(assessment_id);
CREATE INDEX IF NOT EXISTS idx_nr01_audit_event      ON nr01_audit_log(event_type);
CREATE INDEX IF NOT EXISTS idx_nr01_audit_created    ON nr01_audit_log(created_at);


-- ============================================================
-- 16. nr01_pentagrama_bridge — cruzamento opcional
--   Mapeia uma avaliação NR-01 a um diagnostic do Pentagrama
--   e armazena correlações inter-modelo já calculadas.
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_pentagrama_bridge (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id       uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  diagnostic_id       uuid NOT NULL REFERENCES diagnostics(id) ON DELETE CASCADE,
  -- Matriz de correlação dimensional (jsonb com { nr01_dim → { pentagrama_dim → r } })
  correlation_matrix  jsonb NOT NULL DEFAULT '{}',
  -- Convergências e divergências (jsonb com lista de findings)
  convergences        jsonb NOT NULL DEFAULT '[]',
  divergences         jsonb NOT NULL DEFAULT '[]',
  -- Score combinado (média ponderada NR-01 ISO + Pentagrama IC global)
  combined_score      numeric(5,2),
  combined_level      text CHECK (combined_level IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  computed_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_bridge UNIQUE (assessment_id, diagnostic_id)
);

CREATE INDEX IF NOT EXISTS idx_nr01_bridge_diag       ON nr01_pentagrama_bridge(diagnostic_id);
CREATE INDEX IF NOT EXISTS idx_nr01_bridge_assessment ON nr01_pentagrama_bridge(assessment_id);


-- ============================================================
-- 17. nr01_micro_pulses — monitoramento contínuo
-- ============================================================
CREATE TABLE IF NOT EXISTS nr01_micro_pulses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  dimension_code  text NOT NULL REFERENCES nr01_dimensions(code),
  question_id     uuid NOT NULL REFERENCES nr01_questions(id),
  anon_id         uuid NOT NULL,                   -- sem FK (consistente com responses)
  value           smallint NOT NULL CHECK (value BETWEEN 1 AND 5),
  pulse_week      date NOT NULL,                   -- bucket semanal para agregação
  submitted_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_nr01_pulses_company ON nr01_micro_pulses(company_id);
CREATE INDEX IF NOT EXISTS idx_nr01_pulses_week    ON nr01_micro_pulses(pulse_week);
CREATE INDEX IF NOT EXISTS idx_nr01_pulses_dim     ON nr01_micro_pulses(dimension_code);


-- ============================================================
-- 18. TRIGGERS
-- ============================================================
DROP TRIGGER IF EXISTS trg_nr01_assessments_updated_at ON nr01_assessments;
CREATE TRIGGER trg_nr01_assessments_updated_at
  BEFORE UPDATE ON nr01_assessments
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nr01_action_plans_updated_at ON nr01_action_plans;
CREATE TRIGGER trg_nr01_action_plans_updated_at
  BEFORE UPDATE ON nr01_action_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nr01_action_items_updated_at ON nr01_action_items;
CREATE TRIGGER trg_nr01_action_items_updated_at
  BEFORE UPDATE ON nr01_action_items
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

DROP TRIGGER IF EXISTS trg_nr01_economic_inputs_updated_at ON nr01_economic_inputs;
CREATE TRIGGER trg_nr01_economic_inputs_updated_at
  BEFORE UPDATE ON nr01_economic_inputs
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- VIEW: agregação k-anonymity-safe por setor/funcao
--   Usar SEMPRE em consultas — nunca consultar nr01_responses direto.
-- ============================================================
CREATE OR REPLACE VIEW nr01_dim_scores_safe AS
SELECT
  ds.assessment_id,
  ds.dimension_code,
  ds.score_pct,
  ds.risk_level,
  ds.n_respondents,
  ds.calculated_at
FROM nr01_dimension_scores ds
WHERE ds.n_respondents >= 5;

COMMENT ON VIEW nr01_dim_scores_safe IS
  'View agregada k-anonymity ≥ 5. Use em vez de nr01_dimension_scores quando expor a líderes ou exports.';


-- ============================================================
-- VERIFICAÇÃO FINAL
--   SELECT table_name FROM information_schema.tables
--   WHERE table_schema = 'public' AND table_name LIKE 'nr01_%'
--   ORDER BY table_name;
-- ============================================================
