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
- **Estado atual**: o passo 0 documental e o andar zero executável estão
  concluídos. A primeira feature, o login (`docs/specs/001-login/`), está em produção
  desde 2026-10-23 (PR #13 em `develop`, PR #14 em `main`) e substituiu a tela
  técnica em `/`. O banco de produção ainda não tem a migration do andar zero
  aplicada. Nenhuma funcionalidade de catálogo ou empréstimo foi implementada.
- **Ainda não existe banco local** para desenvolvimento e testes (não há
  `DATABASE_URL` local nem teste com Testcontainers). Como subir esse banco é
  decisão pendente do responsável: tarefa que precise de banco para e avisa.

## Stack e arquitetura (ADR-001)

- O **ADR-001** está aprovado e é vinculante. Índice dos ADRs em `docs/adr/README.md`.
- Resumo do decidido no ADR:
  - **Aplicação:** monolito Next.js (App Router), front e servidor no mesmo projeto; deploy em um único projeto na Vercel; Route Handlers do Next, sem servidor separado.
  - **Apresentação:** TypeScript em modo `strict`; Client Components como padrão para telas com dados; TanStack Query via `@trpc/react-query`; estado de cliente com `useState` e Context; formulários com React Hook Form + `zodResolver`; Tailwind CSS; componentes shadcn/ui.
  - **Servidor:** API com tRPC; endpoint em `app/api/trpc/[trpc]/route.ts`; routers por domínio em `src/server/api/routers/<dominio>.ts`; camadas Router (procedimento) → Service → Prisma; Zod em todo `.input()`; serialização com superjson; Server Actions não usadas.
  - **Dados e identidade:** PostgreSQL no Supabase com Prisma Migrate; multi-tenancy por coluna `tenant_id`; RLS deny-by-default; Supabase Auth com cookies `httpOnly`.
  - **Qualidade e observabilidade:** Vitest, Testing Library, Testcontainers e Playwright; Sentry.
- O que o ADR **não decide** (modelado de domínio, roles e matriz de permissão, provisionamento de tenant, ambientes, política de branch, LGPD, SLO, etc.) fica **pendente**: somente o responsável pode tomar essas decisões (regra 8).

## Governança

- O **responsável único** do projeto é a pessoa que aprova todas as mudanças: specs, planos, tasks, ADRs, PRs e ajustes de processo.
- O agente não aprova spec, plano, tarefas nem ADR por conta própria: qualquer decisão de governança não documentada deve ser consultada com o responsável.
- Merge segue `rules/operacao.md`: o agente pode fazer squash merge de PR próprio em `develop` depois de CI verde; o merge em `main` é exclusivo do responsável, com autorização explícita.

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
- Estratégia de referência: Vitest, Testing Library, Testcontainers e Playwright (ADR-001); o procedimento está em `rules/tests.md`.

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
  O Environment ainda não existe no GitHub; ele precisa ser criado e protegido pelo
  responsável antes da primeira execução, porque uma execução anterior o criaria
  sem proteção e sem segredos.
- Proteção de `main` e `develop`: pull request obrigatório, histórico linear e status
  check do job `Documentation and secret guard` do workflow `Architecture checks`.
- Atualização de dependências: semanal via Dependabot, com PRs para `develop`.

## Comandos

Executados nesta máquina em 2026-11-02:

- `npm run dev` — sobe a aplicação em `http://localhost:3000`.
- `npm run lint` · `npm run typecheck` · `npm test` · `npm run build`.
- `npm run test:e2e` — Playwright. Suba `npm run dev` antes: a primeira
  compilação do `next dev` nesta pasta pode passar dos 60 s que o Playwright
  espera. Use `localhost`, não `127.0.0.1`.
- `npm run prisma:migrate` e `npm run prisma:reset` existem, mas ainda não há
  banco local para rodá-los (ver Estado atual).

Não use `npx` nesta pasta: o `&` no caminho quebra o comando. Use os scripts
`npm run …` ou `node ./node_modules/<pacote>/…`. O `npm run build` reescreve
`next-env.d.ts`; desfaça essa alteração se ela não fizer parte da tarefa.

## Mapa de diretórios

- `src/app/` — rotas do App Router e o Route Handler `api/trpc/[trpc]/route.ts`.
- `src/components/` — componentes de tela, agrupados por funcionalidade.
- `src/server/api/` — contexto tRPC (`trpc.ts`), router raiz e `routers/<dominio>.ts`.
- `src/server/services/` — regra de negócio e integrações chamadas pelos routers.
- `src/server/supabase/` — cliente Supabase server-side e cookies.
- `src/trpc/` — cliente e provedor tRPC do navegador.
- `src/lib/` — esquemas Zod compartilhados e utilitários.
- `src/test/` — setup e utilitários de teste. Testes unitários ficam ao lado do
  arquivo testado (`*.test.ts[x]`); testes de navegador ficam em `e2e/`.
- `prisma/` — schema e migrations versionadas.
- `docs/` — PRD, ADRs, specs (`docs/specs/<NNN-nome>/`), layout, andar zero e DevOps.

## Mapa de instruções

- `rules/restrictions.md`: limites de autoridade, escopo, ritmo, produção e
  segredos. Leia sempre, antes de qualquer tarefa.
- `rules/operacao.md`: contrato de commits, push, aprovações e configuração.
- `rules/checks.md`: verificações obrigatórias antes de declarar trabalho pronto.
- `rules/migration.md`: procedimento e ponto de parada para mudanças de schema.
- `rules/secrets.md`: fronteira entre variáveis públicas e exclusivas do servidor.
- `rules/tests.md`: estratégia e evidências de teste.
- `rules/handoff.md`: encerramento de sessão com trabalho pendente.
- `rules/spec-flow.md`: abertura e execução de funcionalidades pelo fluxo SDD.
- `docs/adr/README.md`: índice das decisões; leia antes de propor mudança estrutural.

## Ambiente e capacidades

- Supabase de produção: projeto `InovacaoTecnologia`, ref
  `wdudlqacomnasnrxgbni`. Mudanças de schema seguem `rules/migration.md`.
- MCP Supabase (`.mcp.json`): limitado a esse projeto, somente leitura e grupos
  `database,docs`. Serve para inspecionar o real; não aplica migrations.
- Vercel: time `theo-escola`, projeto `empresti`, integrado ao GitHub. Produção
  publicada a partir de `main` em `empresti-self.vercel.app` e
  `empresti-theo-escola.vercel.app` (mesmo deploy); `develop` em
  `empresti-git-develop-theo-escola.vercel.app`; branches e PRs recebem
  preview. O domínio `empresti.vercel.app` não aponta para este projeto.

## Skills

- Skills do time ficam em `skills/<nome>/SKILL.md`; skills externas do Supabase
  ficam em `.agents/skills/`, registradas em `skills-lock.json` e adaptadas a este
  projeto (ver `metadata` de cada uma).
- No início de cada tarefa, leia só o frontmatter (`name` e `description`) de
  cada skill. Carregue o corpo apenas quando a tarefa casar com a description;
  abra `references/` só quando o `SKILL.md` mandar.
- Em conflito, `rules/` e `docs/adr/` vencem qualquer skill.
- Skill que não foi escrita pelo time passa por auditoria antes do primeiro uso.
  Atualizar uma skill externa pelo CLI sobrescreve a adaptação: compare, audite e
  aplique só o que passar.

## Subagentes

- Ficam em `agents/<nome>.md`. O frontmatter diz quando delegar; o corpo é a
  instrução completa do subagente.
- `agents/verificador-spec.md` confere a spec CA a CA antes de ela ser declarada
  pronta (`rules/spec-flow.md`). Ele não corrige nada.
- Subagente não herda esta conversa: ao delegar, passe tudo que o arquivo dele
  pede como entrada.
- Se o harness não tiver subagentes, abra uma sessão nova e comece com: "Aja
  conforme agents/<nome>.md." e as entradas pedidas.

## Fim de sessão

- Atualizar `handoff.md` **quando seja necessário** (por exemplo, quando ao final da sessão exista trabalho não terminado ou pendências), no formato de `rules/handoff.md`.
- `handoff.md` é um artefato efêmero e não versionado (está no `.gitignore`): registra onde a sessão acabou, mas não é fonte de verdade sobre requisitos, comportamento nem arquitetura.
- Pendências permanentes do responsável ficam em `docs/DEVOPS.md`, não no handoff.
