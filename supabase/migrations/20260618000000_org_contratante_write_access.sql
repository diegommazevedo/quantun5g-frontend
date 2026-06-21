-- Contratante/gerente: INSERT e UPDATE em avaliações e diagnósticos das empresas da org.
-- Complementa 20260617000000 (SELECT). Server actions também usam service role após validação.

BEGIN;

DROP POLICY IF EXISTS nr01_assessments_insert_org ON nr01_assessments;
CREATE POLICY nr01_assessments_insert_org ON nr01_assessments
  FOR INSERT WITH CHECK (
    get_my_role() IN ('contratante', 'leader', 'gerente')
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

DROP POLICY IF EXISTS nr01_assessments_update_org ON nr01_assessments;
CREATE POLICY nr01_assessments_update_org ON nr01_assessments
  FOR UPDATE USING (
    get_my_role() IN ('contratante', 'leader', 'gerente')
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

DROP POLICY IF EXISTS diagnostics_insert_org ON diagnostics;
CREATE POLICY diagnostics_insert_org ON diagnostics
  FOR INSERT WITH CHECK (
    get_my_role() IN ('contratante', 'leader', 'gerente')
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

DROP POLICY IF EXISTS diagnostics_update_org ON diagnostics;
CREATE POLICY diagnostics_update_org ON diagnostics
  FOR UPDATE USING (
    get_my_role() IN ('contratante', 'leader', 'gerente')
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
