-- Faturas comerciais (pagamento presencial / porta a porta) — checkout alternativo ao gateway.
-- Fluxo: emitida → aprovada → paga (só admin marca paga → libera NR-01).

BEGIN;

ALTER TABLE companies
  ADD COLUMN IF NOT EXISTS account_user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_companies_account_user ON companies(account_user_id);

COMMENT ON COLUMN companies.account_user_id IS
  'Usuário líder/responsável vinculado à empresa (vê apenas dados desta organização).';

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

-- UPDATE/DELETE apenas via service_role (ações de admin no servidor).

-- Líder vê avaliações NR-01 da empresa vinculada
DROP POLICY IF EXISTS nr01_assessments_select_leader ON nr01_assessments;
CREATE POLICY nr01_assessments_select_leader ON nr01_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = nr01_assessments.company_id
        AND c.account_user_id = auth.uid()
    )
  );

COMMIT;
