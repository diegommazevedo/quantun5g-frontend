-- Catálogo comercial NR-01 t01–t15 (COERENCIA-LP-SAAS §3.1)
-- Desativa planos legados Essencial–Corporativo.

BEGIN;

UPDATE product_plans SET active = false WHERE product_id = 'nr01';

INSERT INTO product_plans
  (id, product_id, name, collaborators_min, collaborators_max, price_cents, modality, assessments_per_period, active)
VALUES
  ('nr01_t01', 'nr01', 'NR-01 · 0–5 trabalhadores', 0, 5, 246000, 'annual', 99, true),
  ('nr01_t02', 'nr01', 'NR-01 · 6–10 trabalhadores', 6, 10, 362400, 'annual', 99, true),
  ('nr01_t03', 'nr01', 'NR-01 · 11–15 trabalhadores', 11, 15, 421200, 'annual', 99, true),
  ('nr01_t04', 'nr01', 'NR-01 · 16–20 trabalhadores', 16, 20, 480000, 'annual', 99, true),
  ('nr01_t05', 'nr01', 'NR-01 · 21–30 trabalhadores', 21, 30, 573600, 'annual', 99, true),
  ('nr01_t06', 'nr01', 'NR-01 · 31–40 trabalhadores', 31, 40, 655200, 'annual', 99, true),
  ('nr01_t07', 'nr01', 'NR-01 · 41–50 trabalhadores', 41, 50, 736800, 'annual', 99, true),
  ('nr01_t08', 'nr01', 'NR-01 · 51–60 trabalhadores', 51, 60, 807600, 'annual', 99, true),
  ('nr01_t09', 'nr01', 'NR-01 · 61–80 trabalhadores', 61, 80, 960000, 'annual', 99, true),
  ('nr01_t10', 'nr01', 'NR-01 · 81–100 trabalhadores', 81, 100, 1100400, 'annual', 99, true),
  ('nr01_t11', 'nr01', 'NR-01 · 101–200 trabalhadores', 101, 200, 1755600, 'annual', 99, true),
  ('nr01_t12', 'nr01', 'NR-01 · 201–300 trabalhadores', 201, 300, 2281200, 'annual', 99, true),
  ('nr01_t13', 'nr01', 'NR-01 · 301–500 trabalhadores', 301, 500, 3042000, 'annual', 99, true),
  ('nr01_t14', 'nr01', 'NR-01 · 501–750 trabalhadores', 501, 750, 3978000, 'annual', 99, true),
  ('nr01_t15', 'nr01', 'NR-01 · 751–1.000 trabalhadores', 751, 1000, 4914000, 'annual', 99, true)
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  collaborators_min = EXCLUDED.collaborators_min,
  collaborators_max = EXCLUDED.collaborators_max,
  price_cents = EXCLUDED.price_cents,
  modality = EXCLUDED.modality,
  assessments_per_period = EXCLUDED.assessments_per_period,
  active = EXCLUDED.active;

COMMIT;
