-- Equipe da empresa (líderes + colaboradores) + log de disparos de questionário

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

-- Migra líderes IL legados
INSERT INTO company_contacts (company_id, full_name, email, contact_role, created_at)
SELECT l.company_id, l.name, lower(trim(l.email)), 'leader', l.created_at
FROM company_il_leaders l
WHERE NOT EXISTS (
  SELECT 1 FROM company_contacts c
  WHERE c.company_id = l.company_id AND lower(c.email) = lower(trim(l.email))
);

-- Tokens personalizados por convite (rastreio de abertura/envio)
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

-- Lote de disparo (auditoria)
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
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  batch_id     uuid NOT NULL REFERENCES email_dispatch_batches(id) ON DELETE CASCADE,
  contact_id   uuid REFERENCES company_contacts(id) ON DELETE SET NULL,
  email        text NOT NULL,
  status       text NOT NULL CHECK (status IN ('sent', 'failed', 'skipped')),
  error_message text,
  invite_id    uuid REFERENCES survey_invites(id) ON DELETE SET NULL,
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_dispatch_batches_ref ON email_dispatch_batches(module, reference_id);

-- RLS
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

-- Vínculo opcional IL → contato (múltiplos líderes no futuro)
ALTER TABLE il_responses ADD COLUMN IF NOT EXISTS company_contact_id uuid REFERENCES company_contacts(id) ON DELETE SET NULL;

COMMENT ON TABLE company_contacts IS 'Equipe cadastrada: líderes (IL Pentagrama) e colaboradores (IC). NR-01 usa todos ativos sem distinguir papel no disparo.';
COMMENT ON TABLE survey_invites IS 'Convite tokenizado por pessoa/campanha para rastreio de envio e link personalizado.';
