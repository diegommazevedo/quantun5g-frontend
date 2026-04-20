-- 1. Avaliações em CONCLUIDO (exceto BioBloco)
SELECT
  a.id,
  a.name,
  c.name AS company,
  a.status,
  a.updated_at,
  (SELECT COUNT(*) FROM nr01_responses r WHERE r.assessment_id = a.id) AS n_resp,
  (SELECT iso_score FROM nr01_assessment_results WHERE assessment_id = a.id) AS iso_atual
FROM nr01_assessments a
LEFT JOIN companies c ON c.id = a.company_id
WHERE a.status = 'CONCLUIDO'
  AND a.id <> '2bb338a5-4f57-4995-abe2-a03302fcc625';
