-- ============================================================
-- QUANTUM5G — Migração: Relatório Expandido via Agente IA
-- Permite múltiplos relatórios por diagnóstico (inicial + expandido)
-- ============================================================

-- 1. Adicionar novas colunas
ALTER TABLE ai_reports
  ADD COLUMN IF NOT EXISTS report_type text NOT NULL DEFAULT 'inicial'
    CHECK (report_type IN ('inicial', 'expandido')),
  ADD COLUMN IF NOT EXISTS version integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS source_chat_messages jsonb,
  ADD COLUMN IF NOT EXISTS insights_da_conversa jsonb,
  ADD COLUMN IF NOT EXISTS recomendacoes_adicionais jsonb;

-- 2. Dropar unique constraint antiga (diagnostic_id) e criar composite
-- Nota: o nome da constraint pode variar — tenta ambos
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_diagnostic_id_key;
ALTER TABLE ai_reports DROP CONSTRAINT IF EXISTS ai_reports_diagnostic_id_unique;

-- 3. Criar nova unique constraint composite
ALTER TABLE ai_reports
  ADD CONSTRAINT ai_reports_diagnostic_id_report_type_key
    UNIQUE (diagnostic_id, report_type);

-- 4. Index para busca rápida por tipo
CREATE INDEX IF NOT EXISTS idx_ai_reports_type
  ON ai_reports (diagnostic_id, report_type);

-- 5. RLS: manter políticas existentes (baseadas em diagnostic_id, não afetadas)
-- Nenhuma alteração necessária nas policies existentes.
