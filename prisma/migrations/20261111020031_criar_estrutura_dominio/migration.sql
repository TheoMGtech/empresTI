-- CreateEnum
CREATE TYPE "categoria_equipamento" AS ENUM ('notebook', 'monitor', 'cabo', 'camera');

-- CreateEnum
CREATE TYPE "situacao_equipamento" AS ENUM ('ativo', 'em_manutencao', 'fora_de_uso');

-- CreateEnum
CREATE TYPE "papel_membership" AS ENUM ('colaborador', 'operacoes');

-- CreateTable
CREATE TABLE "tenants" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "memberships" (
    "user_id" UUID NOT NULL,
    "tenant_id" UUID NOT NULL,
    "role" "papel_membership" NOT NULL,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "memberships_pkey" PRIMARY KEY ("user_id","tenant_id")
);

-- CreateTable
CREATE TABLE "equipamentos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "patrimonio" TEXT NOT NULL,
    "nome" TEXT NOT NULL,
    "categoria" "categoria_equipamento" NOT NULL,
    "situacao" "situacao_equipamento" NOT NULL DEFAULT 'ativo',
    "imagem_caminho" TEXT,
    "imagem_sha256" TEXT,
    "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "equipamentos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_slug_key" ON "tenants"("slug");

-- CreateIndex
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

-- CreateIndex
CREATE INDEX "equipamentos_tenant_situacao_idx" ON "equipamentos"("tenant_id", "situacao");

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_tenant_patrimonio_key" ON "equipamentos"("tenant_id", "patrimonio");

-- AddForeignKey
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddCheckConstraints
ALTER TABLE "tenants" ADD CONSTRAINT "tenants_slug_nao_vazio"
    CHECK (length(trim("slug")) > 0);
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_patrimonio_nao_vazio"
    CHECK (length(trim("patrimonio")) > 0);
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_nome_nao_vazio"
    CHECK (length(trim("nome")) > 0);
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_imagem_sha256_formato"
    CHECK ("imagem_sha256" ~ '^[0-9a-f]{64}$');
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_imagem_completa"
    CHECK (("imagem_caminho" IS NULL) = ("imagem_sha256" IS NULL));

-- EnableRls
ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "equipamentos" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "tenants_negar_anon" ON "tenants"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "tenants_negar_authenticated" ON "tenants"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "memberships_negar_anon" ON "memberships"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "memberships_negar_authenticated" ON "memberships"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);
CREATE POLICY "equipamentos_negar_anon" ON "equipamentos"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "equipamentos_negar_authenticated" ON "equipamentos"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);
