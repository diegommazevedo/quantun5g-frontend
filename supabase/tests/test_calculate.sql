-- ============================================================
-- QUANTUM5G — Dados sintéticos para teste do motor de cálculo
-- Cenário: Empresa com 5 colaboradores
--   Física:   EXCELENTE (IC ~82%) — alta satisfação com ambiente
--   Afetiva:  SAUDÁVEL  (IC ~68%)
--   Racional: VULNERÁVEL(IC ~52%)
--   Social:   SAUDÁVEL  (IC ~63%)
--   Cultural: CRÍTICO   (IC ~35%) — ponto de dor principal
--   Alerta esperado: Bloco Crítico Oculto em C-A ou C-B
--   Bolha Sistêmica: IL percebe cultural muito melhor que IC (gap ~28pp)
-- ============================================================
-- IMPORTANTE: Este script cria dados de teste reais no banco.
-- Após validar, limpar com o bloco DELETE no final.
-- ============================================================

-- ============================================================
-- STEP 1: IDs fixos para reprodutibilidade
-- ============================================================
DO $$
DECLARE
  v_consultant_id  uuid;
  v_company_id     uuid := 'aaaaaaaa-0001-0001-0001-000000000001';
  v_diagnostic_id  uuid := 'bbbbbbbb-0001-0001-0001-000000000001';
BEGIN
  -- Pega o primeiro consultor cadastrado (ou usa o admin)
  SELECT id INTO v_consultant_id FROM profiles LIMIT 1;

  IF v_consultant_id IS NULL THEN
    RAISE EXCEPTION 'Nenhum usuário cadastrado. Faça login uma vez antes de rodar este teste.';
  END IF;

  RAISE NOTICE 'Usando consultant_id: %', v_consultant_id;
  RAISE NOTICE 'company_id de teste: %', v_company_id;
  RAISE NOTICE 'diagnostic_id de teste: %', v_diagnostic_id;

  -- Limpa dados anteriores do teste
  DELETE FROM diagnostic_results WHERE diagnostic_id = v_diagnostic_id;
  DELETE FROM ic_responses        WHERE diagnostic_id = v_diagnostic_id;
  DELETE FROM il_responses        WHERE diagnostic_id = v_diagnostic_id;
  DELETE FROM diagnostics         WHERE id            = v_diagnostic_id;
  DELETE FROM companies           WHERE id            = v_company_id;

  -- ============================================================
  -- STEP 2: Empresa de teste
  -- ============================================================
  INSERT INTO companies (id, name, total_collaborators, consultant_id)
  VALUES (v_company_id, 'Empresa Teste Ltda', 5, v_consultant_id);

  -- ============================================================
  -- STEP 3: Diagnóstico em status ENCERRADO
  -- ============================================================
  INSERT INTO diagnostics (
    id, company_id, consultant_id, name,
    leader_name, leader_email, status,
    il_submitted_at, ic_closed_at
  ) VALUES (
    v_diagnostic_id, v_company_id, v_consultant_id,
    'Diagnóstico de Teste — Motor',
    'Líder Teste', 'lider@teste.com',
    'ENCERRADO',
    now() - interval '2 days',
    now() - interval '1 day'
  );

  -- ============================================================
  -- STEP 4: Resposta IL — liderança
  -- Padrão: física alta, cultural também alta (gap cultural ~28pp vs IC)
  -- Física IL ~87%, Afetiva IL ~72%, Racional IL ~60%
  -- Social IL ~70%, Cultural IL ~63%  (IC cultural ~35% → bolha ~28pp)
  -- ============================================================
  INSERT INTO il_responses (
    id, diagnostic_id,
    -- Física (Q1-Q25): resposta 4-5 (alta)
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    -- Afetiva (Q26-Q50): resposta 3-4
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    -- Racional (Q51-Q75): resposta 3
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    -- Social (Q76-Q100): resposta 3-4
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    -- Cultural (Q101-Q125): resposta 3-4 (liderança percebe bem)
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id,
    -- Física: maioria 4-5
    5,4,4,5,4,5,4,4,  5,4,5,4,3,4,5,4,
    4,5,4,5,4,4,5,4,5,
    -- Afetiva: 3-4
    4,3,4,3,4, 4,3,4,4,3, 4,4,3,4,4, 3,4,3,4,4, 3,4,4,3,4,
    -- Racional: 3
    3,3,3,3,3, 3,3,4,3,3, 3,3,3,4,3, 3,3,3,3,4, 3,3,4,3,3,
    -- Social: 3-4
    4,3,4,3,4,3,4,3, 4,4,3,4,3,4,4,3, 3,4,4,3,4,3,4,3,4,
    -- Cultural: 3-4 (liderança percebe bem mas colaboradores não)
    4,3,4,3,4,3,4,3,
    4,3,3,4,3,4,3,4,
    3,4,3,4,3,4,3,4,3
  );

  -- ============================================================
  -- STEP 5: 5 respostas IC — colaboradores
  -- Física alta, Cultural crítica (scores 1-2 nos blocos C-A e C-B)
  -- ============================================================

  -- Colaborador 1: física ótima, cultural péssima, âncora em Q113 (=1)
  INSERT INTO ic_responses (
    id, diagnostic_id, respondente_anonimo_id,
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id, gen_random_uuid(),
    5,5,4,5,4,5,5,4,  4,5,4,4,5,4,5,5,  5,4,5,5,4,5,4,5,5,
    3,4,3,4,3, 3,4,3,3,4, 3,3,4,3,3, 4,3,3,4,3, 3,4,3,3,4,
    3,2,3,2,3, 2,3,3,2,3, 3,2,3,3,2, 3,3,2,3,3, 2,3,3,2,3,
    4,3,4,3,4,3,4,3, 3,4,3,4,3,4,4,3, 4,3,4,3,4,3,4,3,4,
    2,2,1,2,1,2,1,2,   -- C-A: muito baixo
    2,1,2,1,1,2,1,2,   -- C-B: crítico (Q113=1 → âncora!)
    2,1,2,1,2,1,2,1,2  -- C-C: crítico
  );

  -- Colaborador 2: similar, física boa, cultural ruim
  INSERT INTO ic_responses (
    id, diagnostic_id, respondente_anonimo_id,
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id, gen_random_uuid(),
    4,5,5,4,5,4,5,5,  5,4,5,5,4,5,4,4,  4,5,5,4,5,4,5,4,5,
    4,3,4,3,3, 4,3,4,3,3, 3,4,3,4,3, 3,4,4,3,4, 4,3,3,4,3,
    3,3,2,3,3, 3,2,3,3,2, 2,3,3,2,3, 3,3,2,3,2, 3,2,3,3,3,
    3,4,3,4,3,4,3,4, 4,3,4,3,4,3,3,4, 3,4,3,4,3,4,3,4,3,
    2,1,2,2,1,2,2,1,   -- C-A
    1,2,1,2,1,2,2,1,   -- C-B (Q113=1 → âncora!)
    2,2,1,2,1,2,1,2,1  -- C-C
  );

  -- Colaborador 3
  INSERT INTO ic_responses (
    id, diagnostic_id, respondente_anonimo_id,
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id, gen_random_uuid(),
    5,4,5,4,5,5,4,5,  4,5,4,5,4,5,5,4,  5,4,4,5,5,4,5,5,4,
    3,3,4,4,3, 3,3,4,3,4, 4,3,3,4,4, 3,3,4,4,3, 3,3,4,3,4,
    2,3,3,2,3, 3,3,2,3,3, 3,3,2,3,3, 2,3,3,3,2, 3,3,2,3,3,
    4,3,3,4,4,3,4,3, 3,3,4,4,3,4,3,3, 4,3,3,4,4,3,3,4,3,
    2,2,2,1,2,2,2,1,   -- C-A
    2,2,1,2,1,1,2,2,   -- C-B (Q113=1)
    1,2,2,1,2,2,1,2,1  -- C-C
  );

  -- Colaborador 4: física boa, racional um pouco melhor, cultural ruim
  INSERT INTO ic_responses (
    id, diagnostic_id, respondente_anonimo_id,
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id, gen_random_uuid(),
    4,4,5,5,4,4,5,5,  5,4,4,5,4,4,5,5,  4,5,4,4,5,5,4,5,4,
    4,4,3,3,4, 3,4,4,3,3, 4,3,4,3,4, 4,3,3,4,4, 3,4,4,3,3,
    3,4,3,3,4, 3,3,4,3,3, 4,3,3,4,3, 3,4,3,3,4, 3,3,4,3,3,
    3,4,4,3,3,4,3,4, 4,3,3,4,4,3,4,3, 3,4,4,3,3,4,4,3,4,
    2,2,1,2,2,1,2,2,   -- C-A
    1,2,2,1,1,2,1,2,   -- C-B (Q113=1)
    2,1,2,2,1,2,2,1,2  -- C-C
  );

  -- Colaborador 5: padrão misto
  INSERT INTO ic_responses (
    id, diagnostic_id, respondente_anonimo_id,
    q1,q2,q3,q4,q5,q6,q7,q8,q9,q10,q11,q12,q13,q14,q15,q16,
    q17,q18,q19,q20,q21,q22,q23,q24,q25,
    q26,q27,q28,q29,q30,q31,q32,q33,q34,q35,
    q36,q37,q38,q39,q40,q41,q42,q43,q44,q45,
    q46,q47,q48,q49,q50,
    q51,q52,q53,q54,q55,q56,q57,q58,q59,q60,
    q61,q62,q63,q64,q65,q66,q67,q68,q69,q70,
    q71,q72,q73,q74,q75,
    q76,q77,q78,q79,q80,q81,q82,q83,q84,q85,
    q86,q87,q88,q89,q90,q91,q92,q93,q94,q95,
    q96,q97,q98,q99,q100,
    q101,q102,q103,q104,q105,q106,q107,q108,
    q109,q110,q111,q112,q113,q114,q115,q116,
    q117,q118,q119,q120,q121,q122,q123,q124,q125
  ) VALUES (
    gen_random_uuid(), v_diagnostic_id, gen_random_uuid(),
    5,5,4,4,5,5,4,5,  5,5,4,4,5,5,4,5,  4,5,5,4,4,5,5,4,5,
    3,4,4,3,4, 4,3,3,4,4, 3,4,3,4,3, 4,4,3,3,4, 4,3,4,3,4,
    2,3,3,3,2, 3,2,3,3,3, 3,3,3,2,3, 3,3,3,2,3, 3,3,2,3,3,
    4,4,3,3,4,4,3,3, 3,4,4,3,3,4,4,3, 3,3,4,4,3,3,4,4,3,
    1,2,2,1,2,1,2,2,   -- C-A (Q101=1 → âncora!)
    2,1,2,2,1,2,2,1,   -- C-B
    2,2,1,2,2,1,2,2,1  -- C-C
  );

  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Dados de teste inseridos com sucesso!';
  RAISE NOTICE 'diagnostic_id: %', v_diagnostic_id;
  RAISE NOTICE 'N respostas IC: 5';
  RAISE NOTICE 'Status: ENCERRADO';
  RAISE NOTICE '==============================================';
  RAISE NOTICE 'Próximo passo: chamar a Edge Function com:';
  RAISE NOTICE '{ "diagnostic_id": "bbbbbbbb-0001-0001-0001-000000000001" }';

END $$;

-- Confirmar inserção
SELECT
  'IC responses' AS tipo,
  COUNT(*) AS quantidade
FROM ic_responses
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001'
UNION ALL
SELECT
  'IL responses',
  COUNT(*)
FROM il_responses
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';
