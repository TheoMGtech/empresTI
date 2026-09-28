# AGENTS.md — Como trabalhar neste repositório

## Regras de processo (vinculantes)

Regras de processo já definidas para este projeto:

1. O projeto utiliza SDD repo-native/manual.
2. A ordem é `SPEC → PLAN → TASKS → CODE`.
3. Não se implementa uma funcionalidade antes de sua especificação.
4. Specs governam comportamento.
5. Se spec e código divergirem sobre comportamento, a spec prevalece até ser alterada.
6. Decisões arquiteturais pertencem aos ADRs.
7. O agente não pode inventar regras de negócio.
8. O agente não pode tomar decisões marcadas como pendentes.
9. Segredos nunca podem ser inventados ou versionados.
10. Mudanças de comportamento começam pela spec.
11. Cada feature futura terá `spec.md`, `plan.md` e `tasks.md`.
12. Implementação deverá ser validada contra os critérios de aceitação da spec.
13. O idioma oficial do projeto é o português. Use **PT-BR** para tudo: código, comentários, documentação, commits, pull requests e comunicação.

## Contexto do projeto

- **EmpresTI** é um sistema interno para controlar o empréstimo de equipamentos de TI — notebooks, monitores, cabos e câmeras —, substituindo a planilha operacional por um fluxo auditável (README).
- **Quem usa** (PRD): o Colaborador vê o catálogo, solicita um item emprestado e devolve; Operações cadastra equipamentos, vê quem está com o quê e registra a devolução.
- **Regras de negócio já aprovadas** (PRD): máximo de 3 itens por pessoa; prazo padrão de devolução de 14 dias; quem tem item em atraso não pode pegar outro emprestado; equipamento em manutenção não aparece como disponível.
- **Fora de escopo v1** (PRD): reserva com data futura, notificação por e-mail e importação da planilha atual.
- **Front-end** (docs/layout.md): design system Nocturne, somente modo escuro, tom de copy seco e operacional, sempre em PT-BR.
- **Estado atual** (README): o passo 0 está concluído; nenhuma funcionalidade foi implementada ainda.

## Stack e arquitetura (ADR-001)

- Mesmo marcado como `RASCUNHO` no documento, o **ADR-001** é tratado como **aprovado e vinculante**.
- Resumo do decidido no ADR:
  - **Aplicação:** monolito Next.js (App Router), front e servidor no mesmo projeto; deploy em um único projeto na Vercel; Route Handlers do Next, sem servidor separado.
  - **Apresentação:** TypeScript em modo `strict`; Client Components como padrão para telas com dados; TanStack Query via `@trpc/react-query`; estado de cliente com `useState` e Context; formulários com React Hook Form + `zodResolver`; Tailwind CSS; componentes shadcn/ui.
  - **Servidor:** API com tRPC; endpoint em `app/api/trpc/[trpc]/route.ts`; routers por domínio em `src/server/api/routers/<dominio>.ts`; camadas Router (procedimento) → Service → Prisma; Zod em todo `.input()`; serialização com superjson; Server Actions não usadas.
  - **Dados e identidade:** PostgreSQL no Supabase com Prisma Migrate; multi-tenancy por coluna `tenant_id`; RLS deny-by-default; Supabase Auth com cookies `httpOnly`.
  - **Qualidade e observabilidade:** Vitest, Testing Library, Testcontainers e Playwright; Sentry.
- O que o ADR **não decide** (modelado de domínio, roles e matriz de permissão, provisionamento de tenant, ambientes, política de branch, LGPD, SLO, etc.) fica **pendente**: somente o responsável pode tomar essas decisões (regra 8).

## Governança

- O **responsável único** do projeto é a pessoa que aprova todas as mudanças: specs, planos, tasks, ADRs, PRs e ajustes de processo.
- O agente não aprova nem faz merge por conta própria: qualquer decisão de governança não documentada deve ser consultada com o responsável.

## Fluxo de trabalho (SDD na prática)

1. Para uma feature nova, o agente elabora o rascunho completo: `spec.md`, depois `plan.md`, depois `tasks.md`, na pasta própria da feature (regra 11).
2. Antes de escrever qualquer código, o agente para e entrega o pacote (spec + plan + tasks) ao responsável para revisão e aprovação.
3. Só depois da aprovação do pacote se escreve código (regras 2, 3 e 10).
4. A implementação deve ser validada contra os critérios de aceitação da spec (regra 12).
5. Cada PR deve ser pequeno, verificável e vinculado a uma spec aprovada.

## Qualidade e verificação (obrigatório)

- Antes de dar uma tarefa por terminada, executar: **lint, typecheck, build e tests**.
- **Tests:** obrigatórios em cada feature, com tamanho proporcional ao risco (como exige o template de PR).
- Cada PR deve incluir **evidência** da verificação executada (comandos e resultado) e cobrir os critérios de aceitação da spec.
- Quando aplicável, verificar o **isolamento entre tenants** (checklist do template de PR).
- Estratégia de referência: Vitest, Testing Library, Testcontainers e Playwright (ADR-001); os detalhes serão definidos quando existam specs (rules/tests.md).

## Convenções

- **Commits:** Conventional Commits (`feat:`, `fix:`, `docs:`, etc.).
- **Branches:** `feature/<o que está implementando>`.
- **Integração:** branches de feature partem de `develop`; PRs pequenos e verificáveis
  são integrados em `develop` após CI verde. O merge de `develop` em `main` permanece
  exclusivo do responsável, mediante autorização explícita.

## Segurança e operação

- Nunca inventar credenciais nem versionar segredos; regras completas em `rules/restrictions.md`.
- A única representação de variáveis é `.env.example`, sem valores secretos.
- Migrações de produção: workflow manual, com confirmação literal `APPLY`, somente a partir do Environment protegido `production`.
- Proteção de `main` e `develop`: pull request obrigatório, histórico linear e status
  check do job `Documentation and secret guard` do workflow `Architecture checks`.
- Atualização de dependências: semanal via Dependabot quando exista `package.json`.

## Fim de sessão

- Atualizar `handoff.md` **quando seja necessário** (por exemplo, quando ao final da sessão exista trabalho não terminado ou pendências).
- `handoff.md` é um artefato efímero: registra onde a sessão acabou, mas não é fonte de verdade sobre requisitos, comportamento nem arquitetura.
