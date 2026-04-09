-- ============================================================
-- QUANTUM5G — Pentagrama de Ginger | Schema SQL
-- Versão: 1.1 | Data: 2026-03-24
-- Executar no Supabase SQL Editor (Dashboard > SQL Editor)
--
-- ORDEM DE CRIAÇÃO (dependências):
--   1. profiles          → depende de auth.users
--   2. companies         → depende de profiles
--   3. diagnostics       → depende de companies, profiles
--   4. laudos            → independente (criada ANTES de diagnostic_results)
--   5. il_responses      → depende de diagnostics
--   6. ic_responses      → depende de diagnostics
--   7. diagnostic_results→ depende de diagnostics + laudos
--   8. Triggers
-- ============================================================

-- ============================================================
-- EXTENSÕES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";


-- ============================================================
-- 1. TABELA: profiles
-- Vinculada ao Supabase Auth. Criada via trigger após signup.
-- ============================================================
CREATE TABLE IF NOT EXISTS profiles (
  id          uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role        text NOT NULL CHECK (role IN ('admin', 'consultant', 'leader', 'collaborator')),
  name        text,
  email       text,
  is_active   boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger: criar profile automaticamente após signup no Supabase Auth
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO profiles (id, role, name, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'role', 'consultant'),
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    NEW.email
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();


-- ============================================================
-- 2. TABELA: companies
-- Empresas cadastradas por consultores.
-- ============================================================
CREATE TABLE IF NOT EXISTS companies (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name                 text NOT NULL,
  total_collaborators  int NOT NULL DEFAULT 0 CHECK (total_collaborators >= 0),
  consultant_id        uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_companies_consultant ON companies(consultant_id);


-- ============================================================
-- 3. TABELA: diagnostics
-- Diagnóstico organizacional. Um por empresa por período.
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostics (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE RESTRICT,
  consultant_id    uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  name             text NOT NULL,
  leader_name      text,
  leader_email     text,
  status           text NOT NULL DEFAULT 'CRIADO' CHECK (status IN (
                     'CRIADO',
                     'AGUARDANDO_IL',
                     'COLETANDO_IC',
                     'ENCERRADO',
                     'RELATORIO_GERADO',
                     'ARQUIVADO'
                   )),
  il_token         uuid UNIQUE DEFAULT gen_random_uuid(),
  ic_token         uuid UNIQUE DEFAULT gen_random_uuid(),
  il_submitted_at  timestamptz,
  ic_closed_at     timestamptz,
  il_deadline      date,
  ic_deadline      date,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_diagnostics_consultant ON diagnostics(consultant_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_company    ON diagnostics(company_id);
CREATE INDEX IF NOT EXISTS idx_diagnostics_status     ON diagnostics(status);
CREATE INDEX IF NOT EXISTS idx_diagnostics_il_token   ON diagnostics(il_token);
CREATE INDEX IF NOT EXISTS idx_diagnostics_ic_token   ON diagnostics(ic_token);


-- ============================================================
-- 4. TABELA: laudos
-- DEVE vir antes de diagnostic_results (FK depende dela).
-- 21 registros fixos — inseridos via seed.sql.
-- NUNCA gerados dinamicamente.
-- ============================================================
CREATE TABLE IF NOT EXISTS laudos (
  id       uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimensao text NOT NULL CHECK (dimensao IN ('fisica','afetiva','racional','social','cultural','indisponivel')),
  nivel    text NOT NULL CHECK (nivel    IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  texto    text NOT NULL,
  CONSTRAINT uq_laudo UNIQUE (dimensao, nivel)
);


-- ============================================================
-- 5. TABELA: il_responses
-- Respostas do Instrumento de Liderança (1 por diagnóstico).
-- ============================================================
CREATE TABLE IF NOT EXISTS il_responses (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id  uuid NOT NULL UNIQUE REFERENCES diagnostics(id) ON DELETE CASCADE,
  -- Dimensão Física (Q1–Q25)
  q1  int CHECK (q1  BETWEEN 1 AND 5), q2  int CHECK (q2  BETWEEN 1 AND 5),
  q3  int CHECK (q3  BETWEEN 1 AND 5), q4  int CHECK (q4  BETWEEN 1 AND 5),
  q5  int CHECK (q5  BETWEEN 1 AND 5), q6  int CHECK (q6  BETWEEN 1 AND 5),
  q7  int CHECK (q7  BETWEEN 1 AND 5), q8  int CHECK (q8  BETWEEN 1 AND 5),
  q9  int CHECK (q9  BETWEEN 1 AND 5), q10 int CHECK (q10 BETWEEN 1 AND 5),
  q11 int CHECK (q11 BETWEEN 1 AND 5), q12 int CHECK (q12 BETWEEN 1 AND 5),
  q13 int CHECK (q13 BETWEEN 1 AND 5), q14 int CHECK (q14 BETWEEN 1 AND 5),
  q15 int CHECK (q15 BETWEEN 1 AND 5), q16 int CHECK (q16 BETWEEN 1 AND 5),
  q17 int CHECK (q17 BETWEEN 1 AND 5), q18 int CHECK (q18 BETWEEN 1 AND 5),
  q19 int CHECK (q19 BETWEEN 1 AND 5), q20 int CHECK (q20 BETWEEN 1 AND 5),
  q21 int CHECK (q21 BETWEEN 1 AND 5), q22 int CHECK (q22 BETWEEN 1 AND 5),
  q23 int CHECK (q23 BETWEEN 1 AND 5), q24 int CHECK (q24 BETWEEN 1 AND 5),
  q25 int CHECK (q25 BETWEEN 1 AND 5),
  -- Dimensão Afetiva (Q26–Q50)
  q26 int CHECK (q26 BETWEEN 1 AND 5), q27 int CHECK (q27 BETWEEN 1 AND 5),
  q28 int CHECK (q28 BETWEEN 1 AND 5), q29 int CHECK (q29 BETWEEN 1 AND 5),
  q30 int CHECK (q30 BETWEEN 1 AND 5), q31 int CHECK (q31 BETWEEN 1 AND 5),
  q32 int CHECK (q32 BETWEEN 1 AND 5), q33 int CHECK (q33 BETWEEN 1 AND 5),
  q34 int CHECK (q34 BETWEEN 1 AND 5), q35 int CHECK (q35 BETWEEN 1 AND 5),
  q36 int CHECK (q36 BETWEEN 1 AND 5), q37 int CHECK (q37 BETWEEN 1 AND 5),
  q38 int CHECK (q38 BETWEEN 1 AND 5), q39 int CHECK (q39 BETWEEN 1 AND 5),
  q40 int CHECK (q40 BETWEEN 1 AND 5), q41 int CHECK (q41 BETWEEN 1 AND 5),
  q42 int CHECK (q42 BETWEEN 1 AND 5), q43 int CHECK (q43 BETWEEN 1 AND 5),
  q44 int CHECK (q44 BETWEEN 1 AND 5), q45 int CHECK (q45 BETWEEN 1 AND 5),
  q46 int CHECK (q46 BETWEEN 1 AND 5), q47 int CHECK (q47 BETWEEN 1 AND 5),
  q48 int CHECK (q48 BETWEEN 1 AND 5), q49 int CHECK (q49 BETWEEN 1 AND 5),
  q50 int CHECK (q50 BETWEEN 1 AND 5),
  -- Dimensão Racional (Q51–Q75)
  q51 int CHECK (q51 BETWEEN 1 AND 5), q52 int CHECK (q52 BETWEEN 1 AND 5),
  q53 int CHECK (q53 BETWEEN 1 AND 5), q54 int CHECK (q54 BETWEEN 1 AND 5),
  q55 int CHECK (q55 BETWEEN 1 AND 5), q56 int CHECK (q56 BETWEEN 1 AND 5),
  q57 int CHECK (q57 BETWEEN 1 AND 5), q58 int CHECK (q58 BETWEEN 1 AND 5),
  q59 int CHECK (q59 BETWEEN 1 AND 5), q60 int CHECK (q60 BETWEEN 1 AND 5),
  q61 int CHECK (q61 BETWEEN 1 AND 5), q62 int CHECK (q62 BETWEEN 1 AND 5),
  q63 int CHECK (q63 BETWEEN 1 AND 5), q64 int CHECK (q64 BETWEEN 1 AND 5),
  q65 int CHECK (q65 BETWEEN 1 AND 5), q66 int CHECK (q66 BETWEEN 1 AND 5),
  q67 int CHECK (q67 BETWEEN 1 AND 5), q68 int CHECK (q68 BETWEEN 1 AND 5),
  q69 int CHECK (q69 BETWEEN 1 AND 5), q70 int CHECK (q70 BETWEEN 1 AND 5),
  q71 int CHECK (q71 BETWEEN 1 AND 5), q72 int CHECK (q72 BETWEEN 1 AND 5),
  q73 int CHECK (q73 BETWEEN 1 AND 5), q74 int CHECK (q74 BETWEEN 1 AND 5),
  q75 int CHECK (q75 BETWEEN 1 AND 5),
  -- Dimensão Social (Q76–Q100)
  q76  int CHECK (q76  BETWEEN 1 AND 5), q77  int CHECK (q77  BETWEEN 1 AND 5),
  q78  int CHECK (q78  BETWEEN 1 AND 5), q79  int CHECK (q79  BETWEEN 1 AND 5),
  q80  int CHECK (q80  BETWEEN 1 AND 5), q81  int CHECK (q81  BETWEEN 1 AND 5),
  q82  int CHECK (q82  BETWEEN 1 AND 5), q83  int CHECK (q83  BETWEEN 1 AND 5),
  q84  int CHECK (q84  BETWEEN 1 AND 5), q85  int CHECK (q85  BETWEEN 1 AND 5),
  q86  int CHECK (q86  BETWEEN 1 AND 5), q87  int CHECK (q87  BETWEEN 1 AND 5),
  q88  int CHECK (q88  BETWEEN 1 AND 5), q89  int CHECK (q89  BETWEEN 1 AND 5),
  q90  int CHECK (q90  BETWEEN 1 AND 5), q91  int CHECK (q91  BETWEEN 1 AND 5),
  q92  int CHECK (q92  BETWEEN 1 AND 5), q93  int CHECK (q93  BETWEEN 1 AND 5),
  q94  int CHECK (q94  BETWEEN 1 AND 5), q95  int CHECK (q95  BETWEEN 1 AND 5),
  q96  int CHECK (q96  BETWEEN 1 AND 5), q97  int CHECK (q97  BETWEEN 1 AND 5),
  q98  int CHECK (q98  BETWEEN 1 AND 5), q99  int CHECK (q99  BETWEEN 1 AND 5),
  q100 int CHECK (q100 BETWEEN 1 AND 5),
  -- Dimensão Cultural (Q101–Q125)
  q101 int CHECK (q101 BETWEEN 1 AND 5), q102 int CHECK (q102 BETWEEN 1 AND 5),
  q103 int CHECK (q103 BETWEEN 1 AND 5), q104 int CHECK (q104 BETWEEN 1 AND 5),
  q105 int CHECK (q105 BETWEEN 1 AND 5), q106 int CHECK (q106 BETWEEN 1 AND 5),
  q107 int CHECK (q107 BETWEEN 1 AND 5), q108 int CHECK (q108 BETWEEN 1 AND 5),
  q109 int CHECK (q109 BETWEEN 1 AND 5), q110 int CHECK (q110 BETWEEN 1 AND 5),
  q111 int CHECK (q111 BETWEEN 1 AND 5), q112 int CHECK (q112 BETWEEN 1 AND 5),
  q113 int CHECK (q113 BETWEEN 1 AND 5), q114 int CHECK (q114 BETWEEN 1 AND 5),
  q115 int CHECK (q115 BETWEEN 1 AND 5), q116 int CHECK (q116 BETWEEN 1 AND 5),
  q117 int CHECK (q117 BETWEEN 1 AND 5), q118 int CHECK (q118 BETWEEN 1 AND 5),
  q119 int CHECK (q119 BETWEEN 1 AND 5), q120 int CHECK (q120 BETWEEN 1 AND 5),
  q121 int CHECK (q121 BETWEEN 1 AND 5), q122 int CHECK (q122 BETWEEN 1 AND 5),
  q123 int CHECK (q123 BETWEEN 1 AND 5), q124 int CHECK (q124 BETWEEN 1 AND 5),
  q125 int CHECK (q125 BETWEEN 1 AND 5),
  submitted_at  timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 6. TABELA: ic_responses
-- REGRA INVIOLÁVEL: respondente_anonimo_id NÃO tem FK para
-- nenhuma tabela de usuários. Anonimato total garantido.
-- ============================================================
CREATE TABLE IF NOT EXISTS ic_responses (
  id                     uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id          uuid NOT NULL REFERENCES diagnostics(id) ON DELETE CASCADE,
  respondente_anonimo_id uuid NOT NULL, -- UUID gerado no cliente — SEM FK — NUNCA ALTERAR
  -- Dimensão Física (Q1–Q25)
  q1  int CHECK (q1  BETWEEN 1 AND 5), q2  int CHECK (q2  BETWEEN 1 AND 5),
  q3  int CHECK (q3  BETWEEN 1 AND 5), q4  int CHECK (q4  BETWEEN 1 AND 5),
  q5  int CHECK (q5  BETWEEN 1 AND 5), q6  int CHECK (q6  BETWEEN 1 AND 5),
  q7  int CHECK (q7  BETWEEN 1 AND 5), q8  int CHECK (q8  BETWEEN 1 AND 5),
  q9  int CHECK (q9  BETWEEN 1 AND 5), q10 int CHECK (q10 BETWEEN 1 AND 5),
  q11 int CHECK (q11 BETWEEN 1 AND 5), q12 int CHECK (q12 BETWEEN 1 AND 5),
  q13 int CHECK (q13 BETWEEN 1 AND 5), q14 int CHECK (q14 BETWEEN 1 AND 5),
  q15 int CHECK (q15 BETWEEN 1 AND 5), q16 int CHECK (q16 BETWEEN 1 AND 5),
  q17 int CHECK (q17 BETWEEN 1 AND 5), q18 int CHECK (q18 BETWEEN 1 AND 5),
  q19 int CHECK (q19 BETWEEN 1 AND 5), q20 int CHECK (q20 BETWEEN 1 AND 5),
  q21 int CHECK (q21 BETWEEN 1 AND 5), q22 int CHECK (q22 BETWEEN 1 AND 5),
  q23 int CHECK (q23 BETWEEN 1 AND 5), q24 int CHECK (q24 BETWEEN 1 AND 5),
  q25 int CHECK (q25 BETWEEN 1 AND 5),
  -- Dimensão Afetiva (Q26–Q50)
  q26 int CHECK (q26 BETWEEN 1 AND 5), q27 int CHECK (q27 BETWEEN 1 AND 5),
  q28 int CHECK (q28 BETWEEN 1 AND 5), q29 int CHECK (q29 BETWEEN 1 AND 5),
  q30 int CHECK (q30 BETWEEN 1 AND 5), q31 int CHECK (q31 BETWEEN 1 AND 5),
  q32 int CHECK (q32 BETWEEN 1 AND 5), q33 int CHECK (q33 BETWEEN 1 AND 5),
  q34 int CHECK (q34 BETWEEN 1 AND 5), q35 int CHECK (q35 BETWEEN 1 AND 5),
  q36 int CHECK (q36 BETWEEN 1 AND 5), q37 int CHECK (q37 BETWEEN 1 AND 5),
  q38 int CHECK (q38 BETWEEN 1 AND 5), q39 int CHECK (q39 BETWEEN 1 AND 5),
  q40 int CHECK (q40 BETWEEN 1 AND 5), q41 int CHECK (q41 BETWEEN 1 AND 5),
  q42 int CHECK (q42 BETWEEN 1 AND 5), q43 int CHECK (q43 BETWEEN 1 AND 5),
  q44 int CHECK (q44 BETWEEN 1 AND 5), q45 int CHECK (q45 BETWEEN 1 AND 5),
  q46 int CHECK (q46 BETWEEN 1 AND 5), q47 int CHECK (q47 BETWEEN 1 AND 5),
  q48 int CHECK (q48 BETWEEN 1 AND 5), q49 int CHECK (q49 BETWEEN 1 AND 5),
  q50 int CHECK (q50 BETWEEN 1 AND 5),
  -- Dimensão Racional (Q51–Q75)
  q51 int CHECK (q51 BETWEEN 1 AND 5), q52 int CHECK (q52 BETWEEN 1 AND 5),
  q53 int CHECK (q53 BETWEEN 1 AND 5), q54 int CHECK (q54 BETWEEN 1 AND 5),
  q55 int CHECK (q55 BETWEEN 1 AND 5), q56 int CHECK (q56 BETWEEN 1 AND 5),
  q57 int CHECK (q57 BETWEEN 1 AND 5), q58 int CHECK (q58 BETWEEN 1 AND 5),
  q59 int CHECK (q59 BETWEEN 1 AND 5), q60 int CHECK (q60 BETWEEN 1 AND 5),
  q61 int CHECK (q61 BETWEEN 1 AND 5), q62 int CHECK (q62 BETWEEN 1 AND 5),
  q63 int CHECK (q63 BETWEEN 1 AND 5), q64 int CHECK (q64 BETWEEN 1 AND 5),
  q65 int CHECK (q65 BETWEEN 1 AND 5), q66 int CHECK (q66 BETWEEN 1 AND 5),
  q67 int CHECK (q67 BETWEEN 1 AND 5), q68 int CHECK (q68 BETWEEN 1 AND 5),
  q69 int CHECK (q69 BETWEEN 1 AND 5), q70 int CHECK (q70 BETWEEN 1 AND 5),
  q71 int CHECK (q71 BETWEEN 1 AND 5), q72 int CHECK (q72 BETWEEN 1 AND 5),
  q73 int CHECK (q73 BETWEEN 1 AND 5), q74 int CHECK (q74 BETWEEN 1 AND 5),
  q75 int CHECK (q75 BETWEEN 1 AND 5),
  -- Dimensão Social (Q76–Q100)
  q76  int CHECK (q76  BETWEEN 1 AND 5), q77  int CHECK (q77  BETWEEN 1 AND 5),
  q78  int CHECK (q78  BETWEEN 1 AND 5), q79  int CHECK (q79  BETWEEN 1 AND 5),
  q80  int CHECK (q80  BETWEEN 1 AND 5), q81  int CHECK (q81  BETWEEN 1 AND 5),
  q82  int CHECK (q82  BETWEEN 1 AND 5), q83  int CHECK (q83  BETWEEN 1 AND 5),
  q84  int CHECK (q84  BETWEEN 1 AND 5), q85  int CHECK (q85  BETWEEN 1 AND 5),
  q86  int CHECK (q86  BETWEEN 1 AND 5), q87  int CHECK (q87  BETWEEN 1 AND 5),
  q88  int CHECK (q88  BETWEEN 1 AND 5), q89  int CHECK (q89  BETWEEN 1 AND 5),
  q90  int CHECK (q90  BETWEEN 1 AND 5), q91  int CHECK (q91  BETWEEN 1 AND 5),
  q92  int CHECK (q92  BETWEEN 1 AND 5), q93  int CHECK (q93  BETWEEN 1 AND 5),
  q94  int CHECK (q94  BETWEEN 1 AND 5), q95  int CHECK (q95  BETWEEN 1 AND 5),
  q96  int CHECK (q96  BETWEEN 1 AND 5), q97  int CHECK (q97  BETWEEN 1 AND 5),
  q98  int CHECK (q98  BETWEEN 1 AND 5), q99  int CHECK (q99  BETWEEN 1 AND 5),
  q100 int CHECK (q100 BETWEEN 1 AND 5),
  -- Dimensão Cultural (Q101–Q125)
  q101 int CHECK (q101 BETWEEN 1 AND 5), q102 int CHECK (q102 BETWEEN 1 AND 5),
  q103 int CHECK (q103 BETWEEN 1 AND 5), q104 int CHECK (q104 BETWEEN 1 AND 5),
  q105 int CHECK (q105 BETWEEN 1 AND 5), q106 int CHECK (q106 BETWEEN 1 AND 5),
  q107 int CHECK (q107 BETWEEN 1 AND 5), q108 int CHECK (q108 BETWEEN 1 AND 5),
  q109 int CHECK (q109 BETWEEN 1 AND 5), q110 int CHECK (q110 BETWEEN 1 AND 5),
  q111 int CHECK (q111 BETWEEN 1 AND 5), q112 int CHECK (q112 BETWEEN 1 AND 5),
  q113 int CHECK (q113 BETWEEN 1 AND 5), q114 int CHECK (q114 BETWEEN 1 AND 5),
  q115 int CHECK (q115 BETWEEN 1 AND 5), q116 int CHECK (q116 BETWEEN 1 AND 5),
  q117 int CHECK (q117 BETWEEN 1 AND 5), q118 int CHECK (q118 BETWEEN 1 AND 5),
  q119 int CHECK (q119 BETWEEN 1 AND 5), q120 int CHECK (q120 BETWEEN 1 AND 5),
  q121 int CHECK (q121 BETWEEN 1 AND 5), q122 int CHECK (q122 BETWEEN 1 AND 5),
  q123 int CHECK (q123 BETWEEN 1 AND 5), q124 int CHECK (q124 BETWEEN 1 AND 5),
  q125 int CHECK (q125 BETWEEN 1 AND 5),
  submitted_at  timestamptz NOT NULL DEFAULT now(),
  -- Unicidade: um respondente anônimo não pode enviar duas vezes no mesmo diagnóstico
  CONSTRAINT uq_ic_response UNIQUE (diagnostic_id, respondente_anonimo_id)
);

CREATE INDEX IF NOT EXISTS idx_ic_responses_diagnostic ON ic_responses(diagnostic_id);


-- ============================================================
-- 7. TABELA: diagnostic_results
-- Snapshot imutável do cálculo. Gerado pela Edge Function.
-- Depende de: diagnostics (criada em 3) e laudos (criada em 4).
-- ============================================================
CREATE TABLE IF NOT EXISTS diagnostic_results (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id       uuid NOT NULL UNIQUE REFERENCES diagnostics(id) ON DELETE CASCADE,
  -- Scores IC por dimensão (%)
  ic_fisica_pct       numeric(5,2),
  ic_afetiva_pct      numeric(5,2),
  ic_racional_pct     numeric(5,2),
  ic_social_pct       numeric(5,2),
  ic_cultural_pct     numeric(5,2),
  ic_global_pct       numeric(5,2),
  -- Scores IL por dimensão (%)
  il_fisica_pct       numeric(5,2),
  il_afetiva_pct      numeric(5,2),
  il_racional_pct     numeric(5,2),
  il_social_pct       numeric(5,2),
  il_cultural_pct     numeric(5,2),
  il_global_pct       numeric(5,2),
  -- Scores combinados por dimensão (%)
  combined_fisica_pct    numeric(5,2),
  combined_afetiva_pct   numeric(5,2),
  combined_racional_pct  numeric(5,2),
  combined_social_pct    numeric(5,2),
  combined_cultural_pct  numeric(5,2),
  combined_global_pct    numeric(5,2),
  -- Gaps por dimensão (IL% - IC%)
  gap_fisica     numeric(5,2),
  gap_afetiva    numeric(5,2),
  gap_racional   numeric(5,2),
  gap_social     numeric(5,2),
  gap_cultural   numeric(5,2),
  -- Níveis classificados pelo IC (DECISÃO 003)
  nivel_ic_fisica     text CHECK (nivel_ic_fisica    IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  nivel_ic_afetiva    text CHECK (nivel_ic_afetiva   IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  nivel_ic_racional   text CHECK (nivel_ic_racional  IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  nivel_ic_social     text CHECK (nivel_ic_social    IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  nivel_ic_cultural   text CHECK (nivel_ic_cultural  IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  nivel_combined      text CHECK (nivel_combined     IN ('critico','vulneravel','saudavel','excelente','sem_dados')),
  -- Scores de bloco IC (%) — blocos reais do instrumento (DECISÃO 001)
  -- Física: F-A(Q1-8), F-B(Q9-16), F-C(Q17-25)
  ic_bloco_fa_pct  numeric(5,2), ic_bloco_fb_pct  numeric(5,2), ic_bloco_fc_pct  numeric(5,2),
  -- Afetiva: A-1(Q26-30), A-2(Q31-35), A-3(Q36-40), A-4(Q41-45), A-5(Q46-50)
  ic_bloco_a1_pct  numeric(5,2), ic_bloco_a2_pct  numeric(5,2), ic_bloco_a3_pct  numeric(5,2),
  ic_bloco_a4_pct  numeric(5,2), ic_bloco_a5_pct  numeric(5,2),
  -- Racional: R-1(Q51-55), R-2(Q56-60), R-3(Q61-65), R-4(Q66-70), R-5(Q71-75)
  ic_bloco_r1_pct  numeric(5,2), ic_bloco_r2_pct  numeric(5,2), ic_bloco_r3_pct  numeric(5,2),
  ic_bloco_r4_pct  numeric(5,2), ic_bloco_r5_pct  numeric(5,2),
  -- Social: S-A(Q76-83), S-B(Q84-91), S-C(Q92-100)
  ic_bloco_sa_pct  numeric(5,2), ic_bloco_sb_pct  numeric(5,2), ic_bloco_sc_pct  numeric(5,2),
  -- Cultural: C-A(Q101-108), C-B(Q109-116), C-C(Q117-125)
  ic_bloco_ca_pct  numeric(5,2), ic_bloco_cb_pct  numeric(5,2), ic_bloco_cc_pct  numeric(5,2),
  -- Metadados do cálculo
  n_ic_respondents   int NOT NULL DEFAULT 0,
  ic_weight          numeric(3,2) NOT NULL,
  il_weight          numeric(3,2) NOT NULL,
  -- Alertas e âncoras como JSON
  alerts             jsonb NOT NULL DEFAULT '[]',
  anchor_questions   jsonb NOT NULL DEFAULT '[]',
  display_level      text NOT NULL DEFAULT 'normal'
                       CHECK (display_level IN ('normal','baixa_amostragem_amarelo','baixa_amostragem_laranja','apenas_dimensao','sem_dados')),
  -- IDs dos laudos selecionados — FK para laudos (já criada acima)
  laudo_fisica_id    uuid REFERENCES laudos(id),
  laudo_afetiva_id   uuid REFERENCES laudos(id),
  laudo_racional_id  uuid REFERENCES laudos(id),
  laudo_social_id    uuid REFERENCES laudos(id),
  laudo_cultural_id  uuid REFERENCES laudos(id),
  calculated_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 8. TRIGGERS: updated_at automático
-- ============================================================
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_profiles_updated_at   ON profiles;
DROP TRIGGER IF EXISTS trg_companies_updated_at  ON companies;
DROP TRIGGER IF EXISTS trg_diagnostics_updated_at ON diagnostics;

CREATE TRIGGER trg_profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_companies_updated_at
  BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER trg_diagnostics_updated_at
  BEFORE UPDATE ON diagnostics
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();


-- ============================================================
-- VERIFICAÇÃO FINAL
-- Após executar, rode este SELECT para confirmar as 7 tabelas:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
--
-- Resultado esperado:
--   companies
--   diagnostic_results
--   diagnostics
--   ic_responses
--   il_responses
--   laudos
--   profiles
-- ============================================================
