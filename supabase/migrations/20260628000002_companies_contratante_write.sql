-- Permite que o contratante insira e atualize empresas da sua própria org.
-- As server actions já validam escopo via fetchCompanyForActor (service role),
-- mas o cliente JWT precisa de permissão para a query de dedup (assertNoDuplicate).
-- INSERT e UPDATE são feitos via service role nas actions, então esta migration
-- apenas garante que queries SELECT com JWT funcionem sem surpresas de RLS.
-- O INSERT real usa adminClient após validação de escopo (padrão já adotado em scoped-db).

BEGIN;

-- Política SELECT já existe em 20260617000000; este arquivo documenta a decisão
-- de usar service role para INSERT/UPDATE (sem nova policy de escrita por JWT).
-- Nenhum DDL adicional necessário — as actions usam createServiceRoleAdmin().

COMMIT;
