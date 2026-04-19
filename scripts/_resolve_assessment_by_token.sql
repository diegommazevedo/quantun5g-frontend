-- Resolve assessment a partir do collection_token
SELECT
  a.id,
  a.name,
  a.status,
  a.instrument_version,
  a.collection_opens_at,
  a.collection_closes_at,
  c.name AS company_name,
  c.total_collaborators,
  (SELECT COUNT(*) FROM nr01_responses r WHERE r.assessment_id = a.id) AS responses_existentes
FROM nr01_assessments a
LEFT JOIN companies c ON c.id = a.company_id
WHERE a.collection_token = '9e9cde7c-3bf6-4279-87ec-a9eb4eefe40f';
