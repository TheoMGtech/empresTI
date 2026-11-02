# EmpresTI

Sistema interno para controlar o empréstimo de equipamentos de TI — como notebooks, monitores, cabos e câmeras — substituindo a planilha operacional por um fluxo auditável.

> **Estado do projeto:** andar zero executável concluído e login com Supabase Auth em produção desde 2026-10-23 ([spec 001](docs/specs/001-login/spec.md)). Catálogo, empréstimo, devolução e a tela de Operações ainda não foram implementados.

## Produto

Colaboradores consultam o catálogo, solicitam equipamentos disponíveis e registram devoluções. A equipe de Operações cadastra itens e acompanha empréstimos em aberto.

As regras de negócio já aprovadas estão no [PRD](docs/PRD.md): máximo de três itens por pessoa, prazo padrão de 14 dias, bloqueio para atrasos e manutenção fora do catálogo disponível.

## Arquitetura aprovada

| Área | Decisão |
| --- | --- |
| Aplicação | Monólito Next.js (App Router) + TypeScript estrito |
| Interface | Tailwind CSS, shadcn/ui, React Hook Form e Zod |
| API | tRPC, Route Handler, routers por domínio e services |
| Dados | PostgreSQL no Supabase, Prisma e Prisma Migrate |
| Identidade | Supabase Auth com convite administrativo e cookies `httpOnly` |
| Isolamento | Multi-tenancy por coluna `tenant_id` e RLS deny-by-default |
| Qualidade | Vitest, Testing Library, Testcontainers e Playwright |
| Operação | Vercel, GitHub Actions e Sentry |

O racional, as restrições e as consequências estão no [ADR-001](docs/adr/001-stack.md). O desenho visual de referência está em [layout.md](docs/layout.md).

## Estado e próximos passos

O processo do projeto é SDD repo-native: `SPEC → PLAN → TASKS → CODE`. Portanto, qualquer funcionalidade começa em uma pasta própria com `spec.md`, `plan.md` e `tasks.md`, e só é implementada após a especificação aprovada.

1. Escolher a próxima funcionalidade do PRD e abrir `docs/specs/<NNN-nome>/` conforme [rules/spec-flow.md](rules/spec-flow.md).
2. Elaborar e aprovar spec, plano e tarefas.
3. Implementar uma tarefa por vez, validando com [rules/checks.md](rules/checks.md).
4. Validar os critérios de aceitação e o isolamento entre tenants.

Pendências de ambiente e decisões abertas estão em [DEVOPS.md](docs/DEVOPS.md).

## Ambientes e configuração

Copie `.env.example` para `.env.local` apenas na máquina local e preencha os valores fornecidos pelos provedores. Nunca versione `.env`, tokens, chaves de serviço ou URLs com senhas.

As variáveis `NEXT_PUBLIC_*` podem chegar ao navegador; as demais são exclusivas do servidor. `DATABASE_URL` usa o pooler de runtime e `DIRECT_URL` a conexão direta para migrations, conforme o ADR.

## DevOps e qualidade

- Pull requests e pushes em `develop` e `main` executam o workflow `Architecture checks`: guarda documental, detecção de segredos, lint, typecheck, testes e build.
- O workflow de migrations é manual e exige os secrets `DATABASE_URL` e `DIRECT_URL` configurados no GitHub Environment `production` antes de poder ser usado.
- Dependências recebem atualizações semanais via Dependabot, com PRs para `develop`.
- `main` e `develop` exigem pull request, histórico linear e o status check `Documentation and secret guard`.

## Documentação

- [PRD](docs/PRD.md) — problema, público, escopo e regras existentes.
- [ADRs](docs/adr/README.md) — índice das decisões técnicas vinculantes ([ADR-001](docs/adr/001-stack.md)).
- [Specs](docs/specs/) — uma pasta por funcionalidade, com spec, plano e tarefas.
- [DevOps](docs/DEVOPS.md) — controles de entrega e pendências do responsável.
- [Layout](docs/layout.md) — sistema visual e telas de referência.
- [Restrições](rules/restrictions.md) — limites de autoridade, escopo, ritmo, produção e segredos.
- [Estratégia de testes](rules/tests.md) — como cada critério de aceitação vira teste.

## Contribuição

Leia [AGENTS.md](AGENTS.md) antes de propor alterações. Use o template de pull request, relacione a mudança à spec e mantenha cada PR pequeno e verificável.

## Licença

Ainda não definida. Nenhum uso, redistribuição ou publicação além do contexto autorizado deve ser presumido.
