-- CreateTable
CREATE TABLE "limites_requisicao" (
    "escopo" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "janela_inicio" TIMESTAMPTZ(6) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "limites_requisicao_pkey" PRIMARY KEY ("escopo","identificador","janela_inicio")
);

-- CreateIndex
CREATE INDEX "limites_requisicao_expira_em_idx" ON "limites_requisicao"("expira_em");

-- Spec 009 (T-SEG-05, CA-SEG-14): o que o Prisma não representa. Tabela técnica sem `tenant_id`
-- (exceção aprovada só para ela): identificadores são HMAC por escopo, nunca e-mail ou IP em claro.

-- AddCheck
ALTER TABLE "limites_requisicao"
    ADD CONSTRAINT "limites_requisicao_escopo_check"
        CHECK ("escopo" IN ('login_ip', 'login_email', 'mutacao_ip', 'mutacao_usuario')),
    ADD CONSTRAINT "limites_requisicao_identificador_check"
        CHECK ("identificador" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "limites_requisicao_contador_check" CHECK ("contador" >= 0),
    ADD CONSTRAINT "limites_requisicao_janela_check" CHECK ("expira_em" > "janela_inicio");

-- EnableRLS
ALTER TABLE "limites_requisicao" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "limites_requisicao_negar_anon" ON "limites_requisicao"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "limites_requisicao_negar_authenticated" ON "limites_requisicao"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- RevokePrivileges
REVOKE ALL ON "limites_requisicao" FROM PUBLIC, anon, authenticated;
