-- Consultor pode remover supressão de e-mails da própria equipe (reativação manual)

DROP POLICY IF EXISTS email_suppressions_consultant_delete ON email_suppressions;
CREATE POLICY email_suppressions_consultant_delete ON email_suppressions FOR DELETE
  USING (
    (SELECT role FROM profiles WHERE id = auth.uid()) = 'admin'
    OR EXISTS (
      SELECT 1 FROM company_contacts cc
      JOIN companies c ON c.id = cc.company_id
      WHERE lower(cc.email) = email_suppressions.email_normalized
        AND c.consultant_id = auth.uid()
    )
  );
