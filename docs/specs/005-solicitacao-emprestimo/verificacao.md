# Verificações — 005-solicitacao-emprestimo

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | 9a421a24af0ec9d250ef70136febecf04808a268 | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/005-solicitacao-emprestimo/spec.md`
- Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268
- Veredito: PRONTA — os CA-SOLIC-01 a CA-SOLIC-11 estão ATENDIDOS, todos os checks aplicáveis passaram no commit 9a421a24af0ec9d250ef70136febecf04808a268 e não há comportamento sem spec aprovada.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/005-solicitacao-emprestimo/spec.md

Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/005-solicitacao-emprestimo/spec.md
- docs/specs/005-solicitacao-emprestimo/plan.md
- docs/specs/005-solicitacao-emprestimo/tasks.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- prisma/schema.prisma
- prisma/migrations/20261111123316_criar_emprestimos/migration.sql
- src/lib/esquemas/emprestimos.ts
- src/lib/esquemas/equipamentos.ts
- src/lib/prazos.ts
- src/lib/prazos.test.ts
- src/server/api/trpc.ts
- src/server/api/raiz.ts
- src/server/api/routers/emprestimos.ts
- src/server/api/routers/equipamentos.ts
- src/server/api/routers/emprestimos.test.ts
- src/server/api/routers/emprestimos-solicitar.test.ts
- src/server/api/routers/equipamentos-detalhar.test.ts
- src/server/api/routers/equipamentos-emprestado.test.ts
- src/server/services/emprestimos.ts
- src/server/services/equipamentos.ts
- src/test/emprestimos-estrutura.test.ts
- src/test/estrutura-dominio.test.ts
- src/test/banco-real.test.ts
- src/test/auditoria.test.ts
- src/test/rls-dominio.test.ts
- prisma/rotinas/carga.test.ts
- prisma/rotinas/vinculo.test.ts
- src/app/(autenticado)/catalogo/[patrimonio]/page.tsx
- src/components/catalogo/card-solicitacao.tsx
- src/components/catalogo/tela-detalhe.tsx
- src/components/catalogo/tela-detalhe.test.tsx
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
Spec: docs/specs/005-solicitacao-emprestimo/spec.md
Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-SOLIC-01 | src/server/api/routers/emprestimos-solicitar.test.ts:145, :171; src/test/emprestimos-estrutura.test.ts:132 → src/server/services/emprestimos.ts:88, :137-146; src/lib/prazos.ts:28-30 | ATENDIDO | Em banco real e com data fixa, o teste confere a linha gravada: retirada em `agora`, `devolver_ate` em 2026-11-25 (14 dias corridos) e `devolvido_em` nulo. Também cobre a retirada à noite, contada pela data de São Paulo. |
| CA-SOLIC-02 | src/server/api/routers/emprestimos-solicitar.test.ts:239 → src/server/services/emprestimos.ts:124-126; src/server/api/routers/emprestimos.ts:36, :126-131 | ATENDIDO | TI-0004 e TI-0007 (`em_manutencao` na carga, prisma/rotinas/carga-inicial.ts:10, :13) são recusados com o motivo `EQUIPAMENTO_EM_MANUTENCAO`, e nenhum empréstimo é gravado. |
| CA-SOLIC-03 | src/server/api/routers/emprestimos-solicitar.test.ts:325, :348 → prisma/migrations/20261111123316_criar_emprestimos/migration.sql:38-39; src/server/services/emprestimos.ts:131-135, :159-161 | ATENDIDO | Em cinco rodadas com três solicitações paralelas no Postgres real, o banco fica com um único empréstimo e as outras recebem `EQUIPAMENTO_INDISPONIVEL`. Uma corrida forçada entre a leitura e a inserção prova que o índice parcial decide. |
| CA-SOLIC-04 | src/server/api/routers/equipamentos-detalhar.test.ts:141, :147, :156; src/server/api/routers/emprestimos-solicitar.test.ts:264, :276, :287 → src/server/services/equipamentos.ts:58-62, :140-154; src/server/services/emprestimos.ts:112-123; src/server/api/trpc.ts:103-106 | ATENDIDO | Detalhar e solicitar são testados entre tenants, e solicitar nos dois sentidos: o resultado é `NOT_FOUND` sem gravar empréstimo nem auditoria. Com o mesmo patrimônio nos dois tenants, cada usuário recebe o item do próprio tenant. |
| CA-SOLIC-05 | src/test/emprestimos-estrutura.test.ts:172, :180, :188, :196 → prisma/migrations/20261111123316_criar_emprestimos/migration.sql:27, :30, :33 | ATENDIDO | As FKs compostas por (tenant, equipamento) e (user, tenant) rejeitam com 23503 o equipamento de outro tenant, a pessoa sem membership e um tenant diferente dos dois. |
| CA-SOLIC-06 | src/test/emprestimos-estrutura.test.ts:278, :295, :315, :329, :344, :366 → prisma/migrations/20261111123316_criar_emprestimos/migration.sql:50-64 | ATENDIDO | Os testes provam RLS habilitada, policies de negação para `anon` e `authenticated` sem leitura nem escrita, `TRUNCATE` revogado e o trigger barrando `TRUNCATE` inclusive para o dono. O trigger dispara sempre (`tgenabled = A`). |
| CA-SOLIC-07 | src/server/api/routers/emprestimos-solicitar.test.ts:398, :415, :451 → src/server/services/emprestimos.ts:91, :148-155 | ATENDIDO | A auditoria é gravada com o UUID como ator, na mesma transação. Com a falha forçada em `auditoria.create`, nada fica em `emprestimos` nem em `auditoria`. |
| CA-SOLIC-08 | src/server/api/routers/equipamentos-detalhar.test.ts:162, :168; src/components/catalogo/tela-detalhe.test.tsx:206 → src/server/services/equipamentos.ts:58-62, :154; src/server/api/routers/equipamentos.ts:57-62; src/components/catalogo/tela-detalhe.tsx:154-161 | ATENDIDO | `detalhar` responde `NOT_FOUND` para colaborador e detalha o item para Operações. Em `solicitar`, a mesma regra é provada em emprestimos-solicitar.test.ts:297, que cita RN-SOLIC-07, não o CA. |
| CA-SOLIC-09 | src/server/api/routers/equipamentos-detalhar.test.ts:174, :183; src/server/api/routers/emprestimos.test.ts:76, :85; src/components/catalogo/tela-detalhe.test.tsx:79, :87 → src/server/services/equipamentos.ts:157, :193-205; src/lib/esquemas/equipamentos.ts:71-86; src/components/catalogo/tela-detalhe.tsx:192, :199 | ATENDIDO | Na resposta real de `detalhar` para colaborador, as chaves `numeroSerie`, `observacoes` e `historico` não existem e os valores sensíveis não aparecem no JSON. Operações recebe os três. |
| CA-SOLIC-10 | src/server/api/routers/equipamentos-detalhar.test.ts:249; src/server/api/routers/emprestimos-solicitar.test.ts:184; src/lib/prazos.test.ts:20, :30; src/components/catalogo/tela-detalhe.test.tsx:98; e2e/detalhe.spec.ts:53 → src/server/services/equipamentos.ts:190; src/server/services/emprestimos.ts:88, :143; src/lib/prazos.ts:28-30; src/components/catalogo/card-solicitacao.tsx:96, :165 | ATENDIDO | O prazo previsto e o gravado saem da mesma `calcularDevolverAte`, e o teste com datas fixas confirma o mesmo resultado. O teste de coincidência pelo procedimento (:184) usa o relógio real; a igualdade com datas fixas fica provada por :249 junto com o teste do CA-SOLIC-01 (:145). |
| CA-SOLIC-11 | src/test/emprestimos-estrutura.test.ts:111, :261, :267 + evidência da delegação (lint, typecheck, test, test:e2e, build e prisma:reset no commit) → prisma/migrations/20261111123316_criar_emprestimos/migration.sql | ATENDIDO | Todos os checks passaram no commit, com E2E de tRPC simulado, e o `prisma:reset` em Postgres local descartável aplicou as seis migrations do zero. Pela DF-14, a validação integrada real fica para antes da publicação em `main` e não é pré-condição de PRONTA. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run prisma:reset` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado (as regras de limite e de atraso, a devolução e o cadastro e a situação de equipamento presentes nos arquivos verificados, por exemplo src/server/services/emprestimos.ts:99-102 e src/server/services/equipamentos.ts:208-313, implementam as Specs 006, 007 e 008, aprovadas pelo responsável)
Veredito: PRONTA — os CA-SOLIC-01 a CA-SOLIC-11 estão ATENDIDOS, todos os checks aplicáveis passaram no commit 9a421a24af0ec9d250ef70136febecf04808a268 e não há comportamento sem spec aprovada.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
