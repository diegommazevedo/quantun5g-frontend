-- ============================================================
-- QUANTUM5G — Módulo NR-01 | RLS Policies (idempotente)
-- Versão: 0.1.1 | Data: 2026-04-19
-- Executar APÓS nr01_schema.sql.
--
-- IDEMPOTÊNCIA: cada CREATE POLICY é precedido por DROP POLICY IF EXISTS,
-- permitindo re-executar este arquivo sem erro de "policy already exists".
--
-- Reusa get_my_role() criada em rls.sql do Pentagrama.
-- Multi-tenancy: consultor só vê suas avaliações; admin vê tudo.
-- ============================================================

-- ============================================================
-- PRÉ-CHECK — garante que o Pentagrama RLS está aplicado.
-- ============================================================
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'get_my_role') THEN
    RAISE EXCEPTION
      'get_my_role() não existe. Aplique primeiro supabase/rls.sql do Pentagrama.'
      USING ERRCODE = '42883';
  END IF;
END $$;


-- ============================================================
-- HELPERS auxiliares (NR-01)
-- ============================================================
CREATE OR REPLACE FUNCTION nr01_owns_assessment(_assessment_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM nr01_assessments a
    WHERE a.id = _assessment_id
      AND (a.consultant_id = auth.uid() OR get_my_role() = 'admin')
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;

CREATE OR REPLACE FUNCTION nr01_assessment_open_for_collection(_assessment_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM nr01_assessments a
    WHERE a.id = _assessment_id
      AND a.status = 'COLETANDO'
      AND (a.collection_opens_at IS NULL OR a.collection_opens_at <= now())
      AND (a.collection_closes_at IS NULL OR a.collection_closes_at >= now())
  );
$$ LANGUAGE sql SECURITY DEFINER STABLE;


-- ============================================================
-- 1. nr01_dimensions
-- ============================================================
ALTER TABLE nr01_dimensions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_dim_select_all"  ON nr01_dimensions;
DROP POLICY IF EXISTS "nr01_dim_admin_write" ON nr01_dimensions;

CREATE POLICY "nr01_dim_select_all" ON nr01_dimensions
  FOR SELECT USING (true);

CREATE POLICY "nr01_dim_admin_write" ON nr01_dimensions
  FOR ALL USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- ============================================================
-- 2. nr01_questions
-- ============================================================
ALTER TABLE nr01_questions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_q_select_all"  ON nr01_questions;
DROP POLICY IF EXISTS "nr01_q_admin_write" ON nr01_questions;

CREATE POLICY "nr01_q_select_all" ON nr01_questions
  FOR SELECT USING (is_active = true OR get_my_role() = 'admin');

CREATE POLICY "nr01_q_admin_write" ON nr01_questions
  FOR ALL USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- ============================================================
-- 3. nr01_assessments
-- ============================================================
ALTER TABLE nr01_assessments ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_assessments_select" ON nr01_assessments;
DROP POLICY IF EXISTS "nr01_assessments_insert" ON nr01_assessments;
DROP POLICY IF EXISTS "nr01_assessments_update" ON nr01_assessments;
DROP POLICY IF EXISTS "nr01_assessments_delete" ON nr01_assessments;

CREATE POLICY "nr01_assessments_select" ON nr01_assessments
  FOR SELECT USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "nr01_assessments_insert" ON nr01_assessments
  FOR INSERT WITH CHECK (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "nr01_assessments_update" ON nr01_assessments
  FOR UPDATE USING (
    consultant_id = auth.uid()
    OR get_my_role() = 'admin'
  );

CREATE POLICY "nr01_assessments_delete" ON nr01_assessments
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 4. nr01_invites
-- ============================================================
ALTER TABLE nr01_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_invites_select"      ON nr01_invites;
DROP POLICY IF EXISTS "nr01_invites_insert"      ON nr01_invites;
DROP POLICY IF EXISTS "nr01_invites_update_use"  ON nr01_invites;
DROP POLICY IF EXISTS "nr01_invites_delete"      ON nr01_invites;

CREATE POLICY "nr01_invites_select" ON nr01_invites
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_invites_insert" ON nr01_invites
  FOR INSERT WITH CHECK (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_invites_update_use" ON nr01_invites
  FOR UPDATE USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_invites_delete" ON nr01_invites
  FOR DELETE USING (nr01_owns_assessment(assessment_id));


-- ============================================================
-- 5. nr01_responses
-- ============================================================
ALTER TABLE nr01_responses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_responses_select"        ON nr01_responses;
DROP POLICY IF EXISTS "nr01_responses_insert_token"  ON nr01_responses;
DROP POLICY IF EXISTS "nr01_responses_delete_admin"  ON nr01_responses;

CREATE POLICY "nr01_responses_select" ON nr01_responses
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_responses_insert_token" ON nr01_responses
  FOR INSERT WITH CHECK (
    nr01_assessment_open_for_collection(assessment_id)
  );

CREATE POLICY "nr01_responses_delete_admin" ON nr01_responses
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 6. nr01_response_answers
-- ============================================================
ALTER TABLE nr01_response_answers ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_answers_select"        ON nr01_response_answers;
DROP POLICY IF EXISTS "nr01_answers_insert_token"  ON nr01_response_answers;
DROP POLICY IF EXISTS "nr01_answers_delete_admin"  ON nr01_response_answers;

CREATE POLICY "nr01_answers_select" ON nr01_response_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nr01_responses r
      WHERE r.id = nr01_response_answers.response_id
        AND nr01_owns_assessment(r.assessment_id)
    )
  );

CREATE POLICY "nr01_answers_insert_token" ON nr01_response_answers
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM nr01_responses r
      WHERE r.id = nr01_response_answers.response_id
        AND nr01_assessment_open_for_collection(r.assessment_id)
    )
  );

CREATE POLICY "nr01_answers_delete_admin" ON nr01_response_answers
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 7. nr01_dimension_scores
-- ============================================================
ALTER TABLE nr01_dimension_scores ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_dim_scores_select" ON nr01_dimension_scores;
DROP POLICY IF EXISTS "nr01_dim_scores_write"  ON nr01_dimension_scores;

CREATE POLICY "nr01_dim_scores_select" ON nr01_dimension_scores
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_dim_scores_write" ON nr01_dimension_scores
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));


-- ============================================================
-- 8. nr01_assessment_results
-- ============================================================
ALTER TABLE nr01_assessment_results ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_results_select" ON nr01_assessment_results;
DROP POLICY IF EXISTS "nr01_results_write"  ON nr01_assessment_results;

CREATE POLICY "nr01_results_select" ON nr01_assessment_results
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_results_write" ON nr01_assessment_results
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));


-- ============================================================
-- 9. nr01_evidence_pack
-- ============================================================
ALTER TABLE nr01_evidence_pack ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_evidence_select"        ON nr01_evidence_pack;
DROP POLICY IF EXISTS "nr01_evidence_insert"        ON nr01_evidence_pack;
DROP POLICY IF EXISTS "nr01_evidence_delete_admin"  ON nr01_evidence_pack;

CREATE POLICY "nr01_evidence_select" ON nr01_evidence_pack
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_evidence_insert" ON nr01_evidence_pack
  FOR INSERT WITH CHECK (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_evidence_delete_admin" ON nr01_evidence_pack
  FOR DELETE USING (get_my_role() = 'admin');


-- ============================================================
-- 10. nr01_intervention_library
-- ============================================================
ALTER TABLE nr01_intervention_library ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_intlib_select"      ON nr01_intervention_library;
DROP POLICY IF EXISTS "nr01_intlib_admin_write" ON nr01_intervention_library;

CREATE POLICY "nr01_intlib_select" ON nr01_intervention_library
  FOR SELECT USING (is_active = true OR get_my_role() = 'admin');

CREATE POLICY "nr01_intlib_admin_write" ON nr01_intervention_library
  FOR ALL USING (get_my_role() = 'admin')
  WITH CHECK (get_my_role() = 'admin');


-- ============================================================
-- 11/12. nr01_action_plans + nr01_action_items
-- ============================================================
ALTER TABLE nr01_action_plans ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_plan_select" ON nr01_action_plans;
DROP POLICY IF EXISTS "nr01_plan_write"  ON nr01_action_plans;

CREATE POLICY "nr01_plan_select" ON nr01_action_plans
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_plan_write" ON nr01_action_plans
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));

ALTER TABLE nr01_action_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_action_item_select" ON nr01_action_items;
DROP POLICY IF EXISTS "nr01_action_item_write"  ON nr01_action_items;

CREATE POLICY "nr01_action_item_select" ON nr01_action_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM nr01_action_plans p
      WHERE p.id = nr01_action_items.action_plan_id
        AND nr01_owns_assessment(p.assessment_id)
    )
  );

CREATE POLICY "nr01_action_item_write" ON nr01_action_items
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM nr01_action_plans p
      WHERE p.id = nr01_action_items.action_plan_id
        AND nr01_owns_assessment(p.assessment_id)
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM nr01_action_plans p
      WHERE p.id = nr01_action_items.action_plan_id
        AND nr01_owns_assessment(p.assessment_id)
    )
  );


-- ============================================================
-- 13/14. nr01_economic_inputs + nr01_economic_projections
-- ============================================================
ALTER TABLE nr01_economic_inputs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_econ_in_select" ON nr01_economic_inputs;
DROP POLICY IF EXISTS "nr01_econ_in_write"  ON nr01_economic_inputs;

CREATE POLICY "nr01_econ_in_select" ON nr01_economic_inputs
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_econ_in_write" ON nr01_economic_inputs
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));

ALTER TABLE nr01_economic_projections ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_econ_proj_select" ON nr01_economic_projections;
DROP POLICY IF EXISTS "nr01_econ_proj_write"  ON nr01_economic_projections;

CREATE POLICY "nr01_econ_proj_select" ON nr01_economic_projections
  FOR SELECT USING (nr01_owns_assessment(assessment_id));

CREATE POLICY "nr01_econ_proj_write" ON nr01_economic_projections
  FOR ALL USING (nr01_owns_assessment(assessment_id))
  WITH CHECK (nr01_owns_assessment(assessment_id));


-- ============================================================
-- 15. nr01_audit_log
-- ============================================================
ALTER TABLE nr01_audit_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_audit_select" ON nr01_audit_log;
DROP POLICY IF EXISTS "nr01_audit_insert" ON nr01_audit_log;

CREATE POLICY "nr01_audit_select" ON nr01_audit_log
  FOR SELECT USING (
    get_my_role() = 'admin'
    OR (assessment_id IS NOT NULL AND nr01_owns_assessment(assessment_id))
  );

CREATE POLICY "nr01_audit_insert" ON nr01_audit_log
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- 16. nr01_pentagrama_bridge
-- ============================================================
ALTER TABLE nr01_pentagrama_bridge ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_bridge_select" ON nr01_pentagrama_bridge;
DROP POLICY IF EXISTS "nr01_bridge_write"  ON nr01_pentagrama_bridge;

CREATE POLICY "nr01_bridge_select" ON nr01_pentagrama_bridge
  FOR SELECT USING (
    nr01_owns_assessment(assessment_id)
    OR EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = nr01_pentagrama_bridge.diagnostic_id
        AND (d.consultant_id = auth.uid() OR get_my_role() = 'admin')
    )
  );

CREATE POLICY "nr01_bridge_write" ON nr01_pentagrama_bridge
  FOR ALL USING (
    nr01_owns_assessment(assessment_id)
    AND EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = nr01_pentagrama_bridge.diagnostic_id
        AND (d.consultant_id = auth.uid() OR get_my_role() = 'admin')
    )
  )
  WITH CHECK (
    nr01_owns_assessment(assessment_id)
    AND EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = nr01_pentagrama_bridge.diagnostic_id
        AND (d.consultant_id = auth.uid() OR get_my_role() = 'admin')
    )
  );


-- ============================================================
-- 17. nr01_micro_pulses
-- ============================================================
ALTER TABLE nr01_micro_pulses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_pulses_select"        ON nr01_micro_pulses;
DROP POLICY IF EXISTS "nr01_pulses_insert_public" ON nr01_micro_pulses;

CREATE POLICY "nr01_pulses_select" ON nr01_micro_pulses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM companies c
      WHERE c.id = nr01_micro_pulses.company_id
        AND (c.consultant_id = auth.uid() OR get_my_role() = 'admin')
    )
  );

CREATE POLICY "nr01_pulses_insert_public" ON nr01_micro_pulses
  FOR INSERT WITH CHECK (true);


-- ============================================================
-- GRANTS
-- ============================================================
GRANT SELECT ON nr01_dimensions, nr01_questions, nr01_intervention_library TO anon;
GRANT INSERT ON nr01_responses, nr01_response_answers, nr01_micro_pulses TO anon;
GRANT ALL ON ALL TABLES    IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
