-- Contagem de respondentes IC únicos por diagnóstico (dashboard Pentagrama).
-- Executado apenas via service role no servidor — não exposto ao cliente.

CREATE OR REPLACE FUNCTION internal_ic_respondent_counts(p_diagnostic_ids uuid[])
RETURNS TABLE(diagnostic_id uuid, n_respondents integer)
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = public
AS $$
  SELECT
    ic.diagnostic_id,
    COUNT(DISTINCT ic.respondente_anonimo_id)::integer AS n_respondents
  FROM ic_responses ic
  WHERE ic.diagnostic_id = ANY(p_diagnostic_ids)
  GROUP BY ic.diagnostic_id;
$$;

REVOKE ALL ON FUNCTION internal_ic_respondent_counts(uuid[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION internal_ic_respondent_counts(uuid[]) TO service_role;
