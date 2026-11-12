# Verificações — 006-regras-emprestimo

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | 9a421a24af0ec9d250ef70136febecf04808a268 | CA-REGRAS-03: SEM TESTE; CA-REGRAS-06: SEM TESTE | nenhum | NÃO PRONTA |
| V-02 | 2026-11-11 | 854f6c42eb308e69a773123ccdd8cd046127d6dc | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/006-regras-emprestimo/spec.md`
- Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268
- Veredito: NÃO PRONTA — CA-REGRAS-03 e CA-REGRAS-06 estão SEM TESTE: nenhum teste cita esses IDs, e a prova por referência à Spec 005 (T-REGRAS-05) não foi feita; todos os checks constam como `passou`.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/006-regras-emprestimo/spec.md

Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/006-regras-emprestimo/spec.md
- docs/specs/006-regras-emprestimo/plan.md
- docs/specs/006-regras-emprestimo/tasks.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- src/lib/esquemas/emprestimos.ts
- src/lib/prazos.ts
- src/lib/prazos.test.ts
- src/server/api/routers/emprestimos.ts
- src/server/api/routers/emprestimos.test.ts
- src/server/api/routers/emprestimos-solicitar.test.ts
- src/server/api/routers/emprestimos-limite.test.ts
- src/server/api/routers/emprestimos-atraso.test.ts
- src/server/services/emprestimos.ts
- src/components/emprestimos/card-seus-itens.tsx
- src/components/emprestimos/contador-itens.tsx
- src/components/emprestimos/resumo.tsx
- src/components/emprestimos/segmentos-limite.tsx
- src/components/emprestimos/regras.test.tsx
- src/components/catalogo/faixa-regras.tsx
- src/components/catalogo/card-solicitacao.tsx
- src/components/catalogo/tela-detalhe.tsx
- src/components/catalogo/tela-catalogo.tsx
- src/components/emprestimos/tela-meus-emprestimos.tsx
- e2e/detalhe.spec.ts
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
Spec: docs/specs/006-regras-emprestimo/spec.md
Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-REGRAS-01 | src/server/api/routers/emprestimos-limite.test.ts:89 (também :104, :119, :157) → src/server/services/emprestimos.ts:100-102; src/server/api/routers/emprestimos.ts:37, :126-131 | ATENDIDO | Postgres real (Testcontainers), procedimento via createCaller: três aceites, o quarto recusado com code CONFLICT, mensagem e motivo LIMITE_ATINGIDO, e o banco fica com 3 abertos. A recusa não grava empréstimo nem auditoria. |
| CA-REGRAS-02 | src/server/api/routers/emprestimos-limite.test.ts:192, :212 → src/server/services/emprestimos.ts:94-102 | ATENDIDO | Sete pedidos simultâneos da mesma pessoa, em 3 rodadas, contra Postgres real: exatamente 3 aceites e as demais recusas com LIMITE_ATINGIDO. A serialização é por `SELECT ... FOR UPDATE` no membership, como diz o plano. |
| CA-REGRAS-03 | nenhum teste cita este CA (o CA-SOLIC-01 referenciado tem testes em src/server/api/routers/emprestimos-solicitar.test.ts:145, :171 → src/lib/prazos.ts:28; src/server/services/emprestimos.ts:88, :143) | SEM TESTE | Nenhum teste cita CA-REGRAS-03, e a busca pelo ID exigida por rules/tests.md não acha teste. A T-REGRAS-05, que prevê essa prova por referência, está pendente em tasks.md. |
| CA-REGRAS-04 | src/server/api/routers/emprestimos-atraso.test.ts:121 (também :153, :177) → src/server/services/emprestimos.ts:54-60, :101 | ATENDIDO | Com 1 item vencido (abaixo do limite), a recusa é ITEM_EM_ATRASO, com code, mensagem e motivo, e não grava empréstimo nem auditoria. Também prova que o atraso vem antes do limite e antes das recusas de equipamento. |
| CA-REGRAS-05 | src/server/api/routers/emprestimos-atraso.test.ts:138 → src/server/services/emprestimos.ts:54 | ATENDIDO | Uma fixture gravada direto no banco, com vencimento passado e `devolvido_em` preenchido, não bloqueia a solicitação. Não depende da Spec 007. |
| CA-REGRAS-06 | nenhum teste cita este CA (o CA-SOLIC-02 referenciado tem teste em src/server/api/routers/emprestimos-solicitar.test.ts:239 → src/server/services/emprestimos.ts:124-126) | SEM TESTE | Nenhum teste cita CA-REGRAS-06. A prova por referência prevista na T-REGRAS-05 (pendente) não existe. |
| CA-REGRAS-07 | src/components/emprestimos/regras.test.tsx:81, :92, :132; e2e/detalhe.spec.ts:104 → src/components/emprestimos/resumo.tsx:16-33; src/components/catalogo/card-solicitacao.tsx:94-98, :155; src/components/catalogo/tela-catalogo.tsx:96-100, :152; src/components/emprestimos/card-seus-itens.tsx:12-15 | ATENDIDO | No limite e com atraso, o botão "Solicitar empréstimo" fica desabilitado e aparece a nota do motivo, no detalhe e no catálogo (onde "Solicitar" fica com aria-disabled e esmaecido). O E2E confirma o caso de atraso no navegador. |
| CA-REGRAS-08 | src/server/api/routers/emprestimos-limite.test.ts:227; src/server/api/routers/emprestimos-atraso.test.ts:227 → src/server/api/routers/emprestimos.ts:114-133; src/server/services/emprestimos.ts:101-102 | ATENDIDO | A chamada ao procedimento via createCaller, sem interface, é recusada com CONFLICT e motivo LIMITE_ATINGIDO ou ITEM_EM_ATRASO. |
| CA-REGRAS-09 | src/server/api/routers/emprestimos-atraso.test.ts:251, :268 → src/server/services/emprestimos.ts:55-59; src/lib/prazos.ts:17-19 | ATENDIDO | Datas fixas: vencimento em 2026-11-20, sem atraso às 02:59:59Z de 21/11 e com atraso às 03:00:00Z (meia-noite em São Paulo). Vale tanto no `meuResumo` quanto no `solicitar`, com relógio injetado. |
| CA-REGRAS-10 | nenhum teste cita este CA → registro verificável na delegação: lint, typecheck, test, test:e2e e build com código 0 no commit 9a421a24af0ec9d250ef70136febecf04808a268, em 2026-11-11 | ATENDIDO | Os comandos exigidos constam como executados, com resultado e última linha, no commit verificado. O E2E usa tRPC simulado, o que o próprio CA aceita; a validação integrada real não é pré-condição para PRONTA (DF-14). |

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
Veredito: NÃO PRONTA — CA-REGRAS-03 e CA-REGRAS-06 estão SEM TESTE: nenhum teste cita esses IDs, e a prova por referência à Spec 005 (T-REGRAS-05) não foi feita; todos os checks constam como `passou`.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- CA-REGRAS-03 e CA-REGRAS-06 voltam para as tarefas: falta a prova por referência à Spec 005 prevista na T-REGRAS-05, com testes que citem esses IDs. A correção exige nova execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.

## V-02 — 2026-11-11

- Spec: `docs/specs/006-regras-emprestimo/spec.md`
- Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc
- Veredito: PRONTA — os CAs CA-REGRAS-01 a CA-REGRAS-10 estão ATENDIDOS com prova no commit verificado, todos os checks constam como `passou` e não há código fora de escopo.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/006-regras-emprestimo/spec.md

Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/006-regras-emprestimo/spec.md
- docs/specs/006-regras-emprestimo/plan.md
- docs/specs/006-regras-emprestimo/tasks.md
- docs/specs/006-regras-emprestimo/verificacao.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- src/lib/esquemas/emprestimos.ts
- src/lib/prazos.ts
- src/lib/prazos.test.ts
- src/server/api/routers/emprestimos.ts
- src/server/api/routers/emprestimos.test.ts
- src/server/api/routers/emprestimos-solicitar.test.ts
- prisma/rotinas/carga-inicial.ts
- src/server/api/routers/emprestimos-limite.test.ts
- src/server/api/routers/emprestimos-atraso.test.ts
- src/server/services/emprestimos.ts
- src/components/emprestimos/card-seus-itens.tsx
- src/components/emprestimos/contador-itens.tsx
- src/components/emprestimos/resumo.tsx
- src/components/emprestimos/segmentos-limite.tsx
- src/components/emprestimos/regras.test.tsx
- src/components/catalogo/faixa-regras.tsx
- src/components/catalogo/card-solicitacao.tsx
- src/components/catalogo/tela-detalhe.tsx
- src/components/catalogo/tela-catalogo.tsx
- src/components/emprestimos/tela-meus-emprestimos.tsx
- e2e/detalhe.spec.ts
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
Spec: docs/specs/006-regras-emprestimo/spec.md
Commit verificado: 854f6c42eb308e69a773123ccdd8cd046127d6dc

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-REGRAS-01 | src/server/api/routers/emprestimos-limite.test.ts:89 (também :104, :119, :157) → src/server/services/emprestimos.ts:100-102; src/server/api/routers/emprestimos.ts:37, :126-131 | ATENDIDO | Usa Postgres real com Testcontainers e chama o procedimento por createCaller: os três primeiros pedidos são aceitos, e o quarto é recusado com CONFLICT, a mensagem e o motivo LIMITE_ATINGIDO. O banco termina com 3 abertos, e a recusa não grava empréstimo nem auditoria. |
| CA-REGRAS-02 | src/server/api/routers/emprestimos-limite.test.ts:192, :212 → src/server/services/emprestimos.ts:94-102 | ATENDIDO | Sete pedidos simultâneos da mesma pessoa, repetidos em 3 rodadas no Postgres real, terminam com exatamente 3 aceites e as demais recusas com LIMITE_ATINGIDO. A serialização vem do `SELECT ... FOR UPDATE` no membership, como prevê o plano. |
| CA-REGRAS-03 | src/server/api/routers/emprestimos-solicitar.test.ts:145, :171 → src/lib/prazos.ts:28-30; src/server/services/emprestimos.ts:88, :143 | ATENDIDO | Os testes citam CA-SOLIC-01 / CA-REGRAS-03 e usam datas fixas: o empréstimo é gravado com devolver_ate 14 dias corridos depois da data da retirada em São Paulo, inclusive numa retirada à noite. A prova por referência ao CA-SOLIC-01 está atendida. |
| CA-REGRAS-04 | src/server/api/routers/emprestimos-atraso.test.ts:121 (também :153, :177) → src/server/services/emprestimos.ts:54-60, :101 | ATENDIDO | Com 1 item vencido, abaixo do limite, a recusa é ITEM_EM_ATRASO, com o code, a mensagem e o motivo, sem gravar empréstimo nem auditoria. Os testes também provam que o atraso é verificado antes do limite e antes das recusas de equipamento. |
| CA-REGRAS-05 | src/server/api/routers/emprestimos-atraso.test.ts:138 → src/server/services/emprestimos.ts:54 | ATENDIDO | Uma fixture gravada direto no banco, com vencimento passado e `devolvido_em` preenchido, não bloqueia a solicitação. O teste não depende da Spec 007. |
| CA-REGRAS-06 | src/server/api/routers/emprestimos-solicitar.test.ts:239 → src/server/services/emprestimos.ts:124-126; prisma/rotinas/carga-inicial.ts:10, :13 | ATENDIDO | O teste cita CA-SOLIC-02 / CA-REGRAS-06 e chama o procedimento por createCaller com TI-0004 e TI-0007, os dois em manutenção na carga. A recusa vem com o code, a mensagem e o motivo EQUIPAMENTO_EM_MANUTENCAO, e nenhum empréstimo é gravado. |
| CA-REGRAS-07 | src/components/emprestimos/regras.test.tsx:81, :92, :132; e2e/detalhe.spec.ts:104 → src/components/emprestimos/resumo.tsx:16-33; src/components/catalogo/card-solicitacao.tsx:94-98, :155; src/components/catalogo/tela-catalogo.tsx:74, :96-100, :152; src/components/emprestimos/card-seus-itens.tsx:12-15 | ATENDIDO | No limite e com atraso, o botão "Solicitar empréstimo" do detalhe fica desabilitado e a nota do motivo aparece. No catálogo, a nota aparece e "Solicitar" fica com aria-disabled e esmaecido. O E2E confirma o caso de atraso no navegador. |
| CA-REGRAS-08 | src/server/api/routers/emprestimos-limite.test.ts:227; src/server/api/routers/emprestimos-atraso.test.ts:227 → src/server/api/routers/emprestimos.ts:114-133; src/server/services/emprestimos.ts:101-102 | ATENDIDO | A chamada direta ao procedimento por createCaller, sem passar pela interface, é recusada com CONFLICT e o motivo LIMITE_ATINGIDO ou ITEM_EM_ATRASO. |
| CA-REGRAS-09 | src/server/api/routers/emprestimos-atraso.test.ts:251, :268 → src/server/services/emprestimos.ts:55-59; src/lib/prazos.ts:17-19 | ATENDIDO | Com vencimento em 2026-11-20, não há atraso às 02:59:59Z de 21/11 e há atraso às 03:00:00Z, a meia-noite em São Paulo. O resultado vale no `meuResumo` e no `solicitar`, com relógio injetado. |
| CA-REGRAS-10 | nenhum teste cita este CA → registro verificável na delegação: lint, typecheck, test, test:e2e e build com código 0 no commit 854f6c42eb308e69a773123ccdd8cd046127d6dc, em 2026-11-11 | ATENDIDO | Os comandos exigidos constam como executados no commit verificado, com resultado e última linha. O E2E usa tRPC simulado, o que o próprio CA aceita, e a validação integrada real não é pré-condição para PRONTA (DF-14). |

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
Veredito: PRONTA — os CAs CA-REGRAS-01 a CA-REGRAS-10 estão ATENDIDOS com prova no commit verificado, todos os checks constam como `passou` e não há código fora de escopo.
```

### Observações do agente principal

- Diferenças em relação à execução anterior (V-01, commit `9a421a24af0ec9d250ef70136febecf04808a268`): CA-REGRAS-03 e CA-REGRAS-06 passaram de SEM TESTE a ATENDIDO, com os testes de `emprestimos-solicitar.test.ts` que provam CA-SOLIC-01 e CA-SOLIC-02 citando também os IDs da Spec 006 (T-REGRAS-05, PR #85); os checks continuam `passou`; o veredito passou de NÃO PRONTA a PRONTA.
- O commit verificado é o `develop` depois dos PRs #84 e #85; o `prisma:reset` foi executado de novo pelo responsável nesse commit.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
