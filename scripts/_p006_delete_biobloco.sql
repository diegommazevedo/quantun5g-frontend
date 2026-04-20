-- ============================================================
-- Patch 006 · Exclusão da avaliação BioBloco (teste induzido)
-- UUID: 2bb338a5-4f57-4995-abe2-a03302fcc625
--
-- Sequência:
-- 1. Snapshot de contagem antes (registrado no ASSESSMENT_DELETED audit)
-- 2. Audit log: ASSESSMENT_DELETED (ANTES da exclusão)
-- 3. Exclusão em cascata (FKs ON DELETE CASCADE em algumas; aqui forçamos
--    ordem explícita pra garantir).
-- 4. Verificação final.
--
-- nr01_audit_log NÃO é apagado (imutabilidade preservada).
-- ============================================================

-- 1. Contagens antes
DO $$
DECLARE
  v_assessment_id uuid := '2bb338a5-4f57-4995-abe2-a03302fcc625';
  v_n_responses int;
  v_n_answers int;
  v_n_dim_scores int;
  v_n_audit int;
  v_company_id uuid;
BEGIN
  SELECT company_id INTO v_company_id FROM nr01_assessments WHERE id = v_assessment_id;

  SELECT COUNT(*) INTO v_n_responses FROM nr01_responses WHERE assessment_id = v_assessment_id;
  SELECT COUNT(*) INTO v_n_answers FROM nr01_response_answers ra
    JOIN nr01_responses r ON r.id = ra.response_id WHERE r.assessment_id = v_assessment_id;
  SELECT COUNT(*) INTO v_n_dim_scores FROM nr01_dimension_scores WHERE assessment_id = v_assessment_id;
  SELECT COUNT(*) INTO v_n_audit FROM nr01_audit_log WHERE assessment_id = v_assessment_id;

  -- 2. Audit ASSESSMENT_DELETED ANTES da exclusão (event imutável)
  INSERT INTO nr01_audit_log (assessment_id, actor_role, event_type, payload)
  VALUES (
    v_assessment_id,
    'consultant',
    'ASSESSMENT_DELETED',
    jsonb_build_object(
      'assessment_id', v_assessment_id,
      'company_id', v_company_id,
      'reason', 'Teste induzido pré-patches 005-009. Excluído conforme decisão do responsável técnico.',
      'patch_context', '006',
      'snapshot_before_deletion', jsonb_build_object(
        'n_responses', v_n_responses,
        'n_answers', v_n_answers,
        'n_dim_scores', v_n_dim_scores,
        'n_audit_events_preserved', v_n_audit
      ),
      'deleted_at', now()
    )
  );

  RAISE NOTICE 'BioBloco snapshot: % responses · % answers · % dim_scores · % audit events (preservados)',
    v_n_responses, v_n_answers, v_n_dim_scores, v_n_audit;
END $$;

-- 3. Exclusão em cascata explícita (ordem pra evitar FK violation)
DELETE FROM nr01_response_answers
  WHERE response_id IN (
    SELECT id FROM nr01_responses
     WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625'
  );

DELETE FROM nr01_responses          WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_dimension_scores   WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_assessment_results WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_evidence_pack      WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_action_items
  WHERE action_plan_id IN (
    SELECT id FROM nr01_action_plans WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625'
  );
DELETE FROM nr01_action_plans       WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_pulse_responses
  WHERE dispatch_id IN (
    SELECT id FROM nr01_pulse_dispatches WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625'
  );
DELETE FROM nr01_pulse_invites
  WHERE dispatch_id IN (
    SELECT id FROM nr01_pulse_dispatches WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625'
  );
DELETE FROM nr01_pulse_dispatches   WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_pulse_config       WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_collection_throttle WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_public_status_tokens WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_economic_inputs    WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_economic_projections WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_pentagrama_bridge  WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';
DELETE FROM nr01_invites            WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625';

-- Por último: o assessment
DELETE FROM nr01_assessments        WHERE id = '2bb338a5-4f57-4995-abe2-a03302fcc625';

-- 4. Verificação final
SELECT
  EXISTS (SELECT 1 FROM nr01_assessments WHERE id = '2bb338a5-4f57-4995-abe2-a03302fcc625') AS still_exists,
  (SELECT COUNT(*) FROM nr01_responses WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625') AS resp_left,
  (SELECT COUNT(*) FROM nr01_audit_log WHERE assessment_id = '2bb338a5-4f57-4995-abe2-a03302fcc625') AS audit_preserved;
