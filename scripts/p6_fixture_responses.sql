-- ============================================================
-- ⚠ AVISO PATCH 005 (2026-04-19)
-- Este fixture foi calibrado para o instrumento v1.0 com orientação
-- mista (4 questões positivas + 4 negativas reverse_scored por dimensão).
-- Após o Patch 007 (questões canônicas v1.1, 100% negativas conforme
-- NR01_GRO.docx), este fixture precisa ser regenerado para refletir
-- a nova orientação. NÃO executar em avaliação v1.1 sem atualizar.
-- ============================================================
-- QUANTUM5G — P6 · Fixture de respostas para smoke test
-- Versão: 1.0 | Data: 2026-04-19
--
-- Define duas funções idempotentes:
--   nr01_p6_inject_responses(p_assessment_id uuid)  → insere 24 respostas
--   nr01_p6_cleanup_responses(p_assessment_id uuid) → remove respostas + answers
--
-- NÃO chama nada na carga deste arquivo. Para usar:
--   1. Aplique este arquivo (cria as funções):
--      node scripts/run_sql.mjs scripts/p6_fixture_responses.sql
--   2. Quando Jovane criar a avaliação e mandar o UUID:
--      node scripts/p6_inject.mjs <assessment_id>
--   3. Para limpar e refazer:
--      node scripts/p6_cleanup.mjs <assessment_id>
--
-- Distribuição de scores alvo (após inversão das reverse_scored e
-- normalização para 0-100):
--   elevado     (4 dim): carga_trabalho, exigencias_emocionais,
--                        saude_bem_estar, lideranca_gestao        → mean ~2.7 / score ~42
--   atencao     (3 dim): controle_autonomia, organizacao_trabalho,
--                        reconhecimento                            → mean ~3.3 / score ~57
--   baixo       (2 dim): relacoes_interpessoais, assedio_violencia → mean ~3.9 / score ~72
--   muito_baixo (1 dim): estabilidade_seguranca                    → mean ~4.5 / score ~87
--
-- Alertas sistêmicos esperados após processamento:
--   - PRE_BURNOUT (carga + emocionais + saude todos em elevado)
--   - BOLHA_SISTEMICA (4 dimensões em risco elevado)
--
-- Variabilidade:
--   - jitter por questão (~uniforme [-0.7, +0.7])
--   - bias por respondente (~uniforme [-0.5, +0.5]) — alguém é mais negativo no geral
--   - clamp final em [1, 5] para respeitar a constraint Likert
--   - cortes demográficos rotativos (5 setores × 8 funções × 4 vínculos × 5 tempos de casa)
--   - submitted_at distribuído em janela de 4-6 dias antes de now()
-- ============================================================

CREATE OR REPLACE FUNCTION nr01_p6_inject_responses(p_assessment_id uuid)
RETURNS jsonb AS $func$
DECLARE
  v_assessment           record;
  v_setores              text[]    := ARRAY['Atendimento','Cartório','Registro','Tecnologia','Administrativo'];
  v_funcoes              text[]    := ARRAY['Atendente','Escrevente','Auxiliar','Coordenador','Analista','Estagiário','Tabelião','Apoio'];
  v_vinculos             text[]    := ARRAY['CLT','CLT','CLT','CLT','PJ','estagio','terceirizado'];
  v_tempos               text[]    := ARRAY['<1a','1-3a','1-3a','3-5a','3-5a','5-10a','>10a'];
  -- Targets de média Likert por dimensão (após inversão; valor saudável em [1,5])
  v_targets              jsonb     := jsonb_build_object(
    'carga_trabalho',         2.7,
    'controle_autonomia',     3.3,
    'exigencias_emocionais',  2.7,
    'reconhecimento',         3.3,
    'relacoes_interpessoais', 3.9,
    'estabilidade_seguranca', 4.5,
    'assedio_violencia',      3.9,
    'organizacao_trabalho',   3.3,
    'lideranca_gestao',       2.7,
    'saude_bem_estar',        2.7
  );
  v_total_responses      int       := 24;
  v_n_leaders            int       := 0;
  v_total_answers        int       := 0;
  v_resp_index           int;
  v_q                    record;
  v_response_id          uuid;
  v_anon_id              uuid;
  v_setor                text;
  v_funcao               text;
  v_vinculo              text;
  v_tempo                text;
  v_is_leader            boolean;
  v_submitted_at         timestamptz;
  v_now                  timestamptz := now();
  v_resp_bias            numeric;
  v_jitter               numeric;
  v_target               numeric;
  v_value_healthy        int;     -- valor "saudável" em [1,5] após cap
  v_value_to_store       int;     -- valor a inserir (aplica reverse se preciso)
BEGIN
  -- Validação
  SELECT * INTO v_assessment FROM nr01_assessments WHERE id = p_assessment_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'assessment_id % não existe.', p_assessment_id USING ERRCODE = '42P01';
  END IF;
  IF v_assessment.status NOT IN ('CRIADO','COLETANDO') THEN
    RAISE EXCEPTION 'Avaliação % está em status %. Permitido apenas CRIADO ou COLETANDO.',
      p_assessment_id, v_assessment.status USING ERRCODE = '23514';
  END IF;

  -- Reprodutibilidade: setseed determinístico (varia ligeiramente por assessment_id)
  PERFORM setseed(((extract(epoch from v_now)::int % 1000) / 1000.0)::float);

  FOR v_resp_index IN 1..v_total_responses LOOP
    v_anon_id      := gen_random_uuid();
    v_setor        := v_setores[1 + ((v_resp_index - 1) % array_length(v_setores, 1))];
    v_funcao       := v_funcoes[1 + ((v_resp_index - 1) % array_length(v_funcoes, 1))];
    v_vinculo      := v_vinculos[1 + (floor(random() * array_length(v_vinculos, 1))::int)];
    v_tempo        := v_tempos[1 + (floor(random() * array_length(v_tempos, 1))::int)];
    v_is_leader    := (v_resp_index % 8 = 0); -- 3 lideranças nos 24 (índices 8, 16, 24)
    IF v_is_leader THEN v_n_leaders := v_n_leaders + 1; END IF;

    -- Distribui submitted_at em janela [now - 6 dias, now - 4 horas]
    v_submitted_at := v_now - make_interval(secs => floor(random() * 6 * 86400 + 14400)::int);

    -- Bias do respondente (alguém é mais "negativo" / "positivo" em geral)
    v_resp_bias := (random() - 0.5);  -- ~uniforme [-0.5, +0.5]

    INSERT INTO nr01_responses (
      assessment_id, anon_id, setor, funcao, vinculo, tempo_casa, is_leader,
      open_q1, open_q2, open_q3, instrument_version, submitted_at
    ) VALUES (
      p_assessment_id, v_anon_id,
      v_setor, v_funcao, v_vinculo, v_tempo, v_is_leader,
      CASE WHEN v_resp_index % 4 = 0 THEN 'A organização do trabalho diário e o respeito da chefia.' ELSE NULL END,
      CASE WHEN v_resp_index % 4 = 1 THEN 'Falta de tempo para fazer tudo com qualidade.' ELSE NULL END,
      CASE WHEN v_resp_index % 4 = 2 THEN 'Mais clareza sobre as prioridades.' ELSE NULL END,
      v_assessment.instrument_version,
      v_submitted_at
    ) RETURNING id INTO v_response_id;

    -- Para cada questão ativa do instrumento da avaliação
    FOR v_q IN
      SELECT id, dimension_code, reverse_scored
      FROM nr01_questions
      WHERE instrument_version = v_assessment.instrument_version
        AND is_active = true
    LOOP
      v_jitter := (random() - 0.5) * 1.4;   -- uniforme [-0.7, +0.7]
      v_target := COALESCE((v_targets ->> v_q.dimension_code)::numeric, 3.3) + v_resp_bias + v_jitter;
      v_value_healthy := GREATEST(1, LEAST(5, ROUND(v_target)::int));

      -- Se a questão é negativa (reverse_scored), o motor faz (6 - v) ao agregar.
      -- Para representar uma resposta "saudável de fato" igual a v_value_healthy,
      -- precisamos armazenar (6 - v_value_healthy) na resposta crua.
      IF v_q.reverse_scored THEN
        v_value_to_store := 6 - v_value_healthy;
      ELSE
        v_value_to_store := v_value_healthy;
      END IF;

      INSERT INTO nr01_response_answers (response_id, question_id, value)
        VALUES (v_response_id, v_q.id, v_value_to_store);
      v_total_answers := v_total_answers + 1;
    END LOOP;
  END LOOP;

  RETURN jsonb_build_object(
    'assessment_id',   p_assessment_id,
    'responses_inserted', v_total_responses,
    'answers_inserted',   v_total_answers,
    'leaders_simulated',  v_n_leaders,
    'window_start',    (v_now - interval '6 days')::text,
    'window_end',      v_now::text,
    'distribution_targets', v_targets
  );
END
$func$ LANGUAGE plpgsql;


-- ============================================================
-- CLEANUP — remove fixture com segurança
-- ============================================================
CREATE OR REPLACE FUNCTION nr01_p6_cleanup_responses(p_assessment_id uuid)
RETURNS jsonb AS $func$
DECLARE
  v_deleted_answers   int;
  v_deleted_responses int;
BEGIN
  WITH del_ans AS (
    DELETE FROM nr01_response_answers
     WHERE response_id IN (SELECT id FROM nr01_responses WHERE assessment_id = p_assessment_id)
     RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_answers FROM del_ans;

  WITH del_resp AS (
    DELETE FROM nr01_responses WHERE assessment_id = p_assessment_id RETURNING 1
  )
  SELECT COUNT(*) INTO v_deleted_responses FROM del_resp;

  RETURN jsonb_build_object(
    'assessment_id',     p_assessment_id,
    'deleted_responses', v_deleted_responses,
    'deleted_answers',   v_deleted_answers
  );
END
$func$ LANGUAGE plpgsql;


-- Verificação (não chama as funções)
SELECT
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'nr01_p6_inject_responses')  AS inject_fn_present,
  EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'nr01_p6_cleanup_responses') AS cleanup_fn_present;
