# Plano — catálogo de equipamentos

## Estado

**Status:** APROVADO — pelo responsável em 2026-11-11. Spec de referência: `spec.md`.

## Restrições e skills

- **ADR-001:** §2 (Client Components, TanStack Query), §3, §4 (paginação por cursor), §6, §8.
- **Regras:** `rules/checks.md`, `rules/tests.md`, `rules/secrets.md`.
- **Skills:** `supabase` (URL pública do Storage).
- **Dependências:** nenhuma nova. **Pré-condição:** Spec 003 integrada em `develop`. Sem migration.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/lib/esquemas/equipamentos.ts`, `src/server/api/routers/equipamentos.ts` | Contrato | 01 |
| `src/server/services/equipamentos.ts` | Listagem, filtros, cursor e URL | 02, 03 |
| `src/app/(autenticado)/catalogo/page.tsx`, `src/components/catalogo/**` | Tela | 04, 05 |

## Desenho

- Ordenação estável por patrimônio, com cursor no último patrimônio devolvido.
- `disponibilidade` é derivada no service. Até a Spec 005, `ativo` resulta em `disponivel`.
- O filtro de `fora_de_uso` depende do papel do contexto, nunca do input.
- `resumo` respeita o mesmo recorte de visibilidade do papel.

## Estratégia de teste

Banco real com a carga inicial; dois tenants para isolamento; Testing Library para card e filtros;
E2E com tRPC simulado; validação integrada real antes da entrega.
