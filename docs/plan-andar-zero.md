# Plano — andar zero executável

## Objetivo

Provar que as decisões do ADR-001 funcionam juntas sem implementar login,
catálogo, equipamento, empréstimo, devolução ou regra de negócio.

## Organização proposta

- `app/`: rotas, layout, página técnica e Route Handler do Next.js.
- `src/components/`: componentes de interface e provedores de cliente.
- `src/server/`: contexto tRPC, routers técnicos e cliente Prisma.
- `src/generated/`: cliente Prisma gerado, não versionado.
- `prisma/`: schema e migrations versionadas.
- `tests/`: provas automatizadas do andar zero.

Essa organização segue as convenções do App Router e a separação
Router → Service → Prisma do ADR-001; não cria uma arquitetura paralela.

## Entregas verificáveis

1. **Fundação executável** — instalar dependências fixadas, criar configuração
   TypeScript estrita, lint, Tailwind, testes e lockfile.
2. **Banco técnico** — criar schema Prisma e uma migration mínima aprovada com
   `tenant_id`, RLS e policy deny-by-default.
3. **Caminho de dados** — expor procedimento tRPC técnico que consulta o banco
   por service e Prisma.
4. **Tela técnica** — mostrar saúde da aplicação, API e banco no design Nocturne.
5. **Qualidade** — provar lint, typecheck, testes, build e isolamento da migration.
6. **Entrega** — configurar CI, Vercel e variáveis sem versionar segredos; publicar
   em produção e verificar HTTP 200.
7. **Harness** — documentar MCP Supabase somente leitura e uma skill de verificação.

## Pontos de parada

- O DDL é apresentado e aprovado antes da migration.
- Qualquer login/consentimento de provedor fica com o responsável.
- O merge em `main` foi autorizado para esta entrega, mas só ocorre após CI verde.
