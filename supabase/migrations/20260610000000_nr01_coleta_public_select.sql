-- Coleta pública NR-01: anon lê avaliação aberta via collection_token (RLS).

BEGIN;

DROP POLICY IF EXISTS nr01_assessments_select_public_coleta ON nr01_assessments;
CREATE POLICY nr01_assessments_select_public_coleta ON nr01_assessments
  FOR SELECT USING (
    status = 'COLETANDO'
    AND nr01_assessment_open_for_collection(id)
  );

GRANT SELECT ON nr01_assessments TO anon;

COMMIT;
