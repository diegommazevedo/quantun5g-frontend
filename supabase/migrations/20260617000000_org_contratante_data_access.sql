-- Contratante/gerente: leitura de empresas e avaliações do grupo (RLS).

BEGIN;

DROP POLICY IF EXISTS companies_select_contratante ON companies;
CREATE POLICY companies_select_contratante ON companies
  FOR SELECT USING (
    get_my_role() IN ('contratante', 'leader')
    AND org_account_id IN (
      SELECT id FROM org_accounts WHERE owner_user_id = auth.uid()
    )
  );

DROP POLICY IF EXISTS companies_select_gerente ON companies;
CREATE POLICY companies_select_gerente ON companies
  FOR SELECT USING (
    get_my_role() = 'gerente'
    AND id IN (
      SELECT omc.company_id
      FROM org_member_companies omc
      INNER JOIN org_members om ON om.id = omc.member_id
      WHERE om.user_id = auth.uid() AND om.is_active = true
    )
  );

DROP POLICY IF EXISTS diagnostics_select_org ON diagnostics;
CREATE POLICY diagnostics_select_org ON diagnostics
  FOR SELECT USING (
    get_my_role() IN ('contratante', 'gerente', 'leader')
    AND company_id IN (
      SELECT c.id FROM companies c
      WHERE (
        get_my_role() IN ('contratante', 'leader')
        AND c.org_account_id IN (
          SELECT id FROM org_accounts WHERE owner_user_id = auth.uid()
        )
      )
      OR (
        get_my_role() = 'gerente'
        AND c.id IN (
          SELECT omc.company_id
          FROM org_member_companies omc
          INNER JOIN org_members om ON om.id = omc.member_id
          WHERE om.user_id = auth.uid() AND om.is_active = true
        )
      )
    )
  );

DROP POLICY IF EXISTS nr01_assessments_select_org ON nr01_assessments;
CREATE POLICY nr01_assessments_select_org ON nr01_assessments
  FOR SELECT USING (
    get_my_role() IN ('contratante', 'gerente', 'leader')
    AND company_id IN (
      SELECT c.id FROM companies c
      WHERE (
        get_my_role() IN ('contratante', 'leader')
        AND c.org_account_id IN (
          SELECT id FROM org_accounts WHERE owner_user_id = auth.uid()
        )
      )
      OR (
        get_my_role() = 'gerente'
        AND c.id IN (
          SELECT omc.company_id
          FROM org_member_companies omc
          INNER JOIN org_members om ON om.id = omc.member_id
          WHERE om.user_id = auth.uid() AND om.is_active = true
        )
      )
    )
  );

COMMIT;
