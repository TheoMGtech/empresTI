-- This is an empty migration.
-- RevokeTruncate
REVOKE TRUNCATE ON "tenants", "memberships", "equipamentos" FROM PUBLIC, anon, authenticated;

-- CreateTruncateGuard
CREATE FUNCTION "bloquear_truncate"() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'TRUNCATE não é permitido em %', TG_TABLE_NAME;
END;
$$;

CREATE TRIGGER "tenants_sem_truncate" BEFORE TRUNCATE ON "tenants"
    FOR EACH STATEMENT EXECUTE FUNCTION "bloquear_truncate"();
CREATE TRIGGER "memberships_sem_truncate" BEFORE TRUNCATE ON "memberships"
    FOR EACH STATEMENT EXECUTE FUNCTION "bloquear_truncate"();
CREATE TRIGGER "equipamentos_sem_truncate" BEFORE TRUNCATE ON "equipamentos"
    FOR EACH STATEMENT EXECUTE FUNCTION "bloquear_truncate"();

ALTER TABLE "tenants" ENABLE ALWAYS TRIGGER "tenants_sem_truncate";
ALTER TABLE "memberships" ENABLE ALWAYS TRIGGER "memberships_sem_truncate";
ALTER TABLE "equipamentos" ENABLE ALWAYS TRIGGER "equipamentos_sem_truncate";
