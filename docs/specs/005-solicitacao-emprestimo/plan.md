# Plano — detalhe do equipamento e solicitação de empréstimo

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §3, §5 (Prisma Migrate, policies em SQL), §6, §7, §8, §10 (auditoria).
- **Regras:** `rules/migration.md`, `rules/checks.md`, `rules/tests.md`.
- **Skills:** `supabase` e `supabase-postgres-best-practices` (tabela, RLS, índice parcial).
- **Dependências:** Radix Dialog, autorizado em DF-10, instalado só na primeira tarefa que precisar.
- **Pré-condição:** Specs 003 e 004 integradas em `develop`.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/test/estrutura-dominio.test.ts`, `prisma/rotinas/carga.test.ts`, `prisma/rotinas/vinculo.test.ts` | Delimitar provas à Spec 002 | 01 |
| `src/lib/esquemas/emprestimos.ts`, `src/server/api/routers/emprestimos.ts` | Contrato | 02 |
| `prisma/schema.prisma`, migration nova | Tabela e colunas | 03 |
| `src/server/services/emprestimos.ts`, `src/lib/prazos.ts` | Solicitação e prazo | 05 |
| `src/server/services/equipamentos.ts` | Detalhe e estado emprestado | 04, 06 |
| `src/app/(autenticado)/catalogo/[patrimonio]/page.tsx`, `src/components/catalogo/**` | Tela e diálogo | 07 |

## DDL previsto

Sujeito à revisão específica de `rules/migration.md` antes de gerar.

```sql
ALTER TABLE "equipamentos"
  ADD COLUMN "numero_serie" TEXT, ADD COLUMN "local" TEXT, ADD COLUMN "observacoes" TEXT;
ALTER TABLE "equipamentos" ADD CONSTRAINT "equipamentos_tenant_id_id_key" UNIQUE ("tenant_id", "id");

CREATE TABLE "emprestimos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL,
  "equipamento_id" UUID NOT NULL,
  "user_id" UUID NOT NULL,
  "retirado_em" TIMESTAMPTZ NOT NULL DEFAULT now(),
  "devolver_ate" DATE NOT NULL,
  "devolvido_em" TIMESTAMPTZ,
  "devolvido_por" UUID,
  FOREIGN KEY ("tenant_id", "equipamento_id") REFERENCES "equipamentos" ("tenant_id", "id"),
  FOREIGN KEY ("user_id", "tenant_id") REFERENCES "memberships" ("user_id", "tenant_id")
);
CREATE UNIQUE INDEX "emprestimos_equipamento_aberto_key"
  ON "emprestimos" ("equipamento_id") WHERE "devolvido_em" IS NULL;
CREATE INDEX "emprestimos_tenant_user_aberto_idx"
  ON "emprestimos" ("tenant_id", "user_id") WHERE "devolvido_em" IS NULL;
```

Mais, no SQL da migration: RLS habilitada, policies, `REVOKE TRUNCATE` e trigger
`bloquear_truncate` com `ENABLE ALWAYS`. Linhas existentes de `equipamentos` ficam com `NULL`.

## Desenho

- Solicitação em uma transação: leitura do equipamento, inserção e auditoria.
- Conflito no índice parcial vira `EQUIPAMENTO_INDISPONIVEL`.
- `devolver_ate` é a data de São Paulo no momento da confirmação, somada a 14 dias corridos.

## Estratégia de teste

Banco real para concorrência, FK composta, RLS e `TRUNCATE`; relógio injetado com datas fixas;
falha forçada de auditoria para provar rollback. E2E com tRPC simulado; validação integrada real
antes da entrega.

## Paradas

DDL e geração da migration: apresentar e parar. Geração e reset são do responsável.
