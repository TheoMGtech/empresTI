# Verificações — 004-catalogo

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | 9a421a24af0ec9d250ef70136febecf04808a268 | CA-CATALOGO-06: SEM TESTE | nenhum | NÃO PRONTA |
| V-02 | 2026-11-11 | 854f6c42eb308e69a773123ccdd8cd046127d6dc | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/004-catalogo/spec.md`
- Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268
- Veredito: NÃO PRONTA — CA-CATALOGO-06 está SEM TESTE, porque nenhum teste prova que o ícone exibido sem fotografia é o da categoria do item; todos os checks passaram e nada fora de escopo foi encontrado.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/004-catalogo/spec.md

Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/004-catalogo/spec.md
- docs/specs/004-catalogo/plan.md
- docs/specs/004-catalogo/tasks.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- prisma/schema.prisma
- prisma/rotinas/carga.ts
- prisma/rotinas/carga-inicial.ts
- src/lib/esquemas/equipamentos.ts
- src/server/api/trpc.ts
- src/server/api/raiz.ts
- src/server/api/routers/equipamentos.ts
- src/server/api/routers/equipamentos.test.ts
- src/server/api/routers/equipamentos-listar.test.ts
- src/server/api/routers/equipamentos-emprestado.test.ts
- src/server/services/equipamentos.ts
- src/test/provas-finais-spec-003.test.ts
- src/app/(autenticado)/catalogo/page.tsx
- src/components/catalogo/cartao-equipamento.tsx
- src/components/catalogo/categorias.tsx
- src/components/catalogo/faixa-regras.tsx
- src/components/catalogo/filtros-catalogo.tsx
- src/components/catalogo/filtros-catalogo.test.tsx
- src/components/catalogo/miniatura-equipamento.tsx
- src/components/catalogo/pill-situacao.tsx
- src/components/catalogo/tela-catalogo.tsx
- src/components/catalogo/tela-catalogo.test.tsx
- e2e/catalogo.spec.ts
- e2e/apoio/trpc.ts
- playwright.config.ts

Evidência dos checks (todos no commit 9a421a24af0ec9d250ef70136febecf04808a268, em C:\dev\empresti-backend, branch feature/be-verificacoes-003-007, em 2026-11-11):
- `git rev-parse HEAD`: `9a421a24af0ec9d250ef70136febecf04808a268`, conferido antes e depois dos checks.
- `npm run lint`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o próprio comando; nenhuma saída depois dele).
- `npm run typecheck`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/typescript/bin/tsc --noEmit` (o próprio comando; nenhuma saída depois dele).
- `npm test`: executado pelo agente principal; código de saída 0. Últimas linhas relevantes: `Test Files  53 passed (53)` e `Tests  1311 passed | 1 skipped (1312)`.
- `npm run test:e2e`: executado pelo agente principal com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave-publica-de-teste-sem-credencial-real` no ambiente do comando (a pasta não tem arquivo de ambiente local); o Playwright subiu e encerrou o `npm run dev` pelo webServer da configuração; os testes E2E simulam o tRPC. Código de saída 0. Última linha: `17 passed (50.5s)`. Testes executados: e2e/detalhe.spec.ts (CA-SOLIC-10/RF-SOLIC-04 confirma no diálogo e o item passa a emprestado; RF-SOLIC-06 disputa pelo mesmo item fica no diálogo e bloqueia nova confirmação; CA-SESSAO-13 detalhe em 375px sem rolagem horizontal; CA-REGRAS-07 com item em atraso o navegador mostra o motivo e não deixa solicitar; RF-REGRAS-03 confirmar o terceiro item atualiza o contador para 3 de 3), e2e/catalogo.spec.ts (CA-SESSAO-13 a partir de 1024px a sidebar fica fixa; CA-CATALOGO-01/04/06 mostra os 12 itens, manutenção sem ação e ícone quando a foto falha; CA-SESSAO-06 colaborador não vê o grupo Operações; CA-CATALOGO-07 chips e Só disponíveis filtram a grade; CA-SESSAO-13 em 375px sem rolagem horizontal), e2e/login.spec.ts (CA-LOGIN-01, CA-LOGIN-09, CA-LOGIN-02), e2e/meus-emprestimos.spec.ts (CA-DEVOL-01/02 devolver o item atrasado remove a linha e atualiza o resumo; CA-SESSAO-13 Meus empréstimos em 375px sem rolagem horizontal), e2e/sessao.spec.ts (CA-LOGIN-05; CA-LOGIN-01).
- `npm run build`: executado pelo agente principal; código de saída 0. Última linha: `ƒ  (Dynamic)  server-rendered on demand`; contém `✓ Compiled successfully in 7.6s`. Em seguida `git checkout -- next-env.d.ts`.
- `git status --short`: executado pelo agente principal depois do build e da restauração de `next-env.d.ts`; código de saída 0; saída completa: vazia (nenhuma linha).
- `npm run prisma:reset`: executado pelo responsável, em PostgreSQL local descartável, no mesmo commit. Conferências registradas no terminal antes do reset: `docker ps` → `empresti-reset postgres:17.6-alpine 0.0.0.0:55432->5432/tcp`; `select current_database(), version()` no container → `postgres|PostgreSQL 17.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit`; papéis `anon` e `authenticated` criados; `git rev-parse HEAD` → `9a421a24af0ec9d250ef70136febecf04808a268`. Saída do reset: `Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:55432"`; aplicou 20261023110257_criar_saude_sistema, 20261111020031_criar_estrutura_dominio, 20261111025735_criar_auditoria, 20261111063517_reforcar_bloqueio_truncate, 20261111102455_nome_exibicao_memberships e 20261111123316_criar_emprestimos; `Database reset successful`. Registrado pelo agente principal em 2026-11-11T18:51:19-03:00.
- Validação integrada real (Supabase de produção, contas reais): não executada; não há registro.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/004-catalogo/spec.md
Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-CATALOGO-01 | src/server/api/routers/equipamentos-listar.test.ts:101; src/components/catalogo/tela-catalogo.test.tsx:73; e2e/catalogo.spec.ts:59 → src/server/services/equipamentos.ts:70-119; prisma/rotinas/carga.ts:87-92; prisma/rotinas/carga-inicial.ts:6-19 | ATENDIDO | O teste de backend roda a carga do manifesto em PostgreSQL real (Testcontainers) e exige exatamente TI-0001 a TI-0012, com resumo 12/10. Tela e E2E mostram os 12 cards. |
| CA-CATALOGO-02 | src/server/api/routers/equipamentos-listar.test.ts:109, :116, :126, :343 → src/server/services/equipamentos.ts:58-62; src/server/api/routers/equipamentos.ts:38; src/server/api/trpc.ts:103-106 | ATENDIDO | O tenant A não recebe itens do tenant B, nem mesmo com patrimônio igual (TI-0001); o B recebe só os próprios. O `tenantId` vem do contexto: no input ele é descartado e o cursor não atravessa tenant. |
| CA-CATALOGO-03 | src/server/api/routers/equipamentos-listar.test.ts:133-138 → src/server/api/trpc.ts:91-92, :108-109; src/server/api/routers/equipamentos.ts:32 | ATENDIDO | Sem sessão a recusa é `UNAUTHORIZED`; sem membership é `FORBIDDEN`, via `tenantProcedure`. |
| CA-CATALOGO-04 | src/server/api/routers/equipamentos-listar.test.ts:140; src/components/catalogo/tela-catalogo.test.tsx:84; e2e/catalogo.spec.ts:59 → src/server/services/equipamentos.ts:35-38; src/components/catalogo/cartao-equipamento.tsx:56-57, :82-87; src/components/catalogo/pill-situacao.tsx:16-19 | ATENDIDO | O servidor devolve `manutencao` só para TI-0004 e TI-0007, e eles não contam como disponíveis. Para colaborador, o card tem a pill "Manutenção", sem link e sem "Solicitar"; a exceção de Operações é a da RF-CATALOGO-06. |
| CA-CATALOGO-05 | src/server/api/routers/equipamentos-listar.test.ts:349, :188, :208 → src/server/services/equipamentos.ts:26-31, :114; src/server/api/routers/equipamentos.ts:40 | ATENDIDO | A URL de cada um dos 12 itens é comparada com `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${imagem_caminho}`, com o caminho lido do banco. |
| CA-CATALOGO-06 | src/components/catalogo/tela-catalogo.test.tsx:150, :160; e2e/catalogo.spec.ts:59 (asserção em :73) → src/components/catalogo/miniatura-equipamento.tsx:15-16, :21, :32, :37; src/components/catalogo/categorias.tsx:10-15 | SEM TESTE | Os testes provam a troca da foto por um ícone, seja sem foto, seja quando ela falha (`data-miniatura="icone"` e um `svg` qualquer), mas nenhum confere que o ícone é o da categoria do item. Um mapeamento errado em `ICONE_CATEGORIA` passaria em todos os testes. |
| CA-CATALOGO-07 | src/server/api/routers/equipamentos-listar.test.ts:235-273; src/server/api/routers/equipamentos-emprestado.test.ts:106; src/components/catalogo/filtros-catalogo.test.tsx:61-161; e2e/catalogo.spec.ts:109 → src/server/services/equipamentos.ts:52-55, :84-85; src/components/catalogo/filtros-catalogo.tsx:28-56; src/components/catalogo/tela-catalogo.tsx:57-62 | ATENDIDO | No banco real, cada uma das 4 categorias, "Só disponíveis" (que exclui manutenção, `fora_de_uso` e emprestado) e a combinação dos dois filtram certo. A tela envia a entrada correta para cada chip e para o filtro. |
| CA-CATALOGO-08 | src/server/api/routers/equipamentos-listar.test.ts:288-341; src/server/api/routers/equipamentos-emprestado.test.ts:114; src/components/catalogo/tela-catalogo.test.tsx:209 → src/server/services/equipamentos.ts:86-91, :106-117; src/components/catalogo/tela-catalogo.tsx:64, :159-167 | ATENDIDO | Com limites de 1 a 11, com filtros e para Operações, a concatenação das páginas é igual à lista completa: sem duplicata, sem perda e sem página vazia no fim. O cursor é o último patrimônio, como no plano. |
| CA-CATALOGO-09 | src/server/api/routers/equipamentos-listar.test.ts:152, :159 → src/server/services/equipamentos.ts:58-62, :102-103 | ATENDIDO | TI-9001 (`fora_de_uso`) não aparece para colaborador e aparece para `operacoes`, também no resumo (13/10). O papel vem do contexto. |
| CA-CATALOGO-10 | src/server/api/routers/equipamentos-listar.test.ts:170; src/server/api/routers/equipamentos-emprestado.test.ts:131; src/server/api/routers/equipamentos.test.ts:29-56 → src/lib/esquemas/equipamentos.ts:24-50; src/server/services/equipamentos.ts:92-100 | ATENDIDO | Há empréstimo aberto de uma tomadora com nome cadastrado, e a saída para colaborador e para operacoes não contém o nome dela nem o UUID. Saída validada por esquema estrito. |
| CA-CATALOGO-11 | evidência da delegação (lint, typecheck, test, test:e2e com 17 passed, incluindo os 5 de e2e/catalogo.spec.ts, e build, todos no commit verificado) → package.json:12-16; playwright.config.ts:10-14 | ATENDIDO | Todos os checks passaram no commit exato, e o E2E com tRPC simulado basta para PRONTA pela própria CA e pela DF-14. A validação integrada real (docs/VALIDACAO-INTEGRADA.md §2) continua sem registro e é obrigatória antes da entrega final em `main`/Vercel. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run prisma:reset` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-CATALOGO-06 está SEM TESTE, porque nenhum teste prova que o ícone exibido sem fotografia é o da categoria do item; todos os checks passaram e nada fora de escopo foi encontrado.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- CA-CATALOGO-06 volta para as tarefas: falta teste que prove que o ícone exibido sem fotografia é o da categoria do item. A correção fica na T-CATALOGO-06 e exige nova execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.

## V-02 — 2026-11-11

- Spec: `docs/specs/004-catalogo/spec.md`
- Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc
- Veredito: PRONTA — todos os CAs CA-CATALOGO-01 a CA-CATALOGO-11 estão ATENDIDOS, todos os checks passaram no commit 854f6c42eb308e69a773123ccdd8cd046127d6dc e nada fora de escopo foi encontrado.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/004-catalogo/spec.md

Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/004-catalogo/spec.md
- docs/specs/004-catalogo/plan.md
- docs/specs/004-catalogo/tasks.md
- docs/specs/004-catalogo/verificacao.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- prisma/schema.prisma
- prisma/rotinas/carga.ts
- prisma/rotinas/carga-inicial.ts
- src/lib/esquemas/equipamentos.ts
- src/server/api/trpc.ts
- src/server/api/raiz.ts
- src/server/api/routers/equipamentos.ts
- src/server/api/routers/equipamentos.test.ts
- src/server/api/routers/equipamentos-listar.test.ts
- src/server/api/routers/equipamentos-emprestado.test.ts
- src/server/services/equipamentos.ts
- src/test/provas-finais-spec-003.test.ts
- src/app/(autenticado)/catalogo/page.tsx
- src/components/catalogo/cartao-equipamento.tsx
- src/components/catalogo/categorias.tsx
- src/components/catalogo/faixa-regras.tsx
- src/components/catalogo/filtros-catalogo.tsx
- src/components/catalogo/filtros-catalogo.test.tsx
- src/components/catalogo/miniatura-equipamento.tsx
- src/components/catalogo/miniatura-equipamento.test.tsx
- src/components/catalogo/pill-situacao.tsx
- src/components/catalogo/tela-catalogo.tsx
- src/components/catalogo/tela-catalogo.test.tsx
- e2e/catalogo.spec.ts
- e2e/apoio/trpc.ts
- playwright.config.ts

Evidência dos checks (todos no commit 854f6c42eb308e69a773123ccdd8cd046127d6dc, em C:\dev\empresti-backend, branch feature/be-verificacoes-004-006, igual a `origin/develop`, em 2026-11-11):
- `git rev-parse HEAD`: `854f6c42eb308e69a773123ccdd8cd046127d6dc`, conferido antes e depois dos checks.
- `npm run lint`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o próprio comando; nenhuma saída depois dele).
- `npm run typecheck`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/typescript/bin/tsc --noEmit` (o próprio comando; nenhuma saída depois dele).
- `npm test`: executado pelo agente principal; código de saída 0. Últimas linhas relevantes: `Test Files  54 passed (54)` e `Tests  1321 passed | 1 skipped (1322)`.
- `npm run test:e2e`: executado pelo agente principal com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave-publica-de-teste-sem-credencial-real` no ambiente do comando (a pasta não tem arquivo de ambiente local); o Playwright subiu e encerrou o `npm run dev` pelo webServer da configuração; os testes E2E simulam o tRPC. Código de saída 0. Última linha: `17 passed (40.6s)`. Testes executados: e2e/catalogo.spec.ts (CA-CATALOGO-01/04/06 mostra os 12 itens, manutenção sem ação e ícone quando a foto falha; CA-CATALOGO-07 chips e Só disponíveis filtram a grade; CA-SESSAO-06 colaborador não vê o grupo Operações no navegador; CA-SESSAO-13 a partir de 1024px a sidebar fica fixa; CA-SESSAO-13 em 375px não há rolagem horizontal e a barra superior substitui a sidebar), e2e/detalhe.spec.ts (CA-SOLIC-10/RF-SOLIC-04 confirma no diálogo e o item passa a emprestado; RF-SOLIC-06 disputa pelo mesmo item fica no diálogo e bloqueia nova confirmação; CA-SESSAO-13 detalhe em 375px sem rolagem horizontal; CA-REGRAS-07 com item em atraso, o navegador mostra o motivo e não deixa solicitar; RF-REGRAS-03 confirmar o terceiro item atualiza o contador para 3 de 3), e2e/login.spec.ts (CA-LOGIN-01, CA-LOGIN-09, CA-LOGIN-02), e2e/meus-emprestimos.spec.ts (CA-DEVOL-01/02 devolver o item atrasado remove a linha e atualiza o resumo; CA-SESSAO-13 Meus empréstimos em 375px sem rolagem horizontal), e2e/sessao.spec.ts (CA-LOGIN-05; CA-LOGIN-01).
- `npm run build`: executado pelo agente principal; código de saída 0. Última linha: `ƒ  (Dynamic)  server-rendered on demand`; contém `✓ Compiled successfully in 3.6s`. Em seguida `git checkout -- next-env.d.ts`.
- `git status --short`: executado pelo agente principal antes dos checks e depois do build e da restauração de `next-env.d.ts`; código de saída 0; saída completa nas duas vezes: vazia (nenhuma linha). Conferido de novo depois do reset: vazia.
- `npm run prisma:reset`: executado pelo responsável, em PostgreSQL local descartável, no mesmo commit. Conferências registradas no terminal: `git rev-parse HEAD` → `854f6c42eb308e69a773123ccdd8cd046127d6dc` (sem comando git depois disso); container novo: `docker ps` → `empresti-reset postgres:17.6-alpine 0.0.0.0:55432->5432/tcp`; `select current_database(), version()` no container → `postgres|PostgreSQL 17.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit`; papéis `anon` e `authenticated` criados (`CREATE ROLE` duas vezes). Saída do reset: `Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:55432"`; aplicou 20261023110257_criar_saude_sistema, 20261111020031_criar_estrutura_dominio, 20261111025735_criar_auditoria, 20261111063517_reforcar_bloqueio_truncate, 20261111102455_nome_exibicao_memberships e 20261111123316_criar_emprestimos; `Database reset successful`; em seguida `docker stop empresti-reset`. Uma execução anterior no mesmo commit, num container descartável sem as conferências de versão e de papéis, também terminou com `Database reset successful`; a evidência considerada é a execução completa descrita aqui. Registrado pelo agente principal em 2026-11-11T21:10:19-03:00.
- Validação integrada real (Supabase de produção, contas reais): não executada; não há registro.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/004-catalogo/spec.md
Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-CATALOGO-01 | src/server/api/routers/equipamentos-listar.test.ts:101; src/components/catalogo/tela-catalogo.test.tsx:73; e2e/catalogo.spec.ts:59 → src/server/services/equipamentos.ts:70-119; prisma/rotinas/carga.ts:87-92; prisma/rotinas/carga-inicial.ts:6-19 | ATENDIDO | O teste de backend roda a carga do manifesto em PostgreSQL real e exige exatamente TI-0001 a TI-0012, com resumo 12/10 e sem próxima página. A tela e o E2E mostram os 12 cards. |
| CA-CATALOGO-02 | src/server/api/routers/equipamentos-listar.test.ts:109, :116, :126, :343 → src/server/services/equipamentos.ts:58-62; src/server/api/routers/equipamentos.ts:38; src/server/api/trpc.ts:103-106 | ATENDIDO | O tenant A não recebe os itens do tenant B, nem o de patrimônio repetido (TI-0001), e o B recebe só os próprios. O `tenantId` vem do contexto: quando vem no input, é descartado, e o cursor não atravessa para outro tenant. |
| CA-CATALOGO-03 | src/server/api/routers/equipamentos-listar.test.ts:133-138 → src/server/api/trpc.ts:91-92, :108-109; src/server/api/routers/equipamentos.ts:32 | ATENDIDO | Sem sessão a recusa é `UNAUTHORIZED`; sem membership é `FORBIDDEN`, pelo `tenantProcedure`. |
| CA-CATALOGO-04 | src/server/api/routers/equipamentos-listar.test.ts:140; src/components/catalogo/tela-catalogo.test.tsx:84; e2e/catalogo.spec.ts:59 → src/server/services/equipamentos.ts:35-38; src/components/catalogo/cartao-equipamento.tsx:56-57, :82-87; src/components/catalogo/pill-situacao.tsx:16-19 | ATENDIDO | O servidor devolve `manutencao` só para TI-0004 e TI-0007, fora dos disponíveis. Para colaborador, o card mostra a pill "Manutenção", sem link e sem "Solicitar". |
| CA-CATALOGO-05 | src/server/api/routers/equipamentos-listar.test.ts:349, :188, :208 → src/server/services/equipamentos.ts:26-31, :114; src/server/api/routers/equipamentos.ts:40 | ATENDIDO | Para cada um dos 12 itens, a URL é comparada com `${NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/${imagem_caminho}`, usando o caminho lido do banco. |
| CA-CATALOGO-06 | src/components/catalogo/miniatura-equipamento.test.tsx:39, :48-59, :61-77, :79-114; src/components/catalogo/tela-catalogo.test.tsx:150, :160; e2e/catalogo.spec.ts:59 (asserção em :73) → src/components/catalogo/miniatura-equipamento.tsx:15-16, :21, :32, :37; src/components/catalogo/categorias.tsx:10-15; src/components/catalogo/cartao-equipamento.tsx:62 | ATENDIDO | Para cada uma das 4 categorias, sem foto ou com foto que falha, o desenho do `svg` exibido é igual ao do ícone que o layout §5.11 define para aquela categoria. O oráculo é independente de `ICONE_CATEGORIA` e os quatro desenhos são distintos entre si, então um mapeamento errado faz o teste falhar. |
| CA-CATALOGO-07 | src/server/api/routers/equipamentos-listar.test.ts:235-273; src/server/api/routers/equipamentos-emprestado.test.ts:106; src/components/catalogo/filtros-catalogo.test.tsx:61-161; e2e/catalogo.spec.ts:109 → src/server/services/equipamentos.ts:52-55, :84-85; src/components/catalogo/filtros-catalogo.tsx:28-56; src/components/catalogo/tela-catalogo.tsx:57-62 | ATENDIDO | No banco real, cada categoria, "Só disponíveis" (que exclui manutenção, `fora_de_uso` e emprestado) e a combinação dos dois filtram corretamente. A tela envia a entrada certa para cada chip e para o filtro. |
| CA-CATALOGO-08 | src/server/api/routers/equipamentos-listar.test.ts:288-341; src/server/api/routers/equipamentos-emprestado.test.ts:114; src/components/catalogo/tela-catalogo.test.tsx:209 → src/server/services/equipamentos.ts:86-91, :106-117; src/components/catalogo/tela-catalogo.tsx:64, :159-167 | ATENDIDO | Com limites de 1 a 11, com filtros e também para Operações, as páginas juntas formam a lista completa, sem duplicata, sem perda e sem página vazia no fim. O cursor é o último patrimônio, como diz o plano. |
| CA-CATALOGO-09 | src/server/api/routers/equipamentos-listar.test.ts:152, :159 → src/server/services/equipamentos.ts:58-62, :102-103 | ATENDIDO | TI-9001 (`fora_de_uso`) não aparece para colaborador e aparece para `operacoes`, inclusive no resumo (13/10). O papel vem do contexto. |
| CA-CATALOGO-10 | src/server/api/routers/equipamentos-listar.test.ts:170; src/server/api/routers/equipamentos-emprestado.test.ts:131; src/server/api/routers/equipamentos.test.ts:29-56 → src/lib/esquemas/equipamentos.ts:24-50; src/server/services/equipamentos.ts:92-100 | ATENDIDO | Com um empréstimo aberto de uma tomadora que tem nome cadastrado, a saída para colaborador e para `operacoes` não traz o nome nem o UUID dela. A saída é validada por esquema estrito. |
| CA-CATALOGO-11 | evidência da delegação (lint, typecheck, test com 54 arquivos e 1321 testes aprovados, test:e2e com 17 passed incluindo os 5 de e2e/catalogo.spec.ts, e build, todos no commit verificado) → package.json:12-16; playwright.config.ts:10-14 | ATENDIDO | Todos os checks passaram no commit exato, e o E2E com tRPC simulado basta para PRONTA pelo próprio CA e pela DF-14. A validação integrada real (docs/VALIDACAO-INTEGRADA.md §2) continua sem registro e é obrigatória antes da entrega final em `main` e na Vercel. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run prisma:reset` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: PRONTA — todos os CAs CA-CATALOGO-01 a CA-CATALOGO-11 estão ATENDIDOS, todos os checks passaram no commit 854f6c42eb308e69a773123ccdd8cd046127d6dc e nada fora de escopo foi encontrado.
```

### Observações do agente principal

- Diferenças em relação à execução anterior (V-01, commit `9a421a24af0ec9d250ef70136febecf04808a268`): CA-CATALOGO-06 passou de SEM TESTE a ATENDIDO, com `src/components/catalogo/miniatura-equipamento.test.tsx` (T-CATALOGO-06, PR #84); os checks continuam `passou`; o veredito passou de NÃO PRONTA a PRONTA.
- O commit verificado é o `develop` depois dos PRs #84 e #85; o `prisma:reset` foi executado de novo pelo responsável nesse commit.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
