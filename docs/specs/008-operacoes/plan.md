# Plano — operações: empréstimos em aberto, devolução e cadastro

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §2 (React Hook Form + `zodResolver`), §3, §4, §6, §7, §8, §10.
- **Regras:** `rules/checks.md`, `rules/tests.md`.
- **Skills:** `supabase-postgres-best-practices` (consultas agregadas).
- **Dependências:** nenhuma nova. **Pré-condição:** Spec 007 em `develop` e conta `operacoes`.
  Sem migration.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/lib/esquemas/operacoes.ts`, `src/lib/esquemas/equipamentos.ts`, `src/server/api/routers/operacoes.ts` | Contrato | 01 |
| `src/server/services/operacoes.ts` | Lista, resumo e últimos cadastros | 02 |
| `src/server/services/encerramento-emprestimo.ts` | Reuso, escopo de tenant | 03 |
| `src/server/services/equipamentos.ts` | Cadastro e alteração de situação | 04, 05 |
| `src/app/(autenticado)/operacoes/**`, `src/components/operacoes/**` | Telas | 06, 07 |

## Desenho

- Todos os procedimentos em `adminProcedure`.
- Conflito de patrimônio vira `PATRIMONIO_DUPLICADO`.
- `alterarSituacao` confere empréstimo em aberto na mesma transação que atualiza.
- Janelas de 3 e 7 dias partem da data atual em São Paulo, com relógio injetado.

## Estratégia de teste

Banco real; uma prova de recusa de `colaborador` por procedimento; dois tenants; datas fixas;
falha forçada de auditoria em devolução, cadastro e alteração. E2E com tRPC simulado; validação
integrada real antes da entrega.
