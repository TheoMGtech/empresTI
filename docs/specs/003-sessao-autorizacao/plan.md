# Plano — sessão autenticada, tenant e autorização

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §3 (contexto e camadas), §4 (`errorFormatter`), §5 (Prisma Migrate), §6, §7, §8.
- **Regras:** `rules/migration.md`, `rules/checks.md`, `rules/tests.md`, `rules/secrets.md`.
- **Skills:** `supabase` (validação de identidade no servidor) e
  `supabase-postgres-best-practices` (coluna nova).
- **Dependências:** `@phosphor-icons/react`, autorizada em DF-10, instalada só na primeira tarefa
  de interface que usar ícone.
- **Pré-condição:** Spec 002 integrada em `develop`.

## Divisão

- **BE:** `prisma/**`, `src/server/**`, `src/lib/esquemas/**`, testes de banco, provas da Spec 002.
- **FE:** `src/app/**` (exceto `api/`), `src/components/**`, `src/trpc/**`, `e2e/**`.
- O contrato é commitado antes da interface. Só o BE marca `tasks.md`.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/test/provas-finais-spec-002.test.ts`, `src/test/auditoria.test.ts` | Delimitar as provas à Spec 002 | 01 |
| `src/lib/esquemas/sessao.ts`, `src/server/api/routers/sessao.ts`, `src/server/api/raiz.ts` | Contrato e registro do router | 02 |
| `prisma/schema.prisma`, migration nova | `nome_exibicao` | 03 |
| `src/server/api/trpc.ts`, `src/server/services/sessao.ts` | Contexto, middlewares e `errorFormatter` | 04, 05 |
| `prisma/rotinas/vinculo.ts`, `prisma/vincular-professor.ts` | Papel e nome no vínculo | 07 |
| `src/app/(autenticado)/layout.tsx`, `src/components/shell/**` | Shell | 08 |
| `src/app/page.tsx`, `src/app/login/page.tsx` | Destino e sessão | 09 |

## DDL previsto

Sujeito à revisão específica de `rules/migration.md` antes de gerar.

```sql
ALTER TABLE "memberships" ADD COLUMN "nome_exibicao" TEXT;
ALTER TABLE "memberships" ADD CONSTRAINT "memberships_nome_exibicao_nao_vazio"
  CHECK ("nome_exibicao" IS NULL OR length(btrim("nome_exibicao")) > 0);
```

Linhas existentes ficam com `NULL`. Não há preenchimento.

## Estratégia de teste

- Procedimentos com banco real em container, e identidade do Supabase simulada na fronteira.
- Uma prova de recusa por middleware, e prova de isolamento entre tenants.
- Interface com Testing Library. E2E com tRPC simulado no desenvolvimento.
- Validação integrada real antes da entrega (DF-14).

## Paradas

- DDL e geração da migration: apresentar e parar. Geração e reset são do responsável.
- Conta `operacoes`: criada pelo responsável.
