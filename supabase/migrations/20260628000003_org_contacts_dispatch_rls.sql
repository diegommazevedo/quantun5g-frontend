-- Políticas RLS para company_contacts, company_il_leaders, email_dispatch_batches
-- e tabelas associadas, estendidas para contratante self-serve (org_account_id) e gerente.
--
-- Premissa: estas tabelas já têm RLS ativa com políticas para consultant + admin.
-- Esta migration ADICIONA (OR) as políticas para org-scoped roles sem remover as existentes.

BEGIN;

-- ============================================================
-- company_contacts — contratante (dono da org) + gerente (membro da org)
-- ============================================================

DROP POLICY IF EXISTS company_contacts_org_contratante ON company_contacts;
CREATE POLICY company_contacts_org_contratante ON company_contacts
  FOR ALL
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS company_contacts_org_gerente ON company_contacts;
CREATE POLICY company_contacts_org_gerente ON company_contacts
  FOR SELECT
  USING (
    company_id IN (
      SELECT omc.company_id FROM org_member_companies omc
      INNER JOIN org_members om ON om.id = omc.member_id
      WHERE om.user_id = auth.uid()
    )
  );

-- ============================================================
-- company_il_leaders — mesma lógica
-- ============================================================

DROP POLICY IF EXISTS company_il_leaders_org_contratante ON company_il_leaders;
CREATE POLICY company_il_leaders_org_contratante ON company_il_leaders
  FOR ALL
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- email_dispatch_batches — contratante via empresa da org
-- Nota: actions já usam service role após validação; esta policy é defesa em profundidade.
-- ============================================================

DROP POLICY IF EXISTS email_dispatch_batches_org_contratante ON email_dispatch_batches;
CREATE POLICY email_dispatch_batches_org_contratante ON email_dispatch_batches
  FOR ALL
  USING (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    company_id IN (
      SELECT c.id FROM companies c
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  );

-- ============================================================
-- survey_invites — contratante pode ver/criar invites das suas empresas
-- ============================================================

DROP POLICY IF EXISTS survey_invites_org_contratante ON survey_invites;
CREATE POLICY survey_invites_org_contratante ON survey_invites
  FOR ALL
  USING (
    dispatch_id IN (
      SELECT edb.id FROM email_dispatch_batches edb
      INNER JOIN companies c ON c.id = edb.company_id
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  )
  WITH CHECK (
    dispatch_id IN (
      SELECT edb.id FROM email_dispatch_batches edb
      INNER JOIN companies c ON c.id = edb.company_id
      INNER JOIN org_accounts oa ON oa.id = c.org_account_id
      WHERE oa.owner_user_id = auth.uid()
    )
  );

COMMIT;
