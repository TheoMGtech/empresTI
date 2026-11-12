-- CreateTable
CREATE TABLE "auditoria" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "ator" TEXT NOT NULL,
    "acao" TEXT NOT NULL,
    "recurso" TEXT NOT NULL,
    "ocorrido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "auditoria_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "auditoria_tenant_ocorrido_idx" ON "auditoria"("tenant_id", "ocorrido_em");

-- AddForeignKey
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddCheckConstraints
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_ator_nao_vazio"
    CHECK (length(trim("ator")) > 0);
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_acao_nao_vazia"
    CHECK (length(trim("acao")) > 0);
ALTER TABLE "auditoria" ADD CONSTRAINT "auditoria_recurso_nao_vazio"
    CHECK (length(trim("recurso")) > 0);

-- CreateAppendOnlyGuard
CREATE FUNCTION "auditoria_bloquear_mutacao"() RETURNS trigger
    LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
    RAISE EXCEPTION 'auditoria é append-only';
END;
$$;
REVOKE ALL ON FUNCTION "auditoria_bloquear_mutacao"() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER "auditoria_sem_alteracao" BEFORE UPDATE OR DELETE ON "auditoria"
    FOR EACH ROW EXECUTE FUNCTION "auditoria_bloquear_mutacao"();
CREATE TRIGGER "auditoria_sem_truncate" BEFORE TRUNCATE ON "auditoria"
    FOR EACH STATEMENT EXECUTE FUNCTION "auditoria_bloquear_mutacao"();
ALTER TABLE "auditoria" ENABLE ALWAYS TRIGGER "auditoria_sem_alteracao";
ALTER TABLE "auditoria" ENABLE ALWAYS TRIGGER "auditoria_sem_truncate";

-- EnableRls
ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "auditoria_negar_anon" ON "auditoria"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "auditoria_negar_authenticated" ON "auditoria"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);
