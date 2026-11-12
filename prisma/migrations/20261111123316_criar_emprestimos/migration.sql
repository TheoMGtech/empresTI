/*
  Warnings:

  - A unique constraint covering the columns `[tenant_id,id]` on the table `equipamentos` will be added. If there are existing duplicate values, this will fail.

*/
-- AlterTable
ALTER TABLE "equipamentos" ADD COLUMN     "local" TEXT,
ADD COLUMN     "numero_serie" TEXT,
ADD COLUMN     "observacoes" TEXT;

-- CreateTable
CREATE TABLE "emprestimos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "equipamento_id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "retirado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "devolver_ate" DATE NOT NULL,
    "devolvido_em" TIMESTAMPTZ(6),
    "devolvido_por" UUID,

    CONSTRAINT "emprestimos_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "equipamentos_tenant_id_id_key" ON "equipamentos"("tenant_id", "id");

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_tenant_id_equipamento_id_fkey" FOREIGN KEY ("tenant_id", "equipamento_id") REFERENCES "equipamentos"("tenant_id", "id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- AddForeignKey
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_user_id_tenant_id_fkey" FOREIGN KEY ("user_id", "tenant_id") REFERENCES "memberships"("user_id", "tenant_id") ON DELETE RESTRICT ON UPDATE RESTRICT;

-- O que segue não é representado pelo Prisma (rules/migration.md, DDL aprovado na T-SOLIC-03).

-- CreatePartialIndex: no máximo um empréstimo aberto por equipamento (RN-SOLIC-02)
CREATE UNIQUE INDEX "emprestimos_equipamento_aberto_key"
    ON "emprestimos" ("equipamento_id") WHERE "devolvido_em" IS NULL;
CREATE INDEX "emprestimos_tenant_user_aberto_idx"
    ON "emprestimos" ("tenant_id", "user_id") WHERE "devolvido_em" IS NULL;

-- AddCheckConstraint
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_devolucao_completa"
    CHECK (("devolvido_em" IS NULL) = ("devolvido_por" IS NULL));
ALTER TABLE "emprestimos" ADD CONSTRAINT "emprestimos_prazo_apos_retirada"
    CHECK ("devolver_ate" > ("retirado_em" AT TIME ZONE 'America/Sao_Paulo')::date);

-- EnableRls
ALTER TABLE "emprestimos" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "emprestimos_negar_anon" ON "emprestimos"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "emprestimos_negar_authenticated" ON "emprestimos"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- RevokeTruncate
REVOKE TRUNCATE ON "emprestimos" FROM PUBLIC, anon, authenticated;

-- CreateTruncateGuard (função criada em 20261111063517_reforcar_bloqueio_truncate)
CREATE TRIGGER "emprestimos_sem_truncate" BEFORE TRUNCATE ON "emprestimos"
    FOR EACH STATEMENT EXECUTE FUNCTION "bloquear_truncate"();
ALTER TABLE "emprestimos" ENABLE ALWAYS TRIGGER "emprestimos_sem_truncate";
