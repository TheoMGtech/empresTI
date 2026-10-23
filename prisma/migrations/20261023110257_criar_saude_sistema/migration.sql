-- CreateTable
CREATE TABLE "saude_sistema" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "componente" TEXT NOT NULL,
    "verificado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saude_sistema_pkey" PRIMARY KEY ("id"),
    CONSTRAINT "saude_sistema_componente_nao_vazio"
        CHECK (length(trim("componente")) > 0)
);

-- CreateIndex
CREATE INDEX "saude_sistema_tenant_id_idx" ON "saude_sistema"("tenant_id");

-- EnableRls
ALTER TABLE "saude_sistema" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "saude_sistema_negar_anon"
    ON "saude_sistema"
    FOR ALL TO anon
    USING (false) WITH CHECK (false);

CREATE POLICY "saude_sistema_negar_authenticated"
    ON "saude_sistema"
    FOR ALL TO authenticated
    USING (false) WITH CHECK (false);
