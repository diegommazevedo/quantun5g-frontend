-- ============================================================
-- QUANTUM5G — Módulo NR-01 | Patch P020 — AUDIT RETROATIVO
-- Agente IA comercial (chat + create-diagnostic).
-- Backfill de governança: o código foi mergeado em produção sem
-- patch de audit log correspondente. Este arquivo registra o
-- evento append-only no nr01_audit_log com hashes SHA-256 das
-- rotas em vigor no momento do P021 (drift fix).
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_020_AGENTE_IA_BACKFILL',
  jsonb_build_object(
    'patch', '020',
    'type', 'agente_ia_comercial',
    'backfill', true,
    'reason', 'audit log retroativo — código mergeado sem patch SQL correspondente; drift detectado durante P021',
    'scope', jsonb_build_array(
      'src/app/api/agente/chat/route.ts',
      'src/app/api/agente/create-diagnostic/route.ts'
    ),
    'hashes', jsonb_build_object(
      'src/app/api/agente/chat/route.ts',
        'sha256:c1eb6b15664b4989d412080f07dab935e8a6acf1ac56a77f00ff6c3bcc1295a8',
      'src/app/api/agente/create-diagnostic/route.ts',
        'sha256:2b3ead703c6d291c266ac2975b759b02fb1119416eba2708e85f8820f39b2934'
    ),
    'capabilities', jsonb_build_array(
      'chat geral SSE com guardrails',
      'criação de diagnóstico via comando [CRIAR_DIAGNOSTICO: {...}]',
      'contexto de relatório com fetchDiagnosticChatContext',
      'persistência de mensagens via saveChatMessage'
    ),
    'rls_dependencies', jsonb_build_array(
      'profiles.role check',
      'diagnostics.consultant_id check'
    ),
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log
  WHERE event_type = 'PATCH_020_AGENTE_IA_BACKFILL'
);

COMMIT;
