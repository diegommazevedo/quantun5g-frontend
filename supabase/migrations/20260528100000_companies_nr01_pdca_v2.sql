-- Sprint: cadastro empresa + PDCA plano de ação v2
-- Idempotente — safe para produção.

-- ============================================================
-- 1. companies — campos regulatórios + anti-duplicata
-- ============================================================
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rh_contact_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rh_contact_email text;

-- Nome normalizado para deduplicação por consultor (sem acentos extras)
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_normalized text;

UPDATE companies
SET name_normalized = lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
WHERE name_normalized IS NULL;

ALTER TABLE companies ALTER COLUMN name_normalized SET DEFAULT '';
-- Trigger para manter name_normalized em sync
CREATE OR REPLACE FUNCTION companies_set_name_normalized()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.name_normalized := lower(trim(regexp_replace(COALESCE(NEW.name, ''), '\s+', ' ', 'g')));
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_companies_name_normalized ON companies;
CREATE TRIGGER trg_companies_name_normalized
  BEFORE INSERT OR UPDATE OF name ON companies
  FOR EACH ROW EXECUTE FUNCTION companies_set_name_normalized();

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_consultant_name_norm
  ON companies (consultant_id, name_normalized)
  WHERE length(name_normalized) > 0;

CREATE UNIQUE INDEX IF NOT EXISTS uq_companies_cnpj
  ON companies (cnpj)
  WHERE cnpj IS NOT NULL AND length(trim(cnpj)) >= 11;

-- ============================================================
-- 2. nr01_action_plans — ciclo de execução
-- ============================================================
ALTER TABLE nr01_action_plans ADD COLUMN IF NOT EXISTS execution_started_at timestamptz;
ALTER TABLE nr01_action_plans ADD COLUMN IF NOT EXISTS review_notes text;

-- ============================================================
-- 3. nr01_action_items — PDCA detalhado
-- ============================================================
ALTER TABLE nr01_action_items ADD COLUMN IF NOT EXISTS pdca_phase text NOT NULL DEFAULT 'plan';
ALTER TABLE nr01_action_items DROP CONSTRAINT IF EXISTS nr01_action_items_pdca_phase_check;
ALTER TABLE nr01_action_items ADD CONSTRAINT nr01_action_items_pdca_phase_check
  CHECK (pdca_phase IN ('plan', 'do', 'check', 'act'));

ALTER TABLE nr01_action_items ADD COLUMN IF NOT EXISTS rollout_steps jsonb NOT NULL DEFAULT '[]'::jsonb;
ALTER TABLE nr01_action_items ADD COLUMN IF NOT EXISTS check_notes jsonb NOT NULL DEFAULT '{}'::jsonb;
ALTER TABLE nr01_action_items ADD COLUMN IF NOT EXISTS baseline_score_pct numeric(5,2);
