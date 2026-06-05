-- Líder vê empresas vinculadas via account_user_id (multi-CNPJ contrato).

BEGIN;

DROP POLICY IF EXISTS "companies_select_leader" ON companies;
CREATE POLICY "companies_select_leader" ON companies
  FOR SELECT USING (
    get_my_role() = 'leader'
    AND account_user_id = auth.uid()
  );

COMMIT;
