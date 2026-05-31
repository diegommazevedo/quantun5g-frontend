-- NR-01 — Planos comerciais v2 (página de vendas 2026-05)
-- Assinatura anual · faixas 50 / 120 / 200 / 200+

BEGIN;

UPDATE product_plans SET active = false WHERE product_id = 'nr01';

INSERT INTO product_plans
  (id, product_id, name, collaborators_min, collaborators_max,
   price_cents, modality, assessments_per_period, active)
VALUES
  ('nr01_essencial',   'nr01', 'Essencial',     1,   50,   480000, 'annual',  4, true),
  ('nr01_operacional', 'nr01', 'Operacional',   1,  120,   960000, 'annual',  6, true),
  ('nr01_estruturado', 'nr01', 'Estruturado',   1,  200,  1200000, 'annual', 12, true),
  ('nr01_corporativo', 'nr01', 'Corporativo', 201, NULL,       0, 'annual',  0, false)
ON CONFLICT (id) DO UPDATE SET
  name                    = EXCLUDED.name,
  collaborators_min       = EXCLUDED.collaborators_min,
  collaborators_max       = EXCLUDED.collaborators_max,
  price_cents             = EXCLUDED.price_cents,
  modality                = EXCLUDED.modality,
  assessments_per_period  = EXCLUDED.assessments_per_period,
  active                  = EXCLUDED.active;

COMMIT;
