-- ============================================================
-- QUANTUM5G — Patch P021 — AUDIT
-- Registro append-only da introdução da arquitetura dual.
-- ============================================================

BEGIN;

INSERT INTO nr01_audit_log (event_type, payload, actor_role)
SELECT
  'PATCH_021_DUAL_ARCH',
  jsonb_build_object(
    'patch', '021',
    'type', 'arquitetura_dual_billing_unificado',
    'scope', jsonb_build_array(
      'supabase/migrations/20260503110000_nr01_patch_021_dual_arch.sql',
      'src/lib/products/registry.ts',
      'src/lib/billing/subscription.ts',
      'src/lib/billing/asaas-client.ts',
      'src/lib/auth/cookie-scope.ts',
      'src/lib/routing/subdomain.ts',
      'src/proxy.ts',
      'src/lib/supabase/middleware.ts',
      'next.config.ts',
      'src/app/page.tsx',
      'src/app/institucional/page.tsx',
      'src/app/(shell)/dashboard/page.tsx',
      'src/app/(shell)/checkout/[productId]/page.tsx',
      'src/app/(shell)/paywall/[productId]/page.tsx',
      'src/app/api/billing/checkout/route.ts',
      'src/app/api/billing/webhook/asaas/route.ts',
      'src/app/api/billing/subscription/route.ts'
    ),
    'tables_created', jsonb_build_array(
      'products', 'product_plans', 'subscriptions', 'payments'
    ),
    'views_created', jsonb_build_array(
      'active_subscriptions'
    ),
    'notes', jsonb_build_array(
      'P017 nunca foi implementado em código — billing introduzido do zero aqui',
      'P020 backfilled em arquivo separado (20260503100000_nr01_patch_020_audit.sql)',
      'Tiers do Pentagrama seedados com active=false até validação RT (Jovane)',
      'company_id usa companies(id) — convenção do schema atual (não organizations)',
      'cookie scope .quantum5g.app só efetiva em produção (HTTPS)',
      'pré-requisitos de runtime: DNS pendente, Vercel Pro pendente'
    ),
    'pending_external_actions', jsonb_build_array(
      'configurar DNS A/CNAME para quantum5g.app, pentagrama.quantum5g.app, nr01.quantum5g.app',
      'ativar Vercel Pro plan',
      'configurar variáveis ASAAS_API_KEY e ASAAS_WEBHOOK_TOKEN',
      'validar tiers Pentagrama com Jovane antes de active=true'
    ),
    'applied_at', now()
  ),
  'consultant'
WHERE NOT EXISTS (
  SELECT 1 FROM nr01_audit_log WHERE event_type = 'PATCH_021_DUAL_ARCH'
);

COMMIT;
