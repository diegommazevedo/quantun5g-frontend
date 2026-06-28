-- Torna consultant_id opcional em org_accounts para suportar auto-provisionamento
-- de contratantes via Kiwify (compra self-service sem consultor atribuído).
-- O admin pode vincular um consultor posteriormente via painel admin.

BEGIN;

ALTER TABLE org_accounts
  ALTER COLUMN consultant_id DROP NOT NULL;

COMMIT;
