-- Pasola: alinhar consultant_id das avaliações NR-01 ao consultor operador da org.
-- Idempotente: só corrige linhas cujo consultant_id difere do org_accounts.consultant_id.
-- Rodar APÓS backup. Revisar o SELECT de preview antes do UPDATE.

BEGIN;

-- Preview
SELECT
  a.id,
  a.name,
  a.status,
  a.consultant_id AS consultant_atual,
  o.consultant_id AS consultant_org,
  c.name AS empresa
FROM nr01_assessments a
JOIN companies c ON c.id = a.company_id
JOIN org_accounts o ON o.id = c.org_account_id
WHERE o.id = '6292eca3-7eaa-4270-a5ad-807caa17afd9'
  AND a.consultant_id IS DISTINCT FROM o.consultant_id;

UPDATE nr01_assessments a
SET consultant_id = o.consultant_id
FROM companies c
JOIN org_accounts o ON o.id = c.org_account_id
WHERE a.company_id = c.id
  AND o.id = '6292eca3-7eaa-4270-a5ad-807caa17afd9'
  AND a.consultant_id IS DISTINCT FROM o.consultant_id;

-- Confirmação
SELECT
  a.id,
  a.name,
  a.consultant_id,
  c.name AS empresa
FROM nr01_assessments a
JOIN companies c ON c.id = a.company_id
WHERE c.org_account_id = '6292eca3-7eaa-4270-a5ad-807caa17afd9'
ORDER BY a.created_at DESC;

COMMIT;
