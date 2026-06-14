-- Organização multi-CNPJ: contratante (dono do grupo) + gerentes (filiais).

BEGIN;

ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_role_check
  CHECK (role IN ('admin', 'consultant', 'leader', 'collaborator', 'contratante', 'gerente'));

CREATE TABLE IF NOT EXISTS org_accounts (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  owner_user_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  consultant_id   uuid NOT NULL REFERENCES profiles(id) ON DELETE RESTRICT,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_accounts_one_owner UNIQUE (owner_user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_accounts_consultant ON org_accounts(consultant_id);

ALTER TABLE companies ADD COLUMN IF NOT EXISTS org_account_id uuid REFERENCES org_accounts(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS idx_companies_org_account ON companies(org_account_id);

CREATE TABLE IF NOT EXISTS org_members (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_account_id    uuid NOT NULL REFERENCES org_accounts(id) ON DELETE CASCADE,
  user_id           uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_pentagrama boolean NOT NULL DEFAULT true,
  module_nr01       boolean NOT NULL DEFAULT true,
  is_active         boolean NOT NULL DEFAULT true,
  created_by        uuid REFERENCES profiles(id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT org_members_unique_user UNIQUE (org_account_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_org_members_org ON org_members(org_account_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user ON org_members(user_id);

CREATE TABLE IF NOT EXISTS org_member_companies (
  member_id   uuid NOT NULL REFERENCES org_members(id) ON DELETE CASCADE,
  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  PRIMARY KEY (member_id, company_id)
);

CREATE INDEX IF NOT EXISTS idx_org_member_companies_company ON org_member_companies(company_id);

COMMENT ON TABLE org_accounts IS 'Grupo contratual multi-CNPJ (ex.: Pasola). owner = contratante.';
COMMENT ON TABLE org_members IS 'Gerentes e delegados; contratante é org_accounts.owner_user_id.';
COMMENT ON TABLE org_member_companies IS 'CNPJs que cada gerente pode operar.';

ALTER TABLE org_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE org_member_companies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_accounts_admin ON org_accounts;
CREATE POLICY org_accounts_admin ON org_accounts FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS org_accounts_owner ON org_accounts;
CREATE POLICY org_accounts_owner ON org_accounts FOR SELECT
  USING (owner_user_id = auth.uid() OR get_my_role() = 'admin');

DROP POLICY IF EXISTS org_members_admin ON org_members;
CREATE POLICY org_members_admin ON org_members FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

DROP POLICY IF EXISTS org_members_owner ON org_members;
CREATE POLICY org_members_owner ON org_members FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM org_accounts o
      WHERE o.id = org_members.org_account_id AND o.owner_user_id = auth.uid()
    )
    OR user_id = auth.uid()
    OR get_my_role() = 'admin'
  );

DROP POLICY IF EXISTS org_member_companies_admin ON org_member_companies;
CREATE POLICY org_member_companies_admin ON org_member_companies FOR ALL
  USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');

COMMIT;
