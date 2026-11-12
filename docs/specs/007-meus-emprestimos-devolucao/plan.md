# Plano — meus empréstimos, devolução e histórico

## Estado

**Status:** APROVADO — pelo responsável em 2026-11-11. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §3, §4 (paginação por cursor), §6, §8, §10.
- **Regras:** `rules/checks.md`, `rules/tests.md`.
- **Skills:** `supabase-postgres-best-practices` (atualização condicional).
- **Dependências:** nenhuma nova. **Pré-condição:** Specs 005 e 006 em `develop`. Sem migration.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/lib/esquemas/emprestimos.ts`, `src/server/api/routers/emprestimos.ts` | Contrato | 01 |
| `src/server/services/encerramento-emprestimo.ts` | Serviço único de encerramento | 02 |
| `src/server/services/emprestimos.ts` | Consultas por pessoa | 03 |
| `src/app/(autenticado)/meus-emprestimos/page.tsx`, `src/components/emprestimos/**` | Tela | 04 |

## Desenho

- O encerramento é um `UPDATE` condicionado a `devolvido_em IS NULL`, por tenant. Zero linhas
  afetadas vira `EMPRESTIMO_JA_ENCERRADO`.
- Auditoria na mesma transação. O serviço recebe ator e escopo, para a Spec 008 reutilizar.

## Estratégia de teste

Banco real; devolução concorrente; datas fixas; falha forçada de auditoria; isolamento por
procedimento; prova integrada de que devolver o item atrasado libera novas solicitações.
