-- =============================================================================
-- QUANTUM5G — Catch-up remoto (idempotente)
-- Projeto: cole inteiro no Supabase Dashboard → SQL Editor → Run
-- Corrige: coluna cnpj ausente, RT, IL, módulos, equipe, disparos
-- =============================================================================

-- ── 1. companies (20260528100000 + 302 + 303) ─────────────────────────────
ALTER TABLE companies ADD COLUMN IF NOT EXISTS legal_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS trade_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS cnpj text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rh_contact_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS rh_contact_email text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS name_normalized text;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_crp text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_profession text DEFAULT 'Psicólogo';
ALTER TABLE companies ADD COLUMN IF NOT EXISTS technical_lead_email text;

ALTER TABLE companies ADD COLUMN IF NOT EXISTS il_leader_name text;
ALTER TABLE companies ADD COLUMN IF NOT EXISTS il_leader_email text;

UPDATE companies
SET name_normalized = lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
WHERE name_normalized IS NULL;

-- Resolve duplicatas antes do índice único (empresas legadas)
WITH ranked AS (
  SELECT id,
    row_number() OVER (
      PARTITION BY consultant_id, lower(trim(regexp_replace(name, '\s+', ' ', 'g')))
      ORDER BY created_at NULLS LAST, id
    ) AS rn
  FROM companies
  WHERE name IS NOT NULL AND trim(name) <> ''
)
UPDATE companies c
SET name_normalized = c.name_normalized || '-' || left(c.id::text, 8)
FROM ranked r
WHERE c.id = r.id AND r.rn > 1;

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

-- ── 2. profiles — módulos (20260530400000) ───────────────────────────────────
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_pentagrama boolean NOT NULL DEFAULT true;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_nr01 boolean NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.module_pentagrama IS 'Acesso ao módulo Pentagrama Ginger';
COMMENT ON COLUMN profiles.module_nr01 IS 'Acesso ao módulo NR-01';

-- ── 3. company_il_leaders (20260530400000) ───────────────────────────────────
CREATE TABLE IF NOT EXISTS company_il_leaders (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name        text NOT NULL,
  email       text NOT NULL,
  sort_order  int NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_company_il_leaders_company ON company_il_leaders(company_id);

INSERT INTO company_il_leaders (company_id, name, email, sort_order)
SELECT c.id, c.il_leader_name, c.il_leader_email, 0
FROM companies c
WHERE c.il_leader_name IS NOT NULL AND trim(c.il_leader_name) <> ''
  AND c.il_leader_email IS NOT NULL AND trim(c.il_leader_email) <> ''
  AND NOT EXISTS (
    SELECT 1 FROM company_il_leaders l WHERE l.company_id = c.id
  );

ALTER TABLE company_il_leaders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_il_leaders_consultant ON company_il_leaders;
CREATE POLICY company_il_leaders_consultant ON company_il_leaders
  FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_il_leaders.company_id
        AND c.consultant_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_il_leaders.company_id
        AND c.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS company_il_leaders_admin ON company_il_leaders;
CREATE POLICY company_il_leaders_admin ON company_il_leaders
  FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── 4. equipe + disparos (20260530500000) ────────────────────────────────────
CREATE TABLE IF NOT EXISTS company_contacts (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id   uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  full_name    text NOT NULL,
  email        text NOT NULL,
  contact_role text NOT NULL CHECK (contact_role IN ('leader', 'collaborator')),
  job_title    text,
  department   text,
  is_active    boolean NOT NULL DEFAULT true,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_contacts_email_unique UNIQUE (company_id, email)
);

CREATE INDEX IF NOT EXISTS idx_company_contacts_company ON company_contacts(company_id);
CREATE INDEX IF NOT EXISTS idx_company_contacts_role ON company_contacts(company_id, contact_role);

INSERT INTO company_contacts (company_id, full_name, email, contact_role, created_at)
SELECT l.company_id, l.name, lower(trim(l.email)), 'leader', l.created_at
FROM company_il_leaders l
WHERE NOT EXISTS (
  SELECT 1 FROM company_contacts c
  WHERE c.company_id = l.company_id AND lower(c.email) = lower(trim(l.email))
);

CREATE TABLE IF NOT EXISTS survey_invites (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  token           uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  company_id      uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  contact_id      uuid NOT NULL REFERENCES company_contacts(id) ON DELETE CASCADE,
  module          text NOT NULL CHECK (module IN ('pentagrama', 'nr01')),
  survey_kind     text NOT NULL CHECK (survey_kind IN ('il', 'ic', 'nr01_coleta')),
  reference_id    uuid NOT NULL,
  survey_url      text NOT NULL,
  email_sent_at   timestamptz,
  email_status    text CHECK (email_status IN ('pending', 'sent', 'failed', 'bounced')),
  email_error     text,
  opened_at       timestamptz,
  completed_at    timestamptz,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT survey_invites_unique_campaign UNIQUE (contact_id, module, survey_kind, reference_id)
);

CREATE INDEX IF NOT EXISTS idx_survey_invites_token ON survey_invites(token);
CREATE INDEX IF NOT EXISTS idx_survey_invites_ref ON survey_invites(module, survey_kind, reference_id);

CREATE TABLE IF NOT EXISTS email_dispatch_batches (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id    uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  consultant_id uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  module        text NOT NULL CHECK (module IN ('pentagrama', 'nr01')),
  survey_kind   text NOT NULL,
  reference_id  uuid NOT NULL,
  subject       text NOT NULL,
  total_targets int NOT NULL DEFAULT 0,
  sent_count    int NOT NULL DEFAULT 0,
  failed_count  int NOT NULL DEFAULT 0,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS email_dispatch_items (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id      uuid NOT NULL REFERENCES email_dispatch_batches(id) ON DELETE CASCADE,
  contact_id    uuid REFERENCES company_contacts(id) ON DELETE SET NULL,
  email         text NOT NULL,
  status        text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  invite_id     uuid REFERENCES survey_invites(id) ON DELETE SET NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_batches_ref ON email_dispatch_batches(module, reference_id);

ALTER TABLE company_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE survey_invites ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_dispatch_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_dispatch_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_contacts_consultant ON company_contacts;
CREATE POLICY company_contacts_consultant ON company_contacts FOR ALL
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_contacts.company_id AND c.consultant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = company_contacts.company_id AND c.consultant_id = auth.uid()));

DROP POLICY IF EXISTS company_contacts_admin ON company_contacts;
CREATE POLICY company_contacts_admin ON company_contacts FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS survey_invites_consultant ON survey_invites;
CREATE POLICY survey_invites_consultant ON survey_invites FOR ALL
  USING (EXISTS (SELECT 1 FROM companies c WHERE c.id = survey_invites.company_id AND c.consultant_id = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM companies c WHERE c.id = survey_invites.company_id AND c.consultant_id = auth.uid()));

DROP POLICY IF EXISTS survey_invites_public_read ON survey_invites;
CREATE POLICY survey_invites_public_read ON survey_invites FOR SELECT USING (true);

DROP POLICY IF EXISTS email_dispatch_batches_consultant ON email_dispatch_batches;
CREATE POLICY email_dispatch_batches_consultant ON email_dispatch_batches FOR ALL
  USING (consultant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK (consultant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS email_dispatch_items_consultant ON email_dispatch_items;
CREATE POLICY email_dispatch_items_consultant ON email_dispatch_items FOR ALL
  USING (EXISTS (
    SELECT 1 FROM email_dispatch_batches b
    WHERE b.id = email_dispatch_items.batch_id
      AND (b.consultant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM email_dispatch_batches b
    WHERE b.id = email_dispatch_items.batch_id
      AND (b.consultant_id = auth.uid() OR (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  ));

ALTER TABLE il_responses ADD COLUMN IF NOT EXISTS company_contact_id uuid REFERENCES company_contacts(id) ON DELETE SET NULL;

-- ── 5. contas de suporte (20260530600000) ────────────────────────────────────
UPDATE profiles
SET
  role = 'admin',
  module_pentagrama = true,
  module_nr01 = true,
  is_active = true
WHERE lower(email) IN ('suporte@quantun5g.com', 'suporte@quantum5g.com')
  AND role <> 'admin';

-- ── 7. competência padronizada (20260530800000) ─────────────────────────────
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_seq integer;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_month smallint;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_year smallint;
ALTER TABLE diagnostics ADD COLUMN IF NOT EXISTS competencia_label text;

ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_seq integer;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_month smallint;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_year smallint;
ALTER TABLE nr01_assessments ADD COLUMN IF NOT EXISTS competencia_label text;

-- ── 8. webhooks Resend + supressão (20260530900000) ─────────────────────────
ALTER TABLE survey_invites ADD COLUMN IF NOT EXISTS resend_email_id text;
ALTER TABLE survey_invites ADD COLUMN IF NOT EXISTS email_delivered_at timestamptz;
ALTER TABLE survey_invites ADD COLUMN IF NOT EXISTS email_opened_at timestamptz;
ALTER TABLE survey_invites ADD COLUMN IF NOT EXISTS email_clicked_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_survey_invites_resend_email_id
  ON survey_invites(resend_email_id) WHERE resend_email_id IS NOT NULL;

ALTER TABLE survey_invites DROP CONSTRAINT IF EXISTS survey_invites_email_status_check;
ALTER TABLE survey_invites ADD CONSTRAINT survey_invites_email_status_check
  CHECK (email_status IS NULL OR email_status IN (
    'pending', 'sent', 'delivered', 'failed', 'bounced', 'complained'
  ));

CREATE TABLE IF NOT EXISTS email_suppressions (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email_normalized   text NOT NULL,
  reason             text NOT NULL CHECK (reason IN ('hard_bounce', 'complaint', 'manual')),
  resend_email_id    text,
  resend_event_id    text,
  contact_id         uuid REFERENCES company_contacts(id) ON DELETE SET NULL,
  notes              text,
  created_at         timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT email_suppressions_email_unique UNIQUE (email_normalized)
);

CREATE TABLE IF NOT EXISTS email_webhook_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id          text NOT NULL UNIQUE,
  event_type       text NOT NULL,
  resend_email_id  text,
  invite_id        uuid REFERENCES survey_invites(id) ON DELETE SET NULL,
  payload_summary  jsonb,
  received_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE email_suppressions ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_webhook_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS email_suppressions_consultant ON email_suppressions;
CREATE POLICY email_suppressions_consultant ON email_suppressions FOR SELECT
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM company_contacts cc
      JOIN companies c ON c.id = cc.company_id
      WHERE lower(cc.email) = email_suppressions.email_normalized
        AND c.consultant_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS email_suppressions_admin ON email_suppressions;
CREATE POLICY email_suppressions_admin ON email_suppressions FOR ALL
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

DROP POLICY IF EXISTS email_webhook_events_admin ON email_webhook_events;
CREATE POLICY email_webhook_events_admin ON email_webhook_events FOR SELECT
  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');

-- ── 9. consultor pode reativar supressão da equipe (20260530910000) ────────
DROP POLICY IF EXISTS email_suppressions_consultant_delete ON email_suppressions;
CREATE POLICY email_suppressions_consultant_delete ON email_suppressions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM company_contacts cc
      JOIN companies c ON c.id = cc.company_id
      WHERE lower(cc.email) = email_suppressions.email_normalized
        AND c.consultant_id = auth.uid()
    )
  );

-- ── 10. Faturas comerciais + líder vinculado à empresa (20260531200000) ─────
ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS account_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_account_user ON companies(account_user_id);

CREATE TABLE IF NOT EXISTS commercial_invoice_counters (
  year int PRIMARY KEY,
  last_seq int NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS commercial_invoices (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  invoice_number      text NOT NULL UNIQUE,
  status              text NOT NULL DEFAULT 'emitida'
                        CHECK (status IN ('emitida', 'aprovada', 'paga', 'cancelada')),
  user_id             uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id          uuid REFERENCES companies(id) ON DELETE SET NULL,
  consultant_id       uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  created_by          uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  product_id          text NOT NULL DEFAULT 'nr01' REFERENCES products(id),
  plan_id             text NOT NULL,
  amount_cents        int NOT NULL CHECK (amount_cents > 0),
  billing_mode        text NOT NULL DEFAULT 'anual_parcelado'
                        CHECK (billing_mode IN ('anual_parcelado', 'anual_vista')),
  include_pentagrama  boolean NOT NULL DEFAULT false,
  headcount_declared  int,
  subscription_id     uuid REFERENCES subscriptions(id) ON DELETE SET NULL,
  metadata            jsonb NOT NULL DEFAULT '{}',
  notes               text,
  approved_by         uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  approved_at         timestamptz,
  paid_by             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  paid_at             timestamptz,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_commercial_invoices_user ON commercial_invoices(user_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_consultant ON commercial_invoices(consultant_id);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_status ON commercial_invoices(status);
CREATE INDEX IF NOT EXISTS idx_commercial_invoices_company ON commercial_invoices(company_id);

CREATE OR REPLACE FUNCTION commercial_invoices_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_commercial_invoices_updated_at ON commercial_invoices;
CREATE TRIGGER trg_commercial_invoices_updated_at
  BEFORE UPDATE ON commercial_invoices
  FOR EACH ROW EXECUTE FUNCTION commercial_invoices_set_updated_at();

CREATE OR REPLACE FUNCTION next_commercial_invoice_number()
RETURNS text LANGUAGE plpgsql AS $$
DECLARE
  y int := EXTRACT(YEAR FROM now())::int;
  seq int;
BEGIN
  INSERT INTO commercial_invoice_counters (year, last_seq)
  VALUES (y, 1)
  ON CONFLICT (year) DO UPDATE
    SET last_seq = commercial_invoice_counters.last_seq + 1
  RETURNING last_seq INTO seq;
  RETURN 'INV-' || y::text || '-' || lpad(seq::text, 5, '0');
END;
$$;

ALTER TABLE commercial_invoices ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS commercial_invoices_select ON commercial_invoices;
DROP POLICY IF EXISTS commercial_invoices_insert ON commercial_invoices;

CREATE POLICY commercial_invoices_select ON commercial_invoices
  FOR SELECT USING (
    user_id = auth.uid()
    OR consultant_id = auth.uid()
    OR created_by = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY commercial_invoices_insert ON commercial_invoices
  FOR INSERT WITH CHECK (
    get_my_role() = 'admin'
    OR (
      get_my_role() = 'consultant'
      AND consultant_id = auth.uid()
      AND created_by = auth.uid()
    )
    OR (
      get_my_role() = 'leader'
      AND user_id = auth.uid()
      AND created_by = auth.uid()
      AND consultant_id IS NOT NULL
    )
  );

DROP POLICY IF EXISTS nr01_assessments_select_leader ON nr01_assessments;
CREATE POLICY nr01_assessments_select_leader ON nr01_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = nr01_assessments.company_id
        AND c.account_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS companies_select_leader ON companies;
DROP POLICY IF EXISTS "companies_select_leader" ON companies;
CREATE POLICY companies_select_leader ON companies
  FOR SELECT USING (
    auth_role() = 'leader'
    AND account_user_id = auth.uid()
  );

-- ── 6. hybrid_reports (devolutiva Pentagrama × NR-01 v1.0) ───────────────────
CREATE TABLE IF NOT EXISTS hybrid_reports (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assessment_id     uuid NOT NULL REFERENCES nr01_assessments(id) ON DELETE CASCADE,
  diagnostic_id     uuid NOT NULL REFERENCES diagnostics(id) ON DELETE CASCADE,
  crosswalk_version text NOT NULL DEFAULT '1.0.0',
  payload           jsonb NOT NULL,
  payload_sha256    text NOT NULL,
  generated_at      timestamptz NOT NULL DEFAULT now(),
  generated_by      uuid REFERENCES profiles(id),
  UNIQUE (assessment_id)
);

CREATE INDEX IF NOT EXISTS idx_hybrid_reports_diagnostic ON hybrid_reports(diagnostic_id);

ALTER TABLE hybrid_reports ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "hybrid_report_select" ON hybrid_reports;
DROP POLICY IF EXISTS "hybrid_report_write" ON hybrid_reports;

CREATE POLICY "hybrid_report_select" ON hybrid_reports
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "hybrid_report_write" ON hybrid_reports
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));

-- ── 7. Recarrega cache do PostgREST (corrige "schema cache") ─────────────────
NOTIFY pgrst, 'reload schema';
