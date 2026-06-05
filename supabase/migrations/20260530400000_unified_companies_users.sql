-- Empresa unificada: líderes IL (N) + módulos por usuário



CREATE TABLE IF NOT EXISTS company_il_leaders (

  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),

  company_id  uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name        text NOT NULL,

  email       text NOT NULL,

  sort_order  int NOT NULL DEFAULT 0,

  created_at  timestamptz NOT NULL DEFAULT now()

);



CREATE INDEX IF NOT EXISTS idx_company_il_leaders_company ON company_il_leaders(company_id);



-- Migra colunas legadas (se existirem)

INSERT INTO company_il_leaders (company_id, name, email, sort_order)

SELECT c.id, c.il_leader_name, c.il_leader_email, 0

FROM companies c

WHERE c.il_leader_name IS NOT NULL AND trim(c.il_leader_name) <> ''

  AND c.il_leader_email IS NOT NULL AND trim(c.il_leader_email) <> ''

  AND NOT EXISTS (

    SELECT 1 FROM company_il_leaders l WHERE l.company_id = c.id

  );



ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_pentagrama boolean NOT NULL DEFAULT true;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS module_nr01 boolean NOT NULL DEFAULT true;



COMMENT ON COLUMN profiles.module_pentagrama IS 'Acesso ao módulo Pentagrama Ginger';

COMMENT ON COLUMN profiles.module_nr01 IS 'Acesso ao módulo NR-01';



ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;



-- RLS company_il_leaders (consultor dono da empresa)

ALTER TABLE company_il_leaders ENABLE ROW LEVEL SECURITY;



DROP POLICY IF EXISTS company_il_leaders_consultant ON company_il_leaders;

CREATE POLICY company_il_leaders_consultant ON company_il_leaders

  FOR ALL

  USING (

    EXISTS (

      SELECT 1 FROM companies c

      WHERE c.id = company_il_leaders.company_id

        AND c.consultant_id = auth.uid()

    )

  )

  WITH CHECK (

    EXISTS (

      SELECT 1 FROM companies c

      WHERE c.id = company_il_leaders.company_id

        AND c.consultant_id = auth.uid()

    )

  );



DROP POLICY IF EXISTS company_il_leaders_admin ON company_il_leaders;

CREATE POLICY company_il_leaders_admin ON company_il_leaders

  FOR ALL

  USING ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin')

  WITH CHECK ((SELECT role FROM profiles WHERE id = auth.uid()) = 'admin');


