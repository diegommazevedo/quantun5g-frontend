-- ============================================================
-- QUANTUM5G — Patch 008: Laudos canônicos (estrutura)
-- Versão: 0.8.0 | Data: 2026-04-19
-- Aplicar APÓS nr01_patch_007.
--
-- Cria duas tabelas para textos canônicos (50 micros + 5 macros)
-- + coluna laudos_pack_sha256 em nr01_evidence_pack.
-- O seed dos textos é aplicado via patch 008b (gerado pelo script
-- _extract_laudos_v1.1.mjs após validação visual).
--
-- RLS: laudos são conteúdo editorial canônico, leitura livre para
-- authenticated. Mutação só via service_role (sem policy).
-- ============================================================

CREATE TABLE IF NOT EXISTS nr01_laudo_textos (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  dimension_code      text NOT NULL REFERENCES nr01_dimensions(code) ON DELETE RESTRICT,
  nivel_risco         text NOT NULL,
  texto_principal     text NOT NULL,
  texto_recomendacao  text NOT NULL,
  instrument_version  text NOT NULL DEFAULT 'v1.1',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr01_laudo_textos_nivel_check CHECK (
    nivel_risco IN ('muito_baixo','baixo','atencao','elevado','critico')
  ),
  CONSTRAINT nr01_laudo_textos_unique UNIQUE (dimension_code, nivel_risco, instrument_version)
);

CREATE TABLE IF NOT EXISTS nr01_laudo_macros (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nivel_risco         text NOT NULL,
  texto_principal     text NOT NULL,
  texto_recomendacao  text NOT NULL,
  instrument_version  text NOT NULL DEFAULT 'v1.1',
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT nr01_laudo_macros_nivel_check CHECK (
    nivel_risco IN ('muito_baixo','baixo','atencao','elevado','critico')
  ),
  CONSTRAINT nr01_laudo_macros_unique UNIQUE (nivel_risco, instrument_version)
);

CREATE INDEX IF NOT EXISTS idx_nr01_laudo_textos_lookup
  ON nr01_laudo_textos (dimension_code, nivel_risco, instrument_version)
  WHERE is_active = true;

-- RLS: leitura para authenticated quando ativo. Sem policy de mutação.
ALTER TABLE nr01_laudo_textos ENABLE ROW LEVEL SECURITY;
ALTER TABLE nr01_laudo_macros ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "nr01_laudo_textos_select" ON nr01_laudo_textos;
DROP POLICY IF EXISTS "nr01_laudo_macros_select" ON nr01_laudo_macros;

CREATE POLICY "nr01_laudo_textos_select" ON nr01_laudo_textos
  FOR SELECT TO authenticated USING (is_active = true);

CREATE POLICY "nr01_laudo_macros_select" ON nr01_laudo_macros
  FOR SELECT TO authenticated USING (is_active = true);

COMMENT ON TABLE nr01_laudo_textos IS
  'Textos canônicos de laudo micro por (dimensão × nível). Derivado literal de NR01_GRO.docx. Hash do conjunto: ver docs/audit/laudos_v1.1_hash.txt.';

COMMENT ON TABLE nr01_laudo_macros IS
  'Textos canônicos de laudo macro (ISO global) por nível. Derivado literal de NR01_GRO.docx.';

-- Coluna nova: hash do pacote de laudos vigente na avaliação
ALTER TABLE nr01_evidence_pack
  ADD COLUMN IF NOT EXISTS laudos_pack_sha256 text;

COMMENT ON COLUMN nr01_evidence_pack.laudos_pack_sha256 IS
  'Hash SHA-256 do conjunto canônico de laudos micro+macro vigente na data desta avaliação. Imutável após emissão.';

-- Verificação
SELECT
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='nr01_laudo_textos') AS tbl_micros,
  EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name='nr01_laudo_macros') AS tbl_macros,
  EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='nr01_evidence_pack' AND column_name='laudos_pack_sha256') AS col_hash;
