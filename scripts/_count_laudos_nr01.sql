-- Confirma existência (ou ausência) de tabela de laudos oficiais NR-01
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'nr01_laudos') AS tem_tbl_nr01_laudos,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'laudos')      AS tem_tbl_laudos_pentagrama,
  (SELECT COUNT(*) FROM laudos) AS qtd_laudos_pentagrama,
  (SELECT COUNT(DISTINCT dimensao) FROM laudos) AS dimensoes_pentagrama,
  (SELECT COUNT(DISTINCT nivel)    FROM laudos) AS niveis_pentagrama;
