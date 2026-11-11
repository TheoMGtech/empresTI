-- AlterTable
ALTER TABLE "memberships" ADD COLUMN     "nome_exibicao" TEXT;

-- AddCheckConstraint (o Prisma não representa CHECK no schema)
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_nome_exibicao_nao_vazio"
  CHECK ("nome_exibicao" IS NULL OR length(btrim("nome_exibicao")) > 0);
