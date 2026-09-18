-- Radar Empresarial + Copiloto Comercial (MVP)
-- Sinais contínuos + CRM leve / fila do dia

-- ─── RADAR ───────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.radar_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  org_account_id uuid REFERENCES public.org_accounts(id) ON DELETE SET NULL,
  source text NOT NULL CHECK (source IN ('pentagrama', 'nr01', 'pdca', 'pulse', 'system')),
  kind text NOT NULL,
  severity smallint NOT NULL DEFAULT 3 CHECK (severity BETWEEN 1 AND 5),
  title text NOT NULL,
  message text NOT NULL,
  payload jsonb NOT NULL DEFAULT '{}'::jsonb,
  detected_at timestamptz NOT NULL DEFAULT now(),
  fingerprint text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS radar_signals_fingerprint_uidx
  ON public.radar_signals (fingerprint);

CREATE INDEX IF NOT EXISTS radar_signals_company_detected_idx
  ON public.radar_signals (company_id, detected_at DESC);

CREATE INDEX IF NOT EXISTS radar_signals_detected_idx
  ON public.radar_signals (detected_at DESC);

CREATE TABLE IF NOT EXISTS public.radar_digests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_account_id uuid REFERENCES public.org_accounts(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE CASCADE,
  recipient_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  period_start date NOT NULL,
  period_end date NOT NULL,
  bullets jsonb NOT NULL DEFAULT '[]'::jsonb,
  signal_ids uuid[] NOT NULL DEFAULT '{}',
  sent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS radar_digests_period_idx
  ON public.radar_digests (period_start DESC);

ALTER TABLE public.radar_signals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radar_digests ENABLE ROW LEVEL SECURITY;

-- Staff/service role via bypass; authenticated read via policies soft (service role used in app)
CREATE POLICY radar_signals_select_authenticated
  ON public.radar_signals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY radar_digests_select_authenticated
  ON public.radar_digests FOR SELECT TO authenticated
  USING (true);

-- ─── COPILOTO (CRM leve) ─────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS public.crm_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  company_id uuid REFERENCES public.companies(id) ON DELETE SET NULL,
  name text NOT NULL,
  document text,
  segment text,
  avg_ticket numeric,
  purchase_cycle_days int,
  last_purchase_at date,
  last_contact_at date,
  notes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_accounts_owner_idx
  ON public.crm_accounts (owner_user_id, name);

CREATE TABLE IF NOT EXISTS public.crm_contacts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  email text,
  phone text,
  role_title text,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_contacts_account_idx
  ON public.crm_contacts (account_id);

CREATE TABLE IF NOT EXISTS public.crm_activities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  actor_user_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  kind text NOT NULL CHECK (kind IN ('call', 'whatsapp', 'visit', 'email', 'proposal', 'note')),
  summary text NOT NULL,
  happened_at timestamptz NOT NULL DEFAULT now(),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_activities_account_idx
  ON public.crm_activities (account_id, happened_at DESC);

CREATE TABLE IF NOT EXISTS public.crm_deals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  value numeric,
  stage text NOT NULL DEFAULT 'open'
    CHECK (stage IN ('open', 'proposal', 'won', 'lost')),
  next_step text,
  next_step_at date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS crm_deals_account_idx
  ON public.crm_deals (account_id, stage);

CREATE TABLE IF NOT EXISTS public.crm_scores (
  account_id uuid PRIMARY KEY REFERENCES public.crm_accounts(id) ON DELETE CASCADE,
  score numeric NOT NULL DEFAULT 0,
  reasons jsonb NOT NULL DEFAULT '[]'::jsonb,
  suggested_action text,
  scored_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.crm_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_contacts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_deals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.crm_scores ENABLE ROW LEVEL SECURITY;

CREATE POLICY crm_accounts_owner_all
  ON public.crm_accounts FOR ALL TO authenticated
  USING (owner_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ))
  WITH CHECK (owner_user_id = auth.uid() OR EXISTS (
    SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
  ));

CREATE POLICY crm_contacts_via_account
  ON public.crm_contacts FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ));

CREATE POLICY crm_activities_via_account
  ON public.crm_activities FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ));

CREATE POLICY crm_deals_via_account
  ON public.crm_deals FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ));

CREATE POLICY crm_scores_via_account
  ON public.crm_scores FOR ALL TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ))
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.crm_accounts a
    WHERE a.id = account_id
      AND (a.owner_user_id = auth.uid() OR EXISTS (
        SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
      ))
  ));

NOTIFY pgrst, 'reload schema';
