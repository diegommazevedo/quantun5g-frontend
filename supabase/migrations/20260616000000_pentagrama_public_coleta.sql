-- Pentagrama: coleta pública IL/IC alinhada ao fluxo paralelo (AGUARDANDO_IL + COLETANDO_IC).

BEGIN;

DROP POLICY IF EXISTS ic_responses_insert_token ON ic_responses;
CREATE POLICY ic_responses_insert_token ON ic_responses
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ic_responses.diagnostic_id
        AND d.status IN ('AGUARDANDO_IL', 'COLETANDO_IC')
    )
  );

GRANT INSERT ON ic_responses, il_responses TO anon;

COMMIT;
