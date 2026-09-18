-- Catálogo de departamentos por empresa + identificação híbrida nas respostas.
-- Estratégia C: invite herda dept do contato; link aberto exige seleção do catálogo.

-- ============================================================
-- 1. company_departments
-- ============================================================
CREATE TABLE IF NOT EXISTS company_departments (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id       uuid NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  name             text NOT NULL,
  name_normalized  text NOT NULL,
  is_active        boolean NOT NULL DEFAULT true,
  sort_order       int NOT NULL DEFAULT 0,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT company_departments_name_normalized_check CHECK (length(trim(name_normalized)) > 0),
  CONSTRAINT company_departments_company_name_unique UNIQUE (company_id, name_normalized)
);

CREATE INDEX IF NOT EXISTS idx_company_departments_company
  ON company_departments(company_id) WHERE is_active = true;

COMMENT ON TABLE company_departments IS
  'Catálogo de departamentos por empresa — fonte de verdade para disparo e filtros de pesquisa.';

-- ============================================================
-- 2. company_contacts.department_id
-- ============================================================
ALTER TABLE company_contacts
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES company_departments(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_company_contacts_department_id
  ON company_contacts(department_id) WHERE department_id IS NOT NULL;

-- ============================================================
-- 3. Respostas — snapshot de departamento (sem FK para contato)
-- ============================================================
ALTER TABLE ic_responses
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES company_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_label text;

ALTER TABLE il_responses
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES company_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_label text;

ALTER TABLE nr01_responses
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES company_departments(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS department_label text;

CREATE INDEX IF NOT EXISTS idx_ic_responses_department
  ON ic_responses(diagnostic_id, department_id);

CREATE INDEX IF NOT EXISTS idx_nr01_responses_department
  ON nr01_responses(assessment_id, department_id);

-- ============================================================
-- 4. survey_invites — snapshot no disparo (auditoria; não liga à resposta)
-- ============================================================
ALTER TABLE survey_invites
  ADD COLUMN IF NOT EXISTS department_id uuid REFERENCES company_departments(id) ON DELETE SET NULL;

-- ============================================================
-- 5. Migrar texto livre → catálogo
-- ============================================================
INSERT INTO company_departments (company_id, name, name_normalized, sort_order)
SELECT
  c.company_id,
  trim(c.department) AS name,
  lower(trim(c.department)) AS name_normalized,
  row_number() OVER (PARTITION BY c.company_id ORDER BY lower(trim(c.department)))::int - 1
FROM (
  SELECT DISTINCT company_id, department
  FROM company_contacts
  WHERE department IS NOT NULL AND length(trim(department)) > 0
) c
ON CONFLICT (company_id, name_normalized) DO NOTHING;

UPDATE company_contacts cc
SET department_id = d.id,
    department = d.name
FROM company_departments d
WHERE cc.company_id = d.company_id
  AND cc.department IS NOT NULL
  AND lower(trim(cc.department)) = d.name_normalized
  AND cc.department_id IS NULL;

-- ============================================================
-- 6. Seed OSS Assessoria Contábil (id fixo do ambiente)
-- ============================================================
DO $$
DECLARE
  oss_id uuid := '66e21422-dc47-4152-a0ed-e1ed3275936c';
  dept_names text[] := ARRAY[
    'Fiscal',
    'Departamento Pessoal',
    'Administrativo',
    'Legalização',
    'Contábil'
  ];
  i int;
  dname text;
BEGIN
  IF EXISTS (SELECT 1 FROM companies WHERE id = oss_id) THEN
    FOR i IN 1..array_length(dept_names, 1) LOOP
      dname := dept_names[i];
      INSERT INTO company_departments (company_id, name, name_normalized, sort_order, is_active)
      VALUES (oss_id, dname, lower(dname), i - 1, true)
      ON CONFLICT (company_id, name_normalized) DO UPDATE
        SET name = EXCLUDED.name,
            is_active = true,
            sort_order = EXCLUDED.sort_order,
            updated_at = now();
    END LOOP;

    UPDATE company_contacts cc
    SET department_id = d.id,
        department = d.name
    FROM company_departments d
    WHERE cc.company_id = oss_id
      AND d.company_id = oss_id
      AND cc.department IS NOT NULL
      AND lower(trim(cc.department)) = d.name_normalized;
  END IF;
END $$;

-- ============================================================
-- 7. RLS
-- ============================================================
ALTER TABLE company_departments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS company_departments_select ON company_departments;
CREATE POLICY company_departments_select ON company_departments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_departments.company_id
        AND (
          c.consultant_id = auth.uid()
          OR c.account_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM org_accounts oa
            WHERE oa.id = c.org_account_id AND oa.owner_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

DROP POLICY IF EXISTS company_departments_write ON company_departments;
CREATE POLICY company_departments_write ON company_departments
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_departments.company_id
        AND (
          c.consultant_id = auth.uid()
          OR c.account_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM org_accounts oa
            WHERE oa.id = c.org_account_id AND oa.owner_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = company_departments.company_id
        AND (
          c.consultant_id = auth.uid()
          OR c.account_user_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM org_accounts oa
            WHERE oa.id = c.org_account_id AND oa.owner_user_id = auth.uid()
          )
          OR EXISTS (
            SELECT 1 FROM profiles p WHERE p.id = auth.uid() AND p.role = 'admin'
          )
        )
    )
  );

-- Leitura pública mínima para questionário (só ativos) — via service-role na app;
-- policy anon SELECT apenas de depts ativos não expõe PII.
DROP POLICY IF EXISTS company_departments_public_active ON company_departments;
CREATE POLICY company_departments_public_active ON company_departments
  FOR SELECT TO anon, authenticated
  USING (is_active = true);

NOTIFY pgrst, 'reload schema';
