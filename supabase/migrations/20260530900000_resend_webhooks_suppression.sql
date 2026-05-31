-- Webhooks Resend + supressão automática (bounce/complaint) + rastreio de entrega

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

CREATE INDEX IF NOT EXISTS idx_email_suppressions_reason ON email_suppressions(reason);

CREATE TABLE IF NOT EXISTS email_webhook_events (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  svix_id          text NOT NULL UNIQUE,
  event_type       text NOT NULL,
  resend_email_id  text,
  invite_id        uuid REFERENCES survey_invites(id) ON DELETE SET NULL,
  payload_summary  jsonb,
  received_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_email_webhook_events_email_id ON email_webhook_events(resend_email_id);

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

COMMENT ON TABLE email_suppressions IS 'Lista global de e-mails bloqueados (hard bounce, spam complaint). LGPD: minimizar retenção.';
COMMENT ON TABLE email_webhook_events IS 'Idempotência e auditoria de webhooks Resend (svix-id único).';
