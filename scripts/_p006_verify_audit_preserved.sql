SELECT COUNT(*) AS total
  FROM nr01_audit_log
 WHERE payload->>'assessment_id' = '2bb338a5-4f57-4995-abe2-a03302fcc625';
