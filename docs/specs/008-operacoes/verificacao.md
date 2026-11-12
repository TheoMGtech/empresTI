# Verificações — 008-operacoes

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-12 | 3e0fa9e19e34dede64848721cdc2983a578706f0 | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-12

- Spec: `docs/specs/008-operacoes/spec.md`
- Commit verificado: 3e0fa9e19e34dede64848721cdc2983a578706f0
- Veredito: PRONTA — os CAs CA-OPER-01 a CA-OPER-12 estão ATENDIDO, todos os checks constam como `passou` no commit 3e0fa9e19e34dede64848721cdc2983a578706f0 e nada foi encontrado fora do escopo.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/008-operacoes/spec.md

Commit verificado: 3e0fa9e19e34dede64848721cdc2983a578706f0 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/008-operacoes/spec.md
- docs/specs/008-operacoes/plan.md
- docs/specs/008-operacoes/tasks.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- src/lib/esquemas/operacoes.ts
- src/lib/esquemas/equipamentos.ts
- src/lib/prazos.ts
- src/server/api/trpc.ts
- src/server/api/raiz.ts
- src/server/api/routers/operacoes.ts
- src/server/api/routers/equipamentos.ts
- src/server/services/operacoes.ts
- src/server/services/equipamentos.ts
- src/server/services/encerramento-emprestimo.ts
- src/server/api/routers/operacoes-contrato.test.ts
- src/server/api/routers/operacoes-painel.test.ts
- src/server/api/routers/operacoes-devolucao.test.ts
- src/server/api/routers/equipamentos-cadastrar.test.ts
- src/server/api/routers/equipamentos-situacao.test.ts
- src/server/api/routers/equipamentos-listar.test.ts
- src/test/provas-finais-spec-008.test.ts
- src/test/auditoria.test.ts
- prisma/migrations/20261111025735_criar_auditoria/migration.sql
- src/app/(autenticado)/operacoes/layout.tsx
- src/app/(autenticado)/operacoes/emprestimos/page.tsx
- src/app/(autenticado)/operacoes/equipamentos/novo/page.tsx
- src/components/shell/guarda-operacoes.tsx
- src/components/operacoes/tela-emprestimos-abertos.tsx
- src/components/operacoes/tela-emprestimos-abertos.test.tsx
- src/components/operacoes/tela-cadastro.tsx
- src/components/operacoes/tela-cadastro.test.tsx
- src/components/operacoes/controle-situacao.tsx
- src/components/operacoes/situacoes.ts
- src/components/catalogo/tela-detalhe.tsx
- e2e/operacoes.spec.ts
- e2e/cadastro.spec.ts
- e2e/apoio/trpc.ts
- playwright.config.ts

Evidência dos checks (todos no commit 3e0fa9e19e34dede64848721cdc2983a578706f0, em C:\dev\empresti-backend, branch feature/be-verificacao-008, igual a `origin/develop`, em 2026-11-11/12):
- `git rev-parse HEAD`: `3e0fa9e19e34dede64848721cdc2983a578706f0`, conferido antes e depois dos checks.
- `npm run lint`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o próprio comando; nenhuma saída depois dele).
- `npm run typecheck`: executado pelo agente principal; código de saída 0. Última linha da saída: `> node ./node_modules/typescript/bin/tsc --noEmit` (o próprio comando; nenhuma saída depois dele).
- `npm test`: executado pelo agente principal; código de saída 0. Últimas linhas relevantes: `Test Files  57 passed (57)` e `Tests  1355 passed | 1 skipped (1356)`.
- `npm run test:e2e`: executado pelo agente principal com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=chave-publica-de-teste-sem-credencial-real` no ambiente do comando (a pasta não tem arquivo de ambiente local); o Playwright subiu e encerrou o `npm run dev` pelo webServer da configuração; os testes E2E simulam o tRPC. Código de saída 0. Última linha: `23 passed (1.2m)`. Testes executados: e2e/cadastro.spec.ts (RF-OPER-05 formato de patrimônio inválido é barrado no navegador; CA-OPER-06 patrimônio repetido fica no campo, e o cadastro segue depois de corrigido; CA-SESSAO-13 cadastro em 375px sem rolagem horizontal), e2e/catalogo.spec.ts (CA-CATALOGO-01/04/06; CA-SESSAO-13 375px; CA-SESSAO-13 1024px; CA-CATALOGO-07; CA-SESSAO-06), e2e/detalhe.spec.ts (CA-SOLIC-10/RF-SOLIC-04; RF-SOLIC-06; CA-SESSAO-13; CA-REGRAS-07; RF-REGRAS-03), e2e/login.spec.ts (CA-LOGIN-01, CA-LOGIN-09, CA-LOGIN-02), e2e/meus-emprestimos.spec.ts (CA-DEVOL-01/02; CA-SESSAO-13), e2e/operacoes.spec.ts (CA-OPER-01/03 Operações filtra atrasados e registra a devolução no balcão; CA-SESSAO-10 colaborador em /operacoes/emprestimos vê acesso restrito; CA-SESSAO-13 painel em 375px sem rolagem horizontal), e2e/sessao.spec.ts (CA-LOGIN-05; CA-LOGIN-01).
- `npm run build`: executado pelo agente principal; código de saída 0. Última linha: `ƒ  (Dynamic)  server-rendered on demand`; contém `✓ Compiled successfully in 3.6s`. Em seguida `git checkout -- next-env.d.ts`.
- `git status --short`: executado pelo agente principal antes dos checks e depois do build e da restauração de `next-env.d.ts`; código de saída 0; saída completa nas duas vezes: vazia (nenhuma linha).
- `npm run prisma:reset`: executado pelo responsável, em PostgreSQL local descartável, no mesmo commit. Conferências registradas no terminal: `git rev-parse HEAD` → `3e0fa9e19e34dede64848721cdc2983a578706f0`; container novo: `docker ps` → `empresti-reset postgres:17.6-alpine 0.0.0.0:55432->5432/tcp`; `select current_database(), version()` no container → `postgres|PostgreSQL 17.6 on x86_64-pc-linux-musl, compiled by gcc (Alpine 14.2.0) 14.2.0, 64-bit`; papéis `anon` e `authenticated` criados (`CREATE ROLE` duas vezes). Saída do reset: `Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:55432"`; aplicou 20261023110257_criar_saude_sistema, 20261111020031_criar_estrutura_dominio, 20261111025735_criar_auditoria, 20261111063517_reforcar_bloqueio_truncate, 20261111102455_nome_exibicao_memberships e 20261111123316_criar_emprestimos; `Database reset successful`; em seguida `docker stop empresti-reset`. Registrado pelo agente principal em 2026-11-12.
- Validação integrada real (Supabase de produção, contas reais): não executada; não há registro.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/008-operacoes/spec.md
Commit verificado: 3e0fa9e19e34dede64848721cdc2983a578706f0

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-OPER-01 | src/server/api/routers/operacoes-painel.test.ts:150, :259; src/components/operacoes/tela-emprestimos-abertos.test.tsx:76; e2e/operacoes.spec.ts:59 → src/server/services/operacoes.ts:53-60, :77-111; src/server/api/routers/operacoes.ts:23-31 | ATENDIDO | Em banco real, com dois tenants, a lista traz os seis empréstimos em aberto do tenant A e exclui o encerrado e o do tenant B. Pelo procedimento, Operações do tenant B vê só o próprio empréstimo. |
| CA-OPER-02 | src/server/api/routers/operacoes-painel.test.ts:267, :281, :290, :302; src/components/operacoes/tela-emprestimos-abertos.test.tsx:84 → src/server/services/operacoes.ts:27-37, :115-131; src/components/operacoes/tela-emprestimos-abertos.tsx:205-210 | ATENDIDO | Os quatro contadores são conferidos com datas fixas (20/11/2026 em São Paulo), inclusive nas bordas do dia e de hoje + 3 contra hoje + 4, como diz a D-OPER-05. O tenant B não soma dados do tenant A, e a tela mostra os quatro cards. |
| CA-OPER-03 | src/server/api/routers/operacoes-devolucao.test.ts:127, :148; src/components/operacoes/tela-emprestimos-abertos.test.tsx:122; e2e/operacoes.spec.ts:59 → src/server/api/routers/operacoes.ts:42-56; src/server/services/encerramento-emprestimo.ts:40-77 | ATENDIDO | Operações encerra o empréstimo de outra pessoa (`devolvido_por` = Operações), o item volta a `disponivel` no catálogo e o atraso deixa de bloquear a pessoa. A tela pede confirmação em diálogo antes de chamar `registrarDevolucao` (RF-OPER-04). |
| CA-OPER-04 | src/server/api/routers/operacoes-contrato.test.ts:183; src/test/provas-finais-spec-008.test.ts:84, :91, :95; src/server/api/routers/operacoes-painel.test.ts:347; src/server/api/routers/operacoes-devolucao.test.ts:193; src/server/api/routers/equipamentos-cadastrar.test.ts:216; src/server/api/routers/equipamentos-situacao.test.ts:264 → src/server/api/trpc.ts:125-131; src/server/api/routers/operacoes.ts:23, :34, :42, :59; src/server/api/routers/equipamentos.ts:69, :91 | ATENDIDO | Os seis procedimentos recusam `colaborador` com FORBIDDEN, e o teste lido do AppRouter prova que eles são exatamente os procedimentos restritos. As mutações mostram, em banco real, que nada é gravado quando a chamada é recusada. |
| CA-OPER-05 | src/server/api/routers/equipamentos-cadastrar.test.ts:111, :138; src/components/operacoes/tela-cadastro.test.tsx:65 → src/server/api/routers/equipamentos.ts:69-78; src/server/services/equipamentos.ts:225-256 | ATENDIDO | O `tenantId` enviado no input é descartado, e o equipamento é gravado no tenant da sessão, com os opcionais e sem fotografia. |
| CA-OPER-06 | src/server/api/routers/equipamentos-cadastrar.test.ts:180, :207; src/server/api/routers/operacoes-contrato.test.ts:141; src/components/operacoes/tela-cadastro.test.tsx:112; e2e/cadastro.spec.ts:33 → src/lib/esquemas/equipamentos.ts:105, :121; src/server/services/equipamentos.ts:257-260; src/server/api/routers/equipamentos.ts:80-86 | ATENDIDO | Um patrimônio repetido no tenant responde CONFLICT com motivo `PATRIMONIO_DUPLICADO`, sem gravar nada nem auditar. Os formatos fora de `^TI-\d{4}$` são recusados com BAD_REQUEST, sem gravação. |
| CA-OPER-07 | src/server/api/routers/equipamentos-cadastrar.test.ts:158; src/server/api/routers/equipamentos-situacao.test.ts:114 → src/server/services/equipamentos.ts:35-56, :276-313 | ATENDIDO | Um item cadastrado em manutenção ou colocado em manutenção sai dos disponíveis, aparece como `manutencao` e tem a solicitação recusada com `EQUIPAMENTO_EM_MANUTENCAO`. |
| CA-OPER-08 | src/server/api/routers/operacoes-devolucao.test.ts:220, :232; src/server/api/routers/equipamentos-cadastrar.test.ts:228, :238; src/server/api/routers/equipamentos-situacao.test.ts:283, :302 → src/server/services/encerramento-emprestimo.ts:46-76; src/server/services/equipamentos.ts:231-256, :282-312 | ATENDIDO | As três operações gravam a auditoria com o UUID de Operações como ator. Uma falha forçada na auditoria desfaz a operação na mesma transação, e isso é provado em banco real para as três. |
| CA-OPER-09 | src/server/api/routers/equipamentos-situacao.test.ts:165, :185, :199; src/components/operacoes/tela-cadastro.test.tsx:182, :197 → src/server/services/equipamentos.ts:283-294; src/server/api/routers/equipamentos.ts:110-116; src/components/operacoes/controle-situacao.tsx:42-44 | ATENDIDO | Com empréstimo em aberto, as três situações são recusadas com `EMPRESTIMO_EM_ABERTO`, sem mudar a situação nem a auditoria. A prova de concorrência com a solicitação nunca deixa um item em manutenção emprestado. |
| CA-OPER-10 | src/server/api/routers/operacoes-painel.test.ts:311; src/components/operacoes/tela-cadastro.test.tsx:142 → src/server/services/operacoes.ts:134-144; src/server/api/routers/operacoes.ts:59-61 | ATENDIDO | Depois de quatro cadastros, a resposta traz os três mais recentes em ordem decrescente, no formato `{ patrimonio, nome, criadoEm }`, e o cadastro do tenant B não entra. |
| CA-OPER-11 | src/server/api/routers/operacoes-painel.test.ts:189, :211 → src/server/services/operacoes.ts:27-37, :57; src/lib/prazos.ts:17-25 | ATENDIDO | Com datas fixas, a janela vai de hoje até hoje + 7, com as duas pontas inclusive e sem os atrasados. A virada do dia segue o fuso America/Sao_Paulo (último segundo de 20/11 e primeiro de 21/11). |
| CA-OPER-12 | nenhum teste cita este CA; registro verificável na delegação: `npm run lint`, `npm run typecheck`, `npm test`, `npm run test:e2e` (inclui e2e/operacoes.spec.ts:59 e e2e/cadastro.spec.ts:33) e `npm run build` no commit 3e0fa9e19e34dede64848721cdc2983a578706f0, em 2026-11-11/12, todos com código de saída 0 → package.json:12-16; playwright.config.ts:10-14 | ATENDIDO | Todos os checks constam como aprovados no commit verificado, com E2E de tRPC simulado, o que basta para PRONTA segundo a DF-14 (spec.md:100-104). A validação integrada real não foi executada e continua obrigatória antes da publicação em `main` e na Vercel. |

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
Veredito: PRONTA — os CAs CA-OPER-01 a CA-OPER-12 estão ATENDIDO, todos os checks constam como `passou` no commit 3e0fa9e19e34dede64848721cdc2983a578706f0 e nada foi encontrado fora do escopo.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
