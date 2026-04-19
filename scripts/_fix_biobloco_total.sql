-- Ajusta total_collaborators da BioBloco para 27
-- (assessment 2bb338a5 → company vinculada)

-- Antes
SELECT c.id, c.name, c.total_collaborators
FROM companies c
JOIN nr01_assessments a ON a.company_id = c.id
WHERE a.id = '2bb338a5-4f57-4995-abe2-a03302fcc625';

-- Update
UPDATE companies
   SET total_collaborators = 27
 WHERE id = (
   SELECT company_id FROM nr01_assessments
   WHERE id = '2bb338a5-4f57-4995-abe2-a03302fcc625'
 );

-- Depois (confirmação)
SELECT c.id, c.name, c.total_collaborators, c.updated_at
FROM companies c
JOIN nr01_assessments a ON a.company_id = c.id
WHERE a.id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
