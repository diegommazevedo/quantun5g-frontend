-- ============================================================
-- QUANTUM5G — Verificação completa do resultado calculado
-- Rodar após chamar a Edge Function
-- ============================================================

-- 1. Scores IC por dimensão + nível esperado
SELECT
  'IC scores' AS secao,
  round(ic_fisica_pct,1)   AS fisica_pct,
  round(ic_afetiva_pct,1)  AS afetiva_pct,
  round(ic_racional_pct,1) AS racional_pct,
  round(ic_social_pct,1)   AS social_pct,
  round(ic_cultural_pct,1) AS cultural_pct,
  round(ic_global_pct,1)   AS global_pct
FROM diagnostic_results
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 2. Níveis IC por dimensão (base dos laudos)
SELECT
  'Niveis IC' AS secao,
  nivel_ic_fisica,
  nivel_ic_afetiva,
  nivel_ic_racional,
  nivel_ic_social,
  nivel_ic_cultural,
  nivel_combined
FROM diagnostic_results
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 3. Scores IL + gaps
SELECT
  'IL + Gaps' AS secao,
  round(il_fisica_pct,1)  AS il_fisica,
  round(il_cultural_pct,1) AS il_cultural,
  round(gap_fisica,1)     AS gap_fisica,
  round(gap_cultural,1)   AS gap_cultural,
  n_ic_respondents,
  ic_weight,
  il_weight,
  display_level
FROM diagnostic_results
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 4. Scores combinados
SELECT
  'Combinados' AS secao,
  round(combined_fisica_pct,1)   AS fisica,
  round(combined_afetiva_pct,1)  AS afetiva,
  round(combined_racional_pct,1) AS racional,
  round(combined_social_pct,1)   AS social,
  round(combined_cultural_pct,1) AS cultural,
  round(combined_global_pct,1)   AS global
FROM diagnostic_results
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 5. Scores de bloco IC (confirmar que são os blocos reais, não divisão de 5)
SELECT
  'Blocos IC' AS secao,
  round(ic_bloco_fa_pct,1) AS fa, round(ic_bloco_fb_pct,1) AS fb, round(ic_bloco_fc_pct,1) AS fc,
  round(ic_bloco_a1_pct,1) AS a1, round(ic_bloco_a2_pct,1) AS a2, round(ic_bloco_a3_pct,1) AS a3,
  round(ic_bloco_r1_pct,1) AS r1, round(ic_bloco_r2_pct,1) AS r2,
  round(ic_bloco_sa_pct,1) AS sa, round(ic_bloco_sb_pct,1) AS sb, round(ic_bloco_sc_pct,1) AS sc,
  round(ic_bloco_ca_pct,1) AS ca, round(ic_bloco_cb_pct,1) AS cb, round(ic_bloco_cc_pct,1) AS cc
FROM diagnostic_results
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 6. Alertas (jsonb) — expandidos
SELECT
  alerta->>'tipo'      AS tipo,
  alerta->>'descricao' AS descricao,
  alerta->>'dimensao'  AS dimensao,
  alerta->>'questao'   AS questao,
  alerta->>'media'     AS media,
  alerta->>'n'         AS n
FROM diagnostic_results,
     jsonb_array_elements(alerts) AS alerta
WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001'
ORDER BY tipo;

-- 7. Laudos selecionados (confirmar que é pelo nível IC)
SELECT
  'Laudos' AS secao,
  dr.nivel_ic_fisica    AS nivel_ic_fisica,
  lf.dimensao           AS laudo_fisica_dim,
  lf.nivel              AS laudo_fisica_nivel,
  dr.nivel_ic_cultural  AS nivel_ic_cultural,
  lc.dimensao           AS laudo_cultural_dim,
  lc.nivel              AS laudo_cultural_nivel,
  LEFT(lc.texto, 60)    AS laudo_cultural_inicio
FROM diagnostic_results dr
LEFT JOIN laudos lf ON lf.id = dr.laudo_fisica_id
LEFT JOIN laudos lc ON lc.id = dr.laudo_cultural_id
WHERE dr.diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- 8. Status do diagnóstico (deve ser RELATORIO_GERADO)
SELECT id, status, name
FROM diagnostics
WHERE id = 'bbbbbbbb-0001-0001-0001-000000000001';

-- ============================================================
-- LIMPEZA (rodar após validação)
-- DELETE FROM diagnostic_results WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';
-- DELETE FROM ic_responses        WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';
-- DELETE FROM il_responses        WHERE diagnostic_id = 'bbbbbbbb-0001-0001-0001-000000000001';
-- DELETE FROM diagnostics         WHERE id            = 'bbbbbbbb-0001-0001-0001-000000000001';
-- DELETE FROM companies           WHERE id            = 'aaaaaaaa-0001-0001-0001-000000000001';
-- ============================================================
