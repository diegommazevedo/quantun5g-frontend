-- ============================================================
-- QUANTUM5G — Validação do Patch 001 (5 testes)
-- Aplicar APÓS nr01_patch_001.sql.
-- Saída: RAISE NOTICE 'Test N PASSED' / RAISE WARNING 'Test N FAILED'
-- + tabela final consolidada com 5/5 ou X/5.
--
-- Cobertura:
--   1. nr01_collection_throttle existe e tem RLS
--   2. nr01_pentagrama_bridge tem confidence_level + min_n_respondents
--   3. nr01_audit_log bloqueia UPDATE para role authenticated
--   4. nr01_audit_log: REVOKE explícito de UPDATE/DELETE para authenticated
--   5. nr01_assessments: instrument_version imutável após sair de CRIADO
-- ============================================================

DROP TABLE IF EXISTS _patch_001_results;
CREATE TEMP TABLE _patch_001_results (
  test_id  int  PRIMARY KEY,
  test_name text,
  status    text CHECK (status IN ('PASS','FAIL','SKIP')),
  details   text
);


-- ============================================================
-- TEST 1 — Throttle existe + RLS habilitado
-- ============================================================
DO $$
DECLARE
  rls_enabled boolean;
BEGIN
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'nr01_collection_throttle' AND relkind = 'r';

  IF rls_enabled IS NULL THEN
    INSERT INTO _patch_001_results VALUES (1, 'throttle_table_exists', 'FAIL', 'tabela não existe');
    RAISE WARNING 'Test 1 FAILED — tabela nr01_collection_throttle não existe';
  ELSIF rls_enabled = false THEN
    INSERT INTO _patch_001_results VALUES (1, 'throttle_table_exists', 'FAIL', 'RLS desabilitado');
    RAISE WARNING 'Test 1 FAILED — RLS desabilitado em nr01_collection_throttle';
  ELSE
    INSERT INTO _patch_001_results VALUES (1, 'throttle_table_exists', 'PASS', 'tabela existe + RLS on');
    RAISE NOTICE 'Test 1 PASSED — tabela existe e RLS habilitado';
  END IF;
END $$;


-- ============================================================
-- TEST 2 — Bridge tem confidence_level + min_n_respondents
-- ============================================================
DO $$
DECLARE
  has_conf  boolean;
  has_min_n boolean;
BEGIN
  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nr01_pentagrama_bridge'
      AND column_name = 'confidence_level'
  ) INTO has_conf;

  SELECT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'nr01_pentagrama_bridge'
      AND column_name = 'min_n_respondents'
  ) INTO has_min_n;

  IF has_conf AND has_min_n THEN
    INSERT INTO _patch_001_results VALUES (2, 'bridge_confidence_columns', 'PASS', 'ambas as colunas existem');
    RAISE NOTICE 'Test 2 PASSED — bridge tem confidence_level + min_n_respondents';
  ELSE
    INSERT INTO _patch_001_results VALUES (2, 'bridge_confidence_columns', 'FAIL',
      format('confidence_level=%s, min_n_respondents=%s', has_conf, has_min_n));
    RAISE WARNING 'Test 2 FAILED — confidence_level=% min_n_respondents=%', has_conf, has_min_n;
  END IF;
END $$;


-- ============================================================
-- TEST 3 — Audit log: UPDATE bloqueado para role authenticated
--
-- Insere uma linha test, troca para role authenticated, tenta UPDATE.
-- Esperado: erro (trigger nr01_audit_log_immutable rejeita).
-- ============================================================
DO $$
DECLARE
  test_id_val bigint;
  blocked     boolean := false;
BEGIN
  INSERT INTO nr01_audit_log (event_type, payload)
    VALUES ('PATCH_001_TEST_3', '{"marker":"audit_immutable"}'::jsonb)
    RETURNING id INTO test_id_val;

  BEGIN
    SET LOCAL ROLE authenticated;
    UPDATE nr01_audit_log SET event_type = 'HACKED' WHERE id = test_id_val;
    RESET ROLE;
  EXCEPTION WHEN OTHERS THEN
    RESET ROLE;
    blocked := true;
  END;

  -- Cleanup (como superuser)
  DELETE FROM nr01_audit_log WHERE id = test_id_val;

  IF blocked THEN
    INSERT INTO _patch_001_results VALUES (3, 'audit_update_blocked', 'PASS', 'authenticated UPDATE rejeitado');
    RAISE NOTICE 'Test 3 PASSED — UPDATE no audit log bloqueado para authenticated';
  ELSE
    INSERT INTO _patch_001_results VALUES (3, 'audit_update_blocked', 'FAIL', 'UPDATE foi aceito — TRILHA NÃO É IMUTÁVEL');
    RAISE WARNING 'Test 3 FAILED — UPDATE foi aceito; trilha não é imutável';
  END IF;
END $$;


-- ============================================================
-- TEST 4 — Audit log: REVOKE explícito de UPDATE/DELETE
--
-- has_table_privilege() não considera triggers, só GRANTs.
-- ============================================================
DO $$
DECLARE
  can_update boolean;
  can_delete boolean;
BEGIN
  SELECT has_table_privilege('authenticated', 'nr01_audit_log', 'UPDATE') INTO can_update;
  SELECT has_table_privilege('authenticated', 'nr01_audit_log', 'DELETE') INTO can_delete;

  IF can_update = false AND can_delete = false THEN
    INSERT INTO _patch_001_results VALUES (4, 'audit_revoke_authenticated', 'PASS', 'sem privilege UPDATE/DELETE');
    RAISE NOTICE 'Test 4 PASSED — authenticated sem UPDATE/DELETE em audit log';
  ELSE
    INSERT INTO _patch_001_results VALUES (4, 'audit_revoke_authenticated', 'FAIL',
      format('UPDATE=%s, DELETE=%s', can_update, can_delete));
    RAISE WARNING 'Test 4 FAILED — privilege ainda concedido (UPDATE=% DELETE=%)', can_update, can_delete;
  END IF;
END $$;


-- ============================================================
-- TEST 5 — instrument_version imutável após sair de CRIADO
--
-- Cria assessment de teste em status COLETANDO, tenta mudar
-- instrument_version. Esperado: erro do trigger version_guard.
-- ============================================================
DO $$
DECLARE
  test_consultant_id uuid;
  test_company_id    uuid;
  test_assessment_id uuid;
  blocked            boolean := false;
BEGIN
  SELECT id INTO test_consultant_id
  FROM profiles
  WHERE role IN ('consultant','admin')
  LIMIT 1;

  IF test_consultant_id IS NULL THEN
    INSERT INTO _patch_001_results VALUES (5, 'version_guard', 'SKIP',
      'sem profiles consultant/admin para teste');
    RAISE NOTICE 'Test 5 SKIPPED — nenhum profile consultant/admin para criar fixture';
    RETURN;
  END IF;

  -- Cria fixtures
  INSERT INTO companies (name, total_collaborators, consultant_id)
    VALUES ('__patch_001_test__', 10, test_consultant_id)
    RETURNING id INTO test_company_id;

  INSERT INTO nr01_assessments
    (company_id, consultant_id, name, instrument_version, status)
    VALUES
    (test_company_id, test_consultant_id, '__patch_001_test__', 'v1.0', 'COLETANDO')
    RETURNING id INTO test_assessment_id;

  -- Tenta mudar instrument_version (deve falhar via trigger)
  BEGIN
    UPDATE nr01_assessments
       SET instrument_version = 'v9.9'
     WHERE id = test_assessment_id;
  EXCEPTION WHEN OTHERS THEN
    blocked := true;
  END;

  -- Cleanup
  DELETE FROM nr01_assessments WHERE id = test_assessment_id;
  DELETE FROM companies        WHERE id = test_company_id;

  IF blocked THEN
    INSERT INTO _patch_001_results VALUES (5, 'version_guard', 'PASS',
      'mudança de instrument_version rejeitada após COLETANDO');
    RAISE NOTICE 'Test 5 PASSED — version_guard bloqueia mudança de versão';
  ELSE
    INSERT INTO _patch_001_results VALUES (5, 'version_guard', 'FAIL',
      'instrument_version foi alterado em status COLETANDO');
    RAISE WARNING 'Test 5 FAILED — version foi alterada; longitudinal corrompido';
  END IF;
END $$;


-- ============================================================
-- RESULTADO CONSOLIDADO
-- ============================================================
SELECT test_id, test_name, status, details
  FROM _patch_001_results
  ORDER BY test_id;

SELECT
  format(
    '%s/%s passou',
    SUM(CASE WHEN status = 'PASS' THEN 1 ELSE 0 END),
    COUNT(*)
  ) AS resultado,
  SUM(CASE WHEN status = 'FAIL' THEN 1 ELSE 0 END) AS falhas,
  SUM(CASE WHEN status = 'SKIP' THEN 1 ELSE 0 END) AS skipped
FROM _patch_001_results;
