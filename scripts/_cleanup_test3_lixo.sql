-- Cleanup do INSERT órfão deixado pelo teste 3 anterior (que não conseguiu deletar).
DELETE FROM nr01_audit_log WHERE event_type = 'PATCH_001_TEST_3';
SELECT 'cleaned' AS status;
