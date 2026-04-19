-- 1. Quantas respostas estão de fato no banco para esse assessment?
SELECT
  COUNT(*) AS responses_count,
  MIN(submitted_at) AS first_at,
  MAX(submitted_at) AS last_at,
  COUNT(DISTINCT anon_id) AS unique_anons
FROM nr01_responses
WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';

-- 2. Quantas answers (filhos)?
SELECT COUNT(*) AS answers_count
FROM nr01_response_answers ra
JOIN nr01_responses r ON r.id = ra.response_id
WHERE r.assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';

-- 3. Quem é o consultor dono da avaliação? (pra checar RLS)
SELECT
  a.id AS assessment_id,
  a.name,
  a.consultant_id,
  p.email AS consultant_email,
  p.role  AS consultant_role,
  a.expected_respondents,
  a.status
FROM nr01_assessments a
LEFT JOIN profiles p ON p.id = a.consultant_id
WHERE a.id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
