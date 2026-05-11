-- ============================================================
-- QUANTUM5G — P019 | Tabela nr01_leads (captura LP NR-01)
-- Insert via service_role na API; RLS sem políticas públicas.
-- ============================================================

BEGIN;

CREATE TABLE IF NOT EXISTS nr01_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text NOT NULL,
  phone text,
  company_name text,
  collaborators_count int,
  suggested_tier text,
  source text NOT NULL DEFAULT 'lp_main',
  utm_source text,
  utm_medium text,
  utm_campaign text,
  utm_content text,
  ip_hash text NOT NULL,
  consent_lgpd boolean NOT NULL DEFAULT false,
  consent_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_leads_email ON nr01_leads(email);
CREATE INDEX IF NOT EXISTS idx_leads_created ON nr01_leads(created_at DESC);

ALTER TABLE nr01_leads ENABLE ROW LEVEL SECURITY;

-- Sem políticas para anon/authenticated = sem acesso via PostgREST com JWT de utilizador.
-- service_role continua a contornar RLS para inserts da API.

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_019_NR01_LEADS_TABLE',
  jsonb_build_object(
    'patch', '019',
    'type', 'nr01_leads_landing_capture',
    'table', 'nr01_leads',
    'summary', 'Tabela nr01_leads para captura de leads da LP NR-01',
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log WHERE event_type = 'PATCH_019_NR01_LEADS_TABLE'
);

COMMIT;
