SELECT
  COUNT(*) AS responses_count,
  COUNT(DISTINCT anon_id) AS unique_anons,
  MIN(submitted_at) AS first_at,
  MAX(submitted_at) AS last_at,
  (SELECT COUNT(*) FROM nr01_response_answers ra
     JOIN nr01_responses r ON r.id = ra.response_id
     WHERE r.assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625') AS answers_count
FROM nr01_responses
WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
