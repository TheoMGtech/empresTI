# Verificações — 003-sessao-autorizacao

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | cf90302086fac11a47f7449c76e2f99e83ef4bd6 | CA-SESSAO-14: AMBÍGUO | `git status --short` | NÃO PRONTA |
| V-02 | 2026-11-11 | 9a421a24af0ec9d250ef70136febecf04808a268 | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/003-sessao-autorizacao/spec.md`
- Commit verificado: cf90302086fac11a47f7449c76e2f99e83ef4bd6
- Veredito: NÃO PRONTA — CA-SESSAO-14 está AMBÍGUO, porque não está definido se a validação integrada real exigida pelo DF-14 vem antes de declarar a spec PRONTA, e ela não tem registro; e o check `git status --short` conta como falhou, porque a delegação não traz o comando nem o resultado dele (só a afirmação de pasta sem alterações e de `next-env.d.ts` restaurado).
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/003-sessao-autorizacao/spec.md

Commit verificado: cf90302086fac11a47f7449c76e2f99e83ef4bd6 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/003-sessao-autorizacao/spec.md
- docs/specs/003-sessao-autorizacao/plan.md
- docs/specs/003-sessao-autorizacao/tasks.md
- package.json
- prisma/schema.prisma
- prisma/migrations/20261111102455_nome_exibicao_memberships/migration.sql
- prisma/rotinas/vinculo.ts
- prisma/rotinas/vinculo.test.ts
- prisma/vincular-professor.ts
- src/lib/esquemas/sessao.ts
- src/server/api/trpc.ts
- src/server/api/trpc.test.ts
- src/server/api/erros.test.ts
- src/server/api/raiz.ts
- src/server/api/routers/sessao.ts
- src/server/api/routers/sessao.test.ts
- src/server/services/sessao.ts
- src/test/nome-exibicao.test.ts
- src/test/provas-finais-spec-003.test.ts
- src/test/trpc.tsx
- src/trpc/tipos.ts
- src/trpc/provedor.tsx
- src/app/(autenticado)/layout.tsx
- src/app/(autenticado)/operacoes/layout.tsx
- src/app/page.tsx
- src/app/login/page.tsx
- src/components/shell/area-autenticada.tsx
- src/components/shell/area-autenticada.test.tsx
- src/components/shell/aviso-acesso.tsx
- src/components/shell/bloco-usuario.tsx
- src/components/shell/guarda-operacoes.tsx
- src/components/shell/marca.tsx
- src/components/shell/navegacao.tsx
- src/components/shell/pagina.tsx
- src/components/shell/sair.tsx
- src/components/shell/sessao.tsx
- src/components/shell/sessao-invalida.test.tsx
- src/components/login/tela-login.tsx
- src/components/login/tela-login.test.tsx
- src/components/login/formulario-login.tsx
- e2e/catalogo.spec.ts
- e2e/sessao.spec.ts
- e2e/login.spec.ts
- e2e/apoio/trpc.ts
- playwright.config.ts

Evidência dos checks (todos executados pelo agente principal em C:\dev\empresti-backend, no commit cf90302086fac11a47f7449c76e2f99e83ef4bd6, pasta de trabalho sem alterações, em 2026-11-11):
- `npm run lint`: código de saída 0. Última linha da saída: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o próprio comando; nenhuma saída depois dele).
- `npm run typecheck`: código de saída 0. Última linha da saída: `> node ./node_modules/typescript/bin/tsc --noEmit` (o próprio comando; nenhuma saída depois dele).
- `npm test`: código de saída 0. Últimas linhas: `Test Files  49 passed (49)` e `Tests  1269 passed | 1 skipped (1270)`.
- `npm run test:e2e`: código de saída 0. Última linha: `9 passed (1.0m)`. Execução com `npm run dev` já em pé em http://localhost:3000 (reuseExistingServer), iniciado com a variável `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave-publica-de-teste-sem-credencial-real`, porque esta pasta não tem arquivo de ambiente local; os testes E2E simulam o tRPC. Testes executados: e2e/catalogo.spec.ts (CA-SESSAO-06; CA-CATALOGO-01/04/06; CA-SESSAO-13 em 375px; CA-SESSAO-13 a partir de 1024px), e2e/login.spec.ts (CA-LOGIN-01, CA-LOGIN-09, CA-LOGIN-02), e2e/sessao.spec.ts (CA-LOGIN-05 sessão válida em / vai para /catalogo; CA-LOGIN-01 sem sessão / continua no formulário).
- `npm run build`: código de saída 0. Última linha: `ƒ  (Dynamic)  server-rendered on demand`; contém `✓ Compiled successfully in 6.5s`. `next-env.d.ts` restaurado depois do build.
- `npm run prisma:reset`: executado pelo responsável, em PostgreSQL local descartável (imagem postgres:17.6-alpine, com os papéis anon e authenticated criados antes), destino localhost:55432, no commit cf90302086fac11a47f7449c76e2f99e83ef4bd6, saída entregue em 2026-11-11 (registrada às 16:45:29 -03:00 pelo agente principal). Saída: aplicou as migrations 20261023110257_criar_saude_sistema, 20261111020031_criar_estrutura_dominio, 20261111025735_criar_auditoria, 20261111063517_reforcar_bloqueio_truncate, 20261111102455_nome_exibicao_memberships e 20261111123316_criar_emprestimos; última linha relevante: `Database reset successful`.
- Validação integrada real (Supabase de produção com conta real): não executada; não há registro.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/003-sessao-autorizacao/spec.md
Commit verificado: cf90302086fac11a47f7449c76e2f99e83ef4bd6

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-SESSAO-01 | src/server/api/trpc.test.ts:99; src/server/api/routers/sessao.test.ts:149; src/test/provas-finais-spec-003.test.ts:75 → src/server/api/trpc.ts:79-96, 100 | ATENDIDO | Os testes passam por todos os procedimentos não públicos do AppRouter e cobrem três casos: sem usuário, cookie ausente e token inválido. Em todos esperam `UNAUTHORIZED` com a mensagem fixa. |
| CA-SESSAO-02 | src/server/api/trpc.test.ts:130, 214; src/server/api/routers/sessao.test.ts:156; src/test/provas-finais-spec-003.test.ts:82 → src/server/api/trpc.ts:103-110; src/server/services/sessao.ts:25 | ATENDIDO | Usa banco real em container e cobre também `adminProcedure` e cada procedimento do AppRouter. |
| CA-SESSAO-03 | src/server/api/trpc.test.ts:200, 207; src/test/provas-finais-spec-003.test.ts:109 → src/server/api/trpc.ts:125-131 | ATENDIDO | `colaborador` recebe `FORBIDDEN` e `operacoes` passa com tenant e papel. A prova também cobre cada procedimento de Operações do AppRouter. |
| CA-SESSAO-04 | src/server/api/trpc.test.ts:163 → src/server/api/trpc.ts:103-106; src/server/services/sessao.ts:15-29 | ATENDIDO | Com `tenantId` do tenant B no input, o contexto continua com o tenant A, vindo de `memberships`. O teste da linha 173 prova o mesmo para claims de `user_metadata` e `app_metadata`. |
| CA-SESSAO-05 | src/server/api/routers/sessao.test.ts:78-117, 121, 128, 135; src/test/nome-exibicao.test.ts:69-88 → src/server/api/routers/sessao.ts:7-12; src/server/services/sessao.ts:37-48; src/lib/esquemas/sessao.ts:11-14; prisma/migrations/20261111102455_nome_exibicao_memberships/migration.sql:2-6 | ATENDIDO | A saída tem só as chaves `nomeExibicao` e `papel`, com `strictObject` na saída e `null` quando não há nome. Nome feito só de espaços também vira `null`. |
| CA-SESSAO-06 | src/components/shell/area-autenticada.test.tsx:44, 58; e2e/catalogo.spec.ts:99 → src/components/shell/navegacao.tsx:44-46, 61 | ATENDIDO | Provado na barra lateral e na superior com Testing Library, e no navegador pelo E2E. |
| CA-SESSAO-07 | src/components/shell/sessao-invalida.test.tsx:42 → src/components/shell/area-autenticada.tsx:120-130, 216; src/components/shell/sair.tsx:19-30 | ATENDIDO | Com `FORBIDDEN` aparece "Acesso não liberado.", sem navegação nem conteúdo. `Sair` chama `autenticacao.sair` e volta a `/`. |
| CA-SESSAO-08 | src/server/api/trpc.test.ts:140, 148; src/components/shell/sessao-invalida.test.tsx:63 → src/server/api/trpc.ts:112-118; src/server/services/sessao.ts:26; src/components/shell/area-autenticada.tsx:216 | ATENDIDO | A recusa sai como `FORBIDDEN` com `cause.motivo` igual a `MULTIPLOS_MEMBERSHIPS`, e o errorFormatter leva esse valor a `error.data.motivo` (erros.test.ts:94). A tela não escolhe tenant e não consulta outros procedimentos. |
| CA-SESSAO-09 | src/components/shell/sessao-invalida.test.tsx:81, 95, 108 → src/components/shell/area-autenticada.tsx:141-173, 206-214 | ATENDIDO | `UNAUTHORIZED` ao abrir a área ou durante o uso chama `clear()` no cache e `replace("/")`. Outro erro não encerra o acesso. |
| CA-SESSAO-10 | src/components/shell/sessao-invalida.test.tsx:121, 136 → src/components/shell/guarda-operacoes.tsx:14-25; src/app/(autenticado)/operacoes/layout.tsx:5-7 | ATENDIDO | O teste renderiza `GuardaOperacoes`, que o layout de `/operacoes` aplica a toda a subárvore. O aviso aparece dentro do shell. |
| CA-SESSAO-11 | src/server/api/erros.test.ts:94, 102, 109, 124, 130, 141, 149, 155 → src/server/api/trpc.ts:46-67 | ATENDIDO | Os testes passam pelo handler HTTP e conferem status e corpo: `campos` para erro Zod de entrada, `motivo` para erro de regra e `null` nos demais. Também conferem que não vaza pilha nem detalhe interno. |
| CA-SESSAO-12 | prisma/rotinas/vinculo.test.ts:431, 444, 453, 466, 486, 499, 525, 544, 565 → prisma/rotinas/vinculo.ts:42-95; prisma/vincular-professor.ts:25-46 | ATENDIDO | Papel e nome são gravados pela função e pela linha de comando, e entrada inválida é recusada sem gravar. Com papel e nome, a verificação de identidade continua barrando conta inexistente, não confirmada ou banida. |
| CA-SESSAO-13 | e2e/catalogo.spec.ts:69, 85; src/components/shell/area-autenticada.test.tsx:112 → src/components/shell/area-autenticada.tsx:39-56; src/components/shell/navegacao.tsx:60 | ATENDIDO | Em 375px, o E2E mede `scrollWidth - clientWidth <= 0`, com barra superior e sem sidebar. Em 1024px, a sidebar fica visível com `position: sticky` depois da rolagem. |
| CA-SESSAO-14 | src/test/nome-exibicao.test.ts:57, 93, 102 → prisma/migrations/20261111102455_nome_exibicao_memberships/migration.sql:2-6; evidência de lint, typecheck, test, test:e2e e build na delegação | AMBÍGUO | Falta decidir se a "entrega" (DF-14, sem definição versionada no repositório) vem antes de declarar a spec PRONTA. Se vier antes, esta parte fica SEM TESTE, porque a delegação diz que a validação integrada real não foi executada e não há registro dela. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run build` → passou
`git status --short` → falhou
`npm run prisma:reset` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-SESSAO-14 está AMBÍGUO, porque não está definido se a validação integrada real exigida pelo DF-14 vem antes de declarar a spec PRONTA, e ela não tem registro; e o check `git status --short` conta como falhou, porque a delegação não traz o comando nem o resultado dele (só a afirmação de pasta sem alterações e de `next-env.d.ts` restaurado).
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O `git status --short` foi executado no commit verificado antes da delegação e não mostrou alterações, mas o comando e a saída não entraram na delegação. A próxima execução os inclui.
- CA-SESSAO-14 depende de decisão do responsável: se a validação integrada real (DF-14) é condição para declarar a spec PRONTA ou só para a publicação em `main`. A mesma redação aparece no último CA das Specs 004 a 008.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; nenhuma chamada real ao Supabase é necessária nos testes E2E, que simulam o tRPC.

## V-02 — 2026-11-11

- Spec: `docs/specs/003-sessao-autorizacao/spec.md`
- Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268
- Veredito: PRONTA — todos os CAs CA-SESSAO-01 a CA-SESSAO-14 estão ATENDIDOS, todos os checks aplicáveis passaram no commit 9a421a24af0ec9d250ef70136febecf04808a268 e nada fora de escopo foi encontrado.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/003-sessao-autorizacao/spec.md

Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/003-sessao-autorizacao/spec.md
- docs/specs/003-sessao-autorizacao/plan.md
- docs/specs/003-sessao-autorizacao/tasks.md
- docs/specs/003-sessao-autorizacao/verificacao.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- prisma/schema.prisma
- prisma/migrations/20261111102455_nome_exibicao_memberships/migration.sql
- prisma/rotinas/vinculo.ts
- prisma/rotinas/vinculo.test.ts
- prisma/vincular-professor.ts
- src/lib/esquemas/sessao.ts
- src/server/api/trpc.ts
- src/server/api/trpc.test.ts
- src/server/api/erros.test.ts
- src/server/api/raiz.ts
- src/server/api/routers/sessao.ts
- src/server/api/routers/sessao.test.ts
- src/server/services/sessao.ts
- src/test/nome-exibicao.test.ts
- src/test/provas-finais-spec-003.test.ts
- src/test/trpc.tsx
- src/trpc/tipos.ts
- src/trpc/provedor.tsx
- src/app/(autenticado)/layout.tsx
- src/app/(autenticado)/operacoes/layout.tsx
- src/app/page.tsx
- src/app/login/page.tsx
- src/components/shell/area-autenticada.tsx
- src/components/shell/area-autenticada.test.tsx
- src/components/shell/aviso-acesso.tsx
- src/components/shell/bloco-usuario.tsx
- src/components/shell/guarda-operacoes.tsx
- src/components/shell/marca.tsx
- src/components/shell/navegacao.tsx
- src/components/shell/pagina.tsx
- src/components/shell/sair.tsx
- src/components/shell/sessao.tsx
- src/components/shell/sessao-invalida.test.tsx
- src/components/login/tela-login.tsx
- src/components/login/tela-login.test.tsx
- src/components/login/formulario-login.tsx
- e2e/catalogo.spec.ts
- e2e/detalhe.spec.ts
- e2e/meus-emprestimos.spec.ts
- e2e/sessao.spec.ts
- e2e/login.spec.ts
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
Spec: docs/specs/003-sessao-autorizacao/spec.md
Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-SESSAO-01 | src/server/api/trpc.test.ts:99; src/server/api/routers/sessao.test.ts:149; src/test/provas-finais-spec-003.test.ts:75 → src/server/api/trpc.ts:79-96, 100 | ATENDIDO | Os testes passam por todos os procedimentos não públicos do AppRouter e por três casos: sem usuário, cookie ausente e token inválido. Todos esperam `UNAUTHORIZED` com a mensagem fixa. |
| CA-SESSAO-02 | src/server/api/trpc.test.ts:130, 214; src/server/api/routers/sessao.test.ts:156; src/test/provas-finais-spec-003.test.ts:82 → src/server/api/trpc.ts:103-110; src/server/services/sessao.ts:15-25 | ATENDIDO | Usa banco real em container para `tenantProcedure`, `adminProcedure` e `sessao.atual`. A prova final cobre cada procedimento protegido do AppRouter. |
| CA-SESSAO-03 | src/server/api/trpc.test.ts:200, 207; src/test/provas-finais-spec-003.test.ts:109 → src/server/api/trpc.ts:125-131 | ATENDIDO | `colaborador` recebe `FORBIDDEN` ("Acesso restrito a Operações."), e `operacoes` passa com tenant e papel. A recusa também é provada em cada procedimento de Operações do AppRouter. |
| CA-SESSAO-04 | src/server/api/trpc.test.ts:163 → src/server/api/trpc.ts:103-106; src/server/services/sessao.ts:15-29 | ATENDIDO | Com `tenantId` do tenant B no input, o contexto continua com o tenant A, lido de `memberships`. O teste da linha 173 prova o mesmo para claims de `user_metadata` e `app_metadata`. |
| CA-SESSAO-05 | src/server/api/routers/sessao.test.ts:78, 93, 104, 112, 121, 128, 135; src/test/nome-exibicao.test.ts:69, 76, 83 → src/server/api/routers/sessao.ts:7-12; src/server/services/sessao.ts:37-48; src/lib/esquemas/sessao.ts:11-14 | ATENDIDO | A saída tem só as chaves `nomeExibicao` e `papel`, validada por `strictObject`, e traz `null` quando não há nome. Nome só com espaço em branco também vira `null`. |
| CA-SESSAO-06 | src/components/shell/area-autenticada.test.tsx:44, 58; e2e/catalogo.spec.ts:130 → src/components/shell/navegacao.tsx:44-46, 61 | ATENDIDO | Provado na barra lateral e na superior com Testing Library, e no navegador pelo E2E. |
| CA-SESSAO-07 | src/components/shell/sessao-invalida.test.tsx:42 → src/components/shell/area-autenticada.tsx:120-130, 216; src/components/shell/sair.tsx:19-30 | ATENDIDO | Com `FORBIDDEN` aparece "Acesso não liberado.", sem navegação nem conteúdo. `Sair` chama `autenticacao.sair` e volta a `/`. |
| CA-SESSAO-08 | src/server/api/trpc.test.ts:140, 148; src/server/api/erros.test.ts:94; src/components/shell/sessao-invalida.test.tsx:63 → src/server/api/trpc.ts:53, 112-118; src/server/services/sessao.ts:26; src/components/shell/area-autenticada.tsx:216 | ATENDIDO | A recusa sai como `FORBIDDEN` com `cause.motivo` igual a `MULTIPLOS_MEMBERSHIPS`, que o errorFormatter leva a `error.data.motivo`. A tela não escolhe tenant e não chama outros procedimentos. |
| CA-SESSAO-09 | src/components/shell/sessao-invalida.test.tsx:81, 95, 108 → src/components/shell/area-autenticada.tsx:141-173, 206-214 | ATENDIDO | `UNAUTHORIZED`, ao abrir a área ou durante o uso, chama `clear()` no cache e `replace("/")`. Outros erros não encerram o acesso. |
| CA-SESSAO-10 | src/components/shell/sessao-invalida.test.tsx:121, 136 → src/components/shell/guarda-operacoes.tsx:14-25; src/app/(autenticado)/operacoes/layout.tsx:5-7 | ATENDIDO | O teste renderiza `GuardaOperacoes`, que o layout de `/operacoes` aplica a toda a subárvore. O aviso aparece dentro do shell. |
| CA-SESSAO-11 | src/server/api/erros.test.ts:94, 102, 109, 124, 130, 141, 149, 155 → src/server/api/trpc.ts:46-67 | ATENDIDO | Os testes passam pelo handler HTTP e conferem status e corpo: `campos` para erro Zod de entrada, `motivo` para erro de regra e `null` nos demais casos. Também conferem que não vaza pilha nem detalhe interno. |
| CA-SESSAO-12 | prisma/rotinas/vinculo.test.ts:431, 444, 453, 472, 486, 499, 525, 544, 565 → prisma/rotinas/vinculo.ts:42-95; prisma/vincular-professor.ts:25-46 | ATENDIDO | Papel e nome são gravados pela função e pela linha de comando, e entrada inválida é recusada sem gravar. Com papel e nome, a verificação de identidade continua barrando conta inexistente, não confirmada ou banida. |
| CA-SESSAO-13 | e2e/catalogo.spec.ts:79, 95; e2e/detalhe.spec.ts:94; e2e/meus-emprestimos.spec.ts:78; src/components/shell/area-autenticada.test.tsx:112 → src/components/shell/area-autenticada.tsx:39-56; src/components/shell/navegacao.tsx:60 | ATENDIDO | Em 375px, o E2E mede `scrollWidth - clientWidth <= 0` no catálogo, no detalhe e em Meus empréstimos, com barra superior e sem sidebar. Em 1024px, a sidebar continua visível e com `position: sticky` depois da rolagem. |
| CA-SESSAO-14 | src/test/nome-exibicao.test.ts:57, 93, 102 → prisma/migrations/20261111102455_nome_exibicao_memberships/migration.sql:2-6; registro na delegação de lint, typecheck, test, test:e2e e build no commit verificado | ATENDIDO | Lint, typecheck, testes, E2E com tRPC simulado e build constam como aprovados no commit verificado, o que basta para PRONTA segundo o próprio CA e a DF-14. A validação integrada real não foi executada; ela continua obrigatória antes da publicação em `main` e na Vercel (docs/VALIDACAO-INTEGRADA.md), mas não é condição desta verificação. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run build` → passou
`git status --short` → passou
`npm run prisma:reset` → passou

Fora de escopo: nada encontrado
Veredito: PRONTA — todos os CAs CA-SESSAO-01 a CA-SESSAO-14 estão ATENDIDOS, todos os checks aplicáveis passaram no commit 9a421a24af0ec9d250ef70136febecf04808a268 e nada fora de escopo foi encontrado.
```

### Observações do agente principal

- Diferenças em relação à execução anterior (V-01, commit `cf90302086fac11a47f7449c76e2f99e83ef4bd6`): CA-SESSAO-14 passou de AMBÍGUO a ATENDIDO, depois do esclarecimento do CA pela DF-14; o check `git status --short` passou de `falhou` a `passou`, porque o comando, o código de saída e a saída completa entraram na delegação; o veredito passou de NÃO PRONTA a PRONTA.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
