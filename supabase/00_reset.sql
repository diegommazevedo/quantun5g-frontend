-- ============================================================
-- QUANTUM5G — Reset seguro do banco
-- Versão: 1.1 | Data: 2026-03-24
-- Usa DO block com EXCEPTION para nunca falhar se tabela não existe.
-- Ordem: 00_reset.sql → schema.sql → seed.sql → rls.sql
-- ============================================================

DO $$
BEGIN

  -- Drop triggers em auth.users
  DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

  -- Drop functions
  DROP FUNCTION IF EXISTS handle_new_user() CASCADE;
  DROP FUNCTION IF EXISTS set_updated_at()  CASCADE;

  -- Drop tabelas inglês (ordem inversa de dependência)
  DROP TABLE IF EXISTS diagnostic_results CASCADE;
  DROP TABLE IF EXISTS ic_responses       CASCADE;
  DROP TABLE IF EXISTS il_responses       CASCADE;
  DROP TABLE IF EXISTS laudos             CASCADE;
  DROP TABLE IF EXISTS diagnostics        CASCADE;
  DROP TABLE IF EXISTS companies          CASCADE;
  DROP TABLE IF EXISTS profiles           CASCADE;

  -- Drop tabelas português (versão anterior)
  DROP TABLE IF EXISTS resultados_diagnosticos CASCADE;
  DROP TABLE IF EXISTS respostas_ic            CASCADE;
  DROP TABLE IF EXISTS il_respostas            CASCADE;
  DROP TABLE IF EXISTS diagnosticos            CASCADE;
  DROP TABLE IF EXISTS empresas                CASCADE;
  DROP TABLE IF EXISTS perfis                  CASCADE;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Aviso durante reset: % — continuando.', SQLERRM;
END;
$$;

-- Tabelas com acento precisam de tratamento separado (identificadores Unicode)
DO $$
BEGIN
  EXECUTE 'DROP TABLE IF EXISTS "resultados_diagn\u00f3sticos" CASCADE';
  EXECUTE 'DROP TABLE IF EXISTS "diagn\u00f3sticos" CASCADE';
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Aviso acento: % — continuando.', SQLERRM;
END;
$$;

-- Verificacao: deve retornar 0 linhas
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public'
-- ORDER BY table_name;
