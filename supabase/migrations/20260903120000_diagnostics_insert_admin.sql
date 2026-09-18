-- Admin: INSERT em diagnostics sem exigir consultant_id = auth.uid() / company.consultant_id.
-- A policy viva diagnostics_insert_consultant bloqueava admin ao criar em empresas de consultores.
-- App já usa service role após fetchCompanyForActor; esta policy é defesa em profundidade.

BEGIN;

DROP POLICY IF EXISTS diagnostics_insert_consultant ON diagnostics;
DROP POLICY IF EXISTS diagnostics_insert ON diagnostics;

CREATE POLICY diagnostics_insert_consultant ON diagnostics
  FOR INSERT WITH CHECK (
    get_my_role() = 'admin'
    OR (
      auth_role() = 'consultant'
      AND consultant_id = auth.uid()
      AND EXISTS (
        SELECT 1
        FROM companies
        WHERE companies.id = diagnostics.company_id
          AND companies.consultant_id = auth.uid()
      )
    )
  );

COMMIT;
