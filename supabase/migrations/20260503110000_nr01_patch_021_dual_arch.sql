-- ============================================================
-- QUANTUM5G — Patch P021 — ARQUITETURA DUAL (BILLING UNIFICADO)
-- Introduz catálogo de produtos (Pentagrama + NR-01), planos,
-- assinaturas unificadas e pagamentos via Asaas.
--
-- HISTÓRICO IMPORTANTE:
--   - P017 (originalmente previsto para criar nr01_subscriptions)
--     NUNCA foi implementado em código. Por isso este patch é o
--     primeiro a introduzir a camada de billing — não há migração
--     de dados (não há tabela origem).
--   - As 4 tiers do Pentagrama abaixo são PROPOSTAS pendentes de
--     validação por Diego e Jovane (RT). Podem ser ajustadas via
--     hotfix sem impacto estrutural.
--
-- ORDEM DE CRIAÇÃO (dependências):
--   1. products             (catálogo)
--   2. product_plans        (depende de products)
--   3. subscriptions        (depende de products, product_plans, auth.users, companies)
--   4. payments             (depende de subscriptions)
--   5. active_subscriptions (view sobre subscriptions + products)
--   6. RLS                  (subscriptions, payments)
-- ============================================================

BEGIN;

-- ---------- 1. products -------------------------------------
CREATE TABLE IF NOT EXISTS products (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  subdomain   text NOT NULL UNIQUE,
  description text,
  active      boolean NOT NULL DEFAULT true,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- subdomain do livro: 'livro' é placeholder (não há DNS dedicado).
-- O livro é vendido via CTA na landing institucional, não via subdomínio
-- próprio. O registry em src/lib/products/registry.ts NÃO inclui o livro
-- por isso (não aparece como card no apex shell).
INSERT INTO products (id, name, subdomain, description) VALUES
  ('pentagrama', 'Pentagrama de Ginger', 'pentagrama',
   'Diagnóstico organizacional via método Pentagrama de Ginger.'),
  ('nr01', 'Quantum5G NR-01', 'nr01',
   'Avaliação técnica de fatores psicossociais conforme NR-01.'),
  ('livro_pentagrama', 'Livro · O Pentagrama de Ginger', 'livro',
   'Livro físico/digital do método Pentagrama de Ginger por Jovane Borlini.')
ON CONFLICT (id) DO NOTHING;


-- ---------- 2. product_plans --------------------------------
CREATE TABLE IF NOT EXISTS product_plans (
  id                      text PRIMARY KEY,
  product_id              text NOT NULL REFERENCES products(id),
  name                    text NOT NULL,
  collaborators_min       int  NOT NULL,
  collaborators_max       int,                   -- null = ilimitado
  price_cents             int  NOT NULL,
  modality                text NOT NULL CHECK (modality IN ('one_off','annual','monthly')),
  assessments_per_period  int  NOT NULL,
  active                  boolean NOT NULL DEFAULT true,
  created_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_plans_product ON product_plans(product_id);

-- Seed: 4 tiers oficiais do NR-01 (validados, podem ir para produção)
INSERT INTO product_plans
  (id, product_id, name, collaborators_min, collaborators_max,
   price_cents, modality, assessments_per_period, active)
VALUES
  ('nr01_essencial',   'nr01', 'Essencial',     1,   19,   280000, 'one_off', 1, true),
  ('nr01_operacional', 'nr01', 'Operacional',  20,   99,   550000, 'one_off', 1, true),
  ('nr01_estruturado', 'nr01', 'Estruturado', 100,  499,  1960000, 'annual',  2, true),
  ('nr01_corporativo', 'nr01', 'Corporativo', 500, NULL,  6000000, 'annual',  4, true)
ON CONFLICT (id) DO NOTHING;

-- ============================================================
-- TODO_RT_PENTAGRAMA: validar preços/modalidade/assessments antes
-- de virar active=true. Três decisões pendentes para Diego + Jovane
-- em call dedicada:
--
--   (1) PREÇOS: os valores abaixo (R$ 2.400 / 4.800 / 16.800 / 48.000)
--       são especulação inicial sem fundamento metodológico.
--       Pentagrama pode ter ticket maior, menor ou modelo diferente
--       do NR-01.
--
--   (2) MODALIDADE: Pentagrama é venda transacional (uma vez,
--       diagnóstico finito) ou recorrente (consultoria contínua de
--       cultura)? Resposta muda o produto inteiro.
--
--   (3) ASSESSMENTS_PER_PERIOD: três modelos possíveis —
--       (a) 1/2/4 igual ao NR-01;
--       (b) 1 diagnóstico inicial + N pulsos contínuos;
--       (c) diagnósticos ilimitados em janela.
--
-- Após validação, fazer UPDATE manual no banco (NÃO precisa novo patch).
-- ============================================================
-- Seed: 4 tiers do Pentagrama — PROPOSTA, AGUARDA VALIDAÇÃO RT (Jovane).
-- Inativos por padrão (active=false) até confirmação dos preços/limites.
INSERT INTO product_plans
  (id, product_id, name, collaborators_min, collaborators_max,
   price_cents, modality, assessments_per_period, active)
VALUES
  ('pent_essencial',   'pentagrama', 'Essencial',     1,   19,   240000, 'one_off', 1, false),
  ('pent_operacional', 'pentagrama', 'Operacional',  20,   99,   480000, 'one_off', 1, false),
  ('pent_estruturado', 'pentagrama', 'Estruturado', 100,  499,  1680000, 'annual',  2, false),
  ('pent_corporativo', 'pentagrama', 'Corporativo', 500, NULL,  4800000, 'annual',  4, false)
ON CONFLICT (id) DO NOTHING;

-- Seed: livro do Pentagrama — preço VALIDADO por Diego (R$ 67), entra
-- ativo direto. collaborators_min=1 / max=null pois não se aplica.
-- assessments_per_period=0 (livro não inclui diagnóstico).
-- Pós-compra: o webhook ativa subscription; o fluxo de download/envio
-- do livro é responsabilidade futura (não escopo do P021).
INSERT INTO product_plans
  (id, product_id, name, collaborators_min, collaborators_max,
   price_cents, modality, assessments_per_period, active)
VALUES
  ('livro_unico', 'livro_pentagrama', 'Livro O Pentagrama de Ginger',
   1, NULL, 6700, 'one_off', 0, true)
ON CONFLICT (id) DO NOTHING;


-- ---------- 3. subscriptions --------------------------------
-- company_id (não organization_id): segue a convenção pré-existente
-- do schema (tabela companies já é o conceito de organização).
CREATE TABLE IF NOT EXISTS subscriptions (
  id                      uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id                 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  product_id              text NOT NULL REFERENCES products(id),
  plan_id                 text NOT NULL REFERENCES product_plans(id),
  company_id              uuid REFERENCES companies(id) ON DELETE SET NULL,
  status                  text NOT NULL CHECK (status IN
                            ('pending','active','expired','cancelled','failed')),
  starts_at               timestamptz,
  expires_at              timestamptz,
  assessments_remaining   int  NOT NULL DEFAULT 0,
  asaas_customer_id       text,
  asaas_payment_id        text,
  asaas_subscription_id   text,
  metadata                jsonb NOT NULL DEFAULT '{}',
  created_at              timestamptz NOT NULL DEFAULT now(),
  updated_at              timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_subs_user    ON subscriptions(user_id);
CREATE INDEX IF NOT EXISTS idx_subs_product ON subscriptions(product_id);
CREATE INDEX IF NOT EXISTS idx_subs_status  ON subscriptions(status);

-- Garantia: um usuário só pode ter UMA assinatura ativa por produto.
-- (renovações criam novas linhas com status historicamente correto.)
CREATE UNIQUE INDEX IF NOT EXISTS idx_subs_user_product_active
  ON subscriptions(user_id, product_id)
  WHERE status = 'active';

-- Trigger updated_at
CREATE OR REPLACE FUNCTION subscriptions_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_subscriptions_updated_at ON subscriptions;
CREATE TRIGGER trg_subscriptions_updated_at
  BEFORE UPDATE ON subscriptions
  FOR EACH ROW EXECUTE FUNCTION subscriptions_set_updated_at();


-- ---------- 4. payments -------------------------------------
CREATE TABLE IF NOT EXISTS payments (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id       uuid NOT NULL REFERENCES subscriptions(id) ON DELETE CASCADE,
  asaas_payment_id      text NOT NULL UNIQUE,
  amount_cents          int  NOT NULL,
  status                text NOT NULL,
  payment_method        text,
  paid_at               timestamptz,
  webhook_payload       jsonb NOT NULL,
  webhook_received_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_pay_sub   ON payments(subscription_id);
CREATE INDEX IF NOT EXISTS idx_pay_asaas ON payments(asaas_payment_id);


-- ---------- 5. active_subscriptions (view) ------------------
DROP VIEW IF EXISTS active_subscriptions;
CREATE VIEW active_subscriptions AS
SELECT
  s.id,
  s.user_id,
  s.product_id,
  s.plan_id,
  p.subdomain,
  s.expires_at,
  s.assessments_remaining,
  s.company_id
FROM subscriptions s
JOIN products p ON p.id = s.product_id
WHERE s.status = 'active'
  AND (s.expires_at IS NULL OR s.expires_at > now());


-- ---------- 6. RLS ------------------------------------------
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE payments      ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS subs_select_own       ON subscriptions;
DROP POLICY IF EXISTS subs_select_admin     ON subscriptions;
DROP POLICY IF EXISTS pay_select_own        ON payments;
DROP POLICY IF EXISTS pay_select_admin      ON payments;

CREATE POLICY subs_select_own ON subscriptions
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY subs_select_admin ON subscriptions
  FOR SELECT USING (get_my_role() = 'admin');

CREATE POLICY pay_select_own ON payments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM subscriptions s
      WHERE s.id = payments.subscription_id
        AND s.user_id = auth.uid()
    )
  );

CREATE POLICY pay_select_admin ON payments
  FOR SELECT USING (get_my_role() = 'admin');

-- Sem políticas públicas de INSERT/UPDATE/DELETE: o webhook do
-- Asaas e o endpoint de checkout usam service_role e bypass RLS.

COMMIT;
