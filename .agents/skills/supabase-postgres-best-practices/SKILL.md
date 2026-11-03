---
name: supabase-postgres-best-practices
description: "Catálogo de boas práticas de PostgreSQL (tipos de coluna, chaves, índices, constraints, RLS e performance de policy, conexões e pooling, locks, N+1, paginação, EXPLAIN). Use ao desenhar tabela, coluna, índice ou policy RLS que vai entrar numa migration do Prisma, ao escrever SQL de consulta ou ao diagnosticar consulta lenta ou linha visível para o tenant errado. Não use para decidir o fluxo de migration (rules/migration.md) nem modelagem de domínio (é da spec)."
license: MIT
metadata:
  author: supabase
  version: "1.1.1"
  organization: Supabase
  date: January 2026
  abstract: Comprehensive Postgres performance optimization guide for developers using Supabase and Postgres. Contains performance rules across 8 categories, prioritized by impact from critical (query performance, connection management) to incremental (advanced features). Each rule includes detailed explanations, incorrect vs. correct SQL examples, query plan analysis, and specific performance metrics to guide automated optimization and code generation.
  origem: github.com/supabase/agent-skills (skills/supabase-postgres-best-practices)
  licenca: MIT
  adaptada-em: 2026-11-02
  mudancas: description restrita (a original carregava em qualquer tarefa de banco, inclusive o fluxo de migration); seção de precedência adicionada; removidos references/_contributing.md e _template.md, que o SKILL.md não aponta.
---

# Supabase Postgres Best Practices

## Precedência neste projeto

Esta skill orienta; não decide. Em conflito, valem `rules/` e `docs/adr/`: pare e
avise. Toda mudança de schema segue `rules/migration.md` (Prisma Migrate, DDL
mostrado antes). Modelagem de domínio vem da spec aprovada, não desta skill.

Comprehensive performance optimization guide for Postgres, maintained by Supabase. Contains rules across 8 categories, prioritized by impact to guide automated query optimization and schema design.

## When to Apply

Reference these guidelines when:
- Writing SQL queries or designing schemas
- Implementing indexes or query optimization
- Reviewing database performance issues
- Configuring connection pooling or scaling
- Optimizing for Postgres-specific features
- Working with Row-Level Security (RLS)

## Rule Categories by Priority

| Priority | Category | Impact | Prefix |
|----------|----------|--------|--------|
| 1 | Query Performance | CRITICAL | `query-` |
| 2 | Connection Management | CRITICAL | `conn-` |
| 3 | Security & RLS | CRITICAL | `security-` |
| 4 | Schema Design | HIGH | `schema-` |
| 5 | Concurrency & Locking | MEDIUM-HIGH | `lock-` |
| 6 | Data Access Patterns | MEDIUM | `data-` |
| 7 | Monitoring & Diagnostics | LOW-MEDIUM | `monitor-` |
| 8 | Advanced Features | LOW | `advanced-` |

## How to Use

Read individual rule files for detailed explanations and SQL examples:

```
references/query-missing-indexes.md
references/query-partial-indexes.md
references/_sections.md
```

Each rule file contains:
- Brief explanation of why it matters
- Incorrect SQL example with explanation
- Correct SQL example with explanation
- Optional EXPLAIN output or metrics
- Additional context and references
- Supabase-specific notes (when applicable)

## References

- https://www.postgresql.org/docs/current/
- https://supabase.com/docs
- https://wiki.postgresql.org/wiki/Performance_Optimization
- https://supabase.com/docs/guides/database/overview
- https://supabase.com/docs/guides/auth/row-level-security
