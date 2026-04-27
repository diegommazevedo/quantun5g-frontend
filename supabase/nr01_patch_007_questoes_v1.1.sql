-- ============================================================
-- QUANTUM5G — Patch 007: Questões oficiais v1.1
-- Versão: 0.7.0 | Data: 2026-04-20
-- Gerado por: scripts/_extract_oficial_v1.1.mjs
--
-- Fonte literal: docs/audit/NR01_GRO.md (= NR01_GRO.docx)
-- Total: 80 questões (10 dimensões × 8 questões).
-- reverse_scored = FALSE em todas (doc é 100% negativa, maior = pior).
-- Hash SHA-256 do conjunto: d0af4ded3cee7f8427463a382ece3b844b06266b238f5a02789f3a2ee2f5229d
--
-- Estratégia v1.1 paralela:
-- - v1.0 é desativada (is_active=false) — preserva rastreabilidade
-- - v1.1 fica ativa e é o default para novas avaliações
-- - Avaliações em COLETANDO continuam em v1.0 via trigger version_guard
-- ============================================================

BEGIN;

-- 1. Desativar v1.0 (sem deletar)
UPDATE nr01_questions
   SET is_active = false
 WHERE instrument_version = 'v1.0';

-- 2. Inserir 80 questões oficiais v1.1
INSERT INTO nr01_questions
  (dimension_code, ord, text, reverse_scored, instrument_version, is_active)
VALUES
  ('carga_trabalho', 1, E'Percebo que o volume de trabalho é excessivo para minha função.', false, 'v1.1', true),
  ('carga_trabalho', 2, E'Sinto dificuldade em cumprir minhas tarefas dentro do horário normal.', false, 'v1.1', true),
  ('carga_trabalho', 3, E'Percebo pressão constante por resultados no meu trabalho.', false, 'v1.1', true),
  ('carga_trabalho', 4, E'Considero que os prazos estabelecidos são apertados ou irreais.', false, 'v1.1', true),
  ('carga_trabalho', 5, E'Sinto que trabalho em ritmo acelerado na maior parte do tempo.', false, 'v1.1', true),
  ('carga_trabalho', 6, E'Percebo acúmulo de funções além do que foi inicialmente definido.', false, 'v1.1', true),
  ('carga_trabalho', 7, E'Interrupções e urgências frequentes prejudicam meu trabalho.', false, 'v1.1', true),
  ('carga_trabalho', 8, E'Sinto sobrecarga nas atividades que desempenho.', false, 'v1.1', true),
  ('controle_autonomia', 1, E'Percebo falta de autonomia para organizar meu trabalho.', false, 'v1.1', true),
  ('controle_autonomia', 2, E'Sinto que tenho pouca participação em decisões que afetam minha função.', false, 'v1.1', true),
  ('controle_autonomia', 3, E'Recebo orientações contraditórias que dificultam meu desempenho.', false, 'v1.1', true),
  ('controle_autonomia', 4, E'Percebo excesso de controle sobre a forma como realizo minhas tarefas.', false, 'v1.1', true),
  ('controle_autonomia', 5, E'Sinto dificuldade para tomar decisões dentro da minha função.', false, 'v1.1', true),
  ('controle_autonomia', 6, E'Percebo falta de clareza sobre minhas responsabilidades.', false, 'v1.1', true),
  ('controle_autonomia', 7, E'Sinto que não tenho liberdade para propor melhorias no trabalho.', false, 'v1.1', true),
  ('controle_autonomia', 8, E'Percebo insegurança quanto ao que é esperado de mim na função.', false, 'v1.1', true),
  ('exigencias_emocionais', 1, E'Sinto desgaste emocional frequente no trabalho.', false, 'v1.1', true),
  ('exigencias_emocionais', 2, E'Percebo que o trabalho me gera estresse constante.', false, 'v1.1', true),
  ('exigencias_emocionais', 3, E'Tenho dificuldade de me desligar do trabalho fora do expediente.', false, 'v1.1', true),
  ('exigencias_emocionais', 4, E'Sinto que o trabalho afeta negativamente minha vida pessoal.', false, 'v1.1', true),
  ('exigencias_emocionais', 5, E'Percebo pressão emocional nas atividades que desempenho.', false, 'v1.1', true),
  ('exigencias_emocionais', 6, E'Sinto cansaço mental ao final da jornada de trabalho.', false, 'v1.1', true),
  ('exigencias_emocionais', 7, E'Tenho que controlar emoções intensas com frequência no trabalho.', false, 'v1.1', true),
  ('exigencias_emocionais', 8, E'Percebo impacto emocional negativo causado pelo ambiente de trabalho.', false, 'v1.1', true),
  ('reconhecimento', 1, E'Sinto falta de reconhecimento pelo trabalho que realizo.', false, 'v1.1', true),
  ('reconhecimento', 2, E'Percebo ausência de valorização profissional na empresa.', false, 'v1.1', true),
  ('reconhecimento', 3, E'Sinto que meu esforço não é percebido pela liderança.', false, 'v1.1', true),
  ('reconhecimento', 4, E'Percebo falta de feedback sobre meu desempenho.', false, 'v1.1', true),
  ('reconhecimento', 5, E'Sinto injustiça na forma como as pessoas são reconhecidas.', false, 'v1.1', true),
  ('reconhecimento', 6, E'Percebo desequilíbrio entre o que entrego e o que recebo em retorno.', false, 'v1.1', true),
  ('reconhecimento', 7, E'Sinto falta de incentivo para meu desenvolvimento profissional.', false, 'v1.1', true),
  ('reconhecimento', 8, E'Percebo falta de critérios claros para reconhecimento na empresa.', false, 'v1.1', true),
  ('relacoes_interpessoais', 1, E'Percebo falta de respeito entre os colaboradores.', false, 'v1.1', true),
  ('relacoes_interpessoais', 2, E'Sinto dificuldade na comunicação dentro da equipe.', false, 'v1.1', true),
  ('relacoes_interpessoais', 3, E'Percebo conflitos frequentes no ambiente de trabalho.', false, 'v1.1', true),
  ('relacoes_interpessoais', 4, E'Sinto falta de apoio entre os colegas de trabalho.', false, 'v1.1', true),
  ('relacoes_interpessoais', 5, E'Percebo ambiente de trabalho tenso ou desgastante.', false, 'v1.1', true),
  ('relacoes_interpessoais', 6, E'Sinto dificuldade em pedir ajuda quando necessário.', false, 'v1.1', true),
  ('relacoes_interpessoais', 7, E'Percebo comportamentos negativos que prejudicam o clima da equipe.', false, 'v1.1', true),
  ('relacoes_interpessoais', 8, E'Sinto que há pouca colaboração entre os colaboradores.', false, 'v1.1', true),
  ('estabilidade_seguranca', 1, E'Sinto insegurança em relação à minha permanência no trabalho.', false, 'v1.1', true),
  ('estabilidade_seguranca', 2, E'Percebo instabilidade no ambiente organizacional.', false, 'v1.1', true),
  ('estabilidade_seguranca', 3, E'Sinto falta de clareza nas decisões da empresa.', false, 'v1.1', true),
  ('estabilidade_seguranca', 4, E'Percebo mudanças que geram insegurança no ambiente de trabalho.', false, 'v1.1', true),
  ('estabilidade_seguranca', 5, E'Sinto receio de ser prejudicado profissionalmente.', false, 'v1.1', true),
  ('estabilidade_seguranca', 6, E'Percebo falta de previsibilidade nas ações da empresa.', false, 'v1.1', true),
  ('estabilidade_seguranca', 7, E'Sinto falta de confiança na condução da organização.', false, 'v1.1', true),
  ('estabilidade_seguranca', 8, E'Percebo ambiente de trabalho instável.', false, 'v1.1', true),
  ('assedio_violencia', 1, E'Já presenciei situações de desrespeito no ambiente de trabalho.', false, 'v1.1', true),
  ('assedio_violencia', 2, E'Percebo comportamentos abusivos ou autoritários.', false, 'v1.1', true),
  ('assedio_violencia', 3, E'Sinto receio de me posicionar por medo de represálias.', false, 'v1.1', true),
  ('assedio_violencia', 4, E'Percebo tratamento desigual entre as pessoas.', false, 'v1.1', true),
  ('assedio_violencia', 5, E'Já vivenciei ou observei situações constrangedoras no trabalho.', false, 'v1.1', true),
  ('assedio_violencia', 6, E'Percebo falta de ação diante de situações de desrespeito.', false, 'v1.1', true),
  ('assedio_violencia', 7, E'Sinto que não há segurança para relatar problemas internos.', false, 'v1.1', true),
  ('assedio_violencia', 8, E'Percebo ambiente propício a conflitos ou abusos.', false, 'v1.1', true),
  ('organizacao_trabalho', 1, E'Percebo falta de recursos para executar meu trabalho.', false, 'v1.1', true),
  ('organizacao_trabalho', 2, E'Sinto que problemas de organização aumentam meu desgaste.', false, 'v1.1', true),
  ('organizacao_trabalho', 3, E'Percebo falhas na distribuição das tarefas.', false, 'v1.1', true),
  ('organizacao_trabalho', 4, E'Sinto que há retrabalho frequente na minha rotina.', false, 'v1.1', true),
  ('organizacao_trabalho', 5, E'Percebo desorganização nos processos internos.', false, 'v1.1', true),
  ('organizacao_trabalho', 6, E'Sinto que a equipe é insuficiente para a demanda de trabalho.', false, 'v1.1', true),
  ('organizacao_trabalho', 7, E'Percebo falta de definição clara de responsabilidades.', false, 'v1.1', true),
  ('organizacao_trabalho', 8, E'Sinto que a forma como o trabalho é organizado gera estresse.', false, 'v1.1', true),
  ('lideranca_gestao', 1, E'Percebo falhas na comunicação da liderança.', false, 'v1.1', true),
  ('lideranca_gestao', 2, E'Sinto falta de apoio da liderança no dia a dia.', false, 'v1.1', true),
  ('lideranca_gestao', 3, E'Percebo atitudes da liderança que geram pressão desnecessária.', false, 'v1.1', true),
  ('lideranca_gestao', 4, E'Sinto dificuldade de diálogo com minha liderança.', false, 'v1.1', true),
  ('lideranca_gestao', 5, E'Percebo tratamento inadequado por parte da liderança.', false, 'v1.1', true),
  ('lideranca_gestao', 6, E'Sinto falta de orientação clara para execução do trabalho.', false, 'v1.1', true),
  ('lideranca_gestao', 7, E'Percebo falta de equilíbrio na gestão das pessoas.', false, 'v1.1', true),
  ('lideranca_gestao', 8, E'Sinto que a liderança contribui para o aumento do estresse no trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 1, E'Sinto desgaste mental relacionado ao trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 2, E'Percebo impacto negativo do trabalho no meu bem-estar.', false, 'v1.1', true),
  ('saude_bem_estar', 3, E'Sinto cansaço excessivo devido ao trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 4, E'Percebo aumento de estresse ou ansiedade relacionado ao trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 5, E'Sinto que o trabalho afeta minha saúde emocional.', false, 'v1.1', true),
  ('saude_bem_estar', 6, E'Percebo dificuldade de recuperação após a jornada de trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 7, E'Já pensei em sair da empresa por causa do ambiente de trabalho.', false, 'v1.1', true),
  ('saude_bem_estar', 8, E'Sinto que o ambiente de trabalho não favorece minha saúde.', false, 'v1.1', true)
ON CONFLICT (dimension_code, ord, instrument_version) DO UPDATE SET
  text = EXCLUDED.text,
  reverse_scored = EXCLUDED.reverse_scored,
  is_active = EXCLUDED.is_active;

-- 3. Verificação interna
DO $$
DECLARE
  n_v11_active   int;
  n_v10_active   int;
  n_reverse_v11  int;
  n_dims_v11     int;
BEGIN
  SELECT COUNT(*) INTO n_v11_active
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND is_active = true;

  SELECT COUNT(*) INTO n_v10_active
    FROM nr01_questions
   WHERE instrument_version = 'v1.0' AND is_active = true;

  SELECT COUNT(*) INTO n_reverse_v11
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND reverse_scored = true;

  SELECT COUNT(DISTINCT dimension_code) INTO n_dims_v11
    FROM nr01_questions
   WHERE instrument_version = 'v1.1' AND is_active = true;

  IF n_v11_active <> 80 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 deveria ter 80 questões ativas, tem %', n_v11_active;
  END IF;

  IF n_v10_active <> 0 THEN
    RAISE EXCEPTION 'Patch 007: v1.0 deveria ter 0 questões ativas, tem %', n_v10_active;
  END IF;

  IF n_reverse_v11 <> 0 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 não deveria ter questões reverse_scored (todas negativas), tem %', n_reverse_v11;
  END IF;

  IF n_dims_v11 <> 10 THEN
    RAISE EXCEPTION 'Patch 007: v1.1 deveria cobrir 10 dimensões, cobre %', n_dims_v11;
  END IF;

  RAISE NOTICE 'Patch 007: OK (80 ativas v1.1, 10 dimensões, 0 reverse, 0 ativas v1.0)';
END $$;

COMMIT;
