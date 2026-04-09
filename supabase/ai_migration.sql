-- ═══════════════════════════════════════════════════════════════
-- QUANTUM5G — Entrega 6: Migração IA
-- Rodar inteiramente no SQL Editor do Supabase
-- Idempotente — seguro de rodar múltiplas vezes
-- ═══════════════════════════════════════════════════════════════

-- ── 1. pgvector ──────────────────────────────────────────────────
CREATE EXTENSION IF NOT EXISTS vector;

-- ── 2. ai_reports ────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_reports (
  id                      uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id           uuid        REFERENCES diagnostics(id) ON DELETE CASCADE UNIQUE NOT NULL,
  mode                    text        CHECK (mode IN ('sintetico','analitico')) DEFAULT 'analitico',
  narrativa_executiva     jsonb,      -- { sintetico: "...", analitico: "..." }
  plano_de_acao           jsonb,      -- array de { dimensao, prioridade, narrativa, acoes, prazo, responsavel }
  ferramentas_prescritas  jsonb,      -- array de { nome, dimensao, justificativa_especifica, como_aplicar, resultado_esperado }
  roteiro_devolutiva      jsonb,      -- { abertura, desenvolvimento, fechamento, frases_de_transicao }
  perguntas_aprofundamento jsonb,     -- array de { pergunta, dimensao, objetivo }
  generated_at            timestamptz DEFAULT now(),
  model_used              text        DEFAULT 'llama-3.3-70b-versatile',
  tokens_used             integer,
  generation_time_ms      integer
);

-- ── 3. ai_chat_history ───────────────────────────────────────────
CREATE TABLE IF NOT EXISTS ai_chat_history (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid        REFERENCES diagnostics(id) ON DELETE CASCADE NOT NULL,
  role          text        CHECK (role IN ('user','assistant')) NOT NULL,
  content       text        NOT NULL,
  created_at    timestamptz DEFAULT now()
);

-- Índice para busca paginada por diagnóstico e data
CREATE INDEX IF NOT EXISTS idx_chat_history_diagnostic_created
  ON ai_chat_history(diagnostic_id, created_at DESC);

-- ── 4. diagnostic_embeddings ─────────────────────────────────────
CREATE TABLE IF NOT EXISTS diagnostic_embeddings (
  id            uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnostic_id uuid        REFERENCES diagnostics(id) ON DELETE CASCADE NOT NULL,
  chunk_type    text        NOT NULL, -- 'narrativa' | 'plano_acao' | 'ferramenta' | 'pergunta'
  content       text        NOT NULL,
  embedding     vector(1536),         -- text-embedding-3-small (OpenAI)
  created_at    timestamptz DEFAULT now()
);

-- Índice para busca vetorial (ivfflat — eficiente para até ~1M linhas)
CREATE INDEX IF NOT EXISTS idx_embeddings_diagnostic
  ON diagnostic_embeddings(diagnostic_id);

-- Índice vetorial (requer ao menos 1 linha para criar)
-- Criar após primeiro insert: CREATE INDEX ON diagnostic_embeddings
--   USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ── 5. RLS — ai_reports ──────────────────────────────────────────
ALTER TABLE ai_reports ENABLE ROW LEVEL SECURITY;

-- Admin: tudo
DROP POLICY IF EXISTS ai_reports_admin ON ai_reports;
CREATE POLICY ai_reports_admin ON ai_reports
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Consultor: apenas seus diagnósticos
DROP POLICY IF EXISTS ai_reports_consultant ON ai_reports;
CREATE POLICY ai_reports_consultant ON ai_reports
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ai_reports.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  );

-- ── 6. RLS — ai_chat_history ─────────────────────────────────────
ALTER TABLE ai_chat_history ENABLE ROW LEVEL SECURITY;

-- Admin
DROP POLICY IF EXISTS ai_chat_admin ON ai_chat_history;
CREATE POLICY ai_chat_admin ON ai_chat_history
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Consultor: seus diagnósticos
DROP POLICY IF EXISTS ai_chat_consultant ON ai_chat_history;
CREATE POLICY ai_chat_consultant ON ai_chat_history
  FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM diagnostics d
      WHERE d.id = ai_chat_history.diagnostic_id
        AND d.consultant_id = auth.uid()
    )
  );

-- ── 7. RLS — diagnostic_embeddings ──────────────────────────────
ALTER TABLE diagnostic_embeddings ENABLE ROW LEVEL SECURITY;

-- Somente service_role acessa diretamente (busca via Edge Function)
-- Consultor não precisa de acesso direto
DROP POLICY IF EXISTS embeddings_admin ON diagnostic_embeddings;
CREATE POLICY embeddings_admin ON diagnostic_embeddings
  FOR ALL TO authenticated
  USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ── 8. GRANT — service_role pode inserir sem RLS ─────────────────
-- (service_role bypassa RLS por default no Supabase — confirma nas settings)

-- ── Verificação final ─────────────────────────────────────────────
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c
   WHERE c.table_name = t.table_name AND c.table_schema = 'public') AS colunas
FROM information_schema.tables t
WHERE table_schema = 'public'
  AND table_name IN ('ai_reports','ai_chat_history','diagnostic_embeddings')
ORDER BY table_name;
