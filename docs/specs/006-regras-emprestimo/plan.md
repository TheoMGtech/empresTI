# Plano — regras de empréstimo

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §3 (regra no service), §6, §8.
- **Regras:** `rules/checks.md`, `rules/tests.md`.
- **Skills:** `supabase-postgres-best-practices` (bloqueio de linha).
- **Dependências:** nenhuma nova. **Pré-condição:** Spec 005 em `develop`. Sem migration.
- **Publicação:** vai a `main` junto com a Spec 005.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/lib/esquemas/emprestimos.ts`, `src/server/api/routers/emprestimos.ts` | Contrato | 01 |
| `src/server/services/emprestimos.ts`, `src/lib/prazos.ts` | Regras e atraso | 02, 03 |
| `src/components/catalogo/**`, `src/components/shell/**` | Contador, nota e botão | 04 |

## Desenho

- A transação de `solicitar` bloqueia a linha do membership (`SELECT ... FOR UPDATE`), serializando
  por pessoa antes de contar.
- Atraso: `devolver_ate` anterior à data atual em São Paulo, com relógio injetado.
- Ordem: atraso, limite, depois as recusas da Spec 005.

## Estratégia de teste

Banco real para concorrência; datas fixas nas bordas do dia; chamada direta ao procedimento;
Testing Library para os estados de interface. CA-REGRAS-05 usa fixture com `devolvido_em`, sem
depender da Spec 007.
