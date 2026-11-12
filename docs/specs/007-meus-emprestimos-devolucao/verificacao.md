# Verificações — 007-meus-emprestimos-devolucao

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | 9a421a24af0ec9d250ef70136febecf04808a268 | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/007-meus-emprestimos-devolucao/spec.md`
- Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268
- Veredito: PRONTA — CA-DEVOL-01 a CA-DEVOL-09 estão ATENDIDOS, todos os checks constam como `passou` no commit verificado e não há nada fora de escopo.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Raiz do repositório a verificar: C:\dev\empresti-backend (leia os arquivos a partir desta pasta).

Caminho da spec: docs/specs/007-meus-emprestimos-devolucao/spec.md

Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268 (estado presente na pasta de trabalho C:\dev\empresti-backend, sem alterações)

O que verificar:
- docs/specs/007-meus-emprestimos-devolucao/spec.md
- docs/specs/007-meus-emprestimos-devolucao/plan.md
- docs/specs/007-meus-emprestimos-devolucao/tasks.md
- docs/VALIDACAO-INTEGRADA.md
- package.json
- src/lib/esquemas/emprestimos.ts
- src/lib/prazos.ts
- src/lib/datas.ts
- src/server/api/routers/emprestimos.ts
- src/server/api/routers/emprestimos-devolucao-contrato.test.ts
- src/server/api/routers/emprestimos-devolver.test.ts
- src/server/api/routers/emprestimos-consultas.test.ts
- src/server/api/routers/operacoes-devolucao.test.ts
- src/server/services/emprestimos.ts
- src/server/services/encerramento-emprestimo.ts
- src/app/(autenticado)/meus-emprestimos/page.tsx
- src/components/emprestimos/tela-meus-emprestimos.tsx
- src/components/emprestimos/tela-meus-emprestimos.test.tsx
- src/components/emprestimos/devolucao.tsx
- src/components/emprestimos/barra-prazo.tsx
- e2e/meus-emprestimos.spec.ts
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
Spec: docs/specs/007-meus-emprestimos-devolucao/spec.md
Commit verificado: 9a421a24af0ec9d250ef70136febecf04808a268

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-DEVOL-01 | src/server/api/routers/emprestimos-consultas.test.ts:174; src/components/emprestimos/tela-meus-emprestimos.test.tsx:99, :222, :232; e2e/meus-emprestimos.spec.ts:59 → src/server/services/emprestimos.ts:200-204; src/server/api/routers/emprestimos.ts:64-72 | ATENDIDO | O teste de procedimento compara a lista exata (`[aberto2, aberto1]`) com Postgres real. Assim ficam de fora os encerrados da pessoa, o aberto de outra pessoa e o do tenant B. O filtro usa `tenantId`, `userId` e `devolvidoEm: null`. |
| CA-DEVOL-02 | src/server/api/routers/emprestimos-devolver.test.ts:142; src/server/api/routers/emprestimos-consultas.test.ts:291; src/components/emprestimos/tela-meus-emprestimos.test.tsx:158; e2e/meus-emprestimos.spec.ts:59 → src/server/services/encerramento-emprestimo.ts:60-63; src/server/api/routers/emprestimos.ts:85-99; src/components/emprestimos/devolucao.tsx:87-100 | ATENDIDO | O teste confere `devolvido_em`/`devolvido_por` no banco e `disponibilidade: { estado: "disponivel" }` em `equipamentos.listar`. Também confere que o empréstimo sai de `meus` e entra no histórico. |
| CA-DEVOL-03 | src/server/api/routers/emprestimos-devolver.test.ts:161 → src/server/services/encerramento-emprestimo.ts:58, :64; src/server/api/routers/emprestimos.ts:52-57 | ATENDIDO | A segunda chamada recebe `CONFLICT`, a mensagem e `cause.motivo = EMPRESTIMO_JA_ENCERRADO`, que o `errorFormatter` expõe em `data.motivo`. A linha fica inalterada e há uma única auditoria. |
| CA-DEVOL-04 | src/server/api/routers/emprestimos-devolver.test.ts:196 → src/server/services/encerramento-emprestimo.ts:47-57; src/server/api/routers/emprestimos.ts:92 | ATENDIDO | A tentativa de devolver o empréstimo de outra pessoa recebe `NOT_FOUND`, e a linha e a auditoria ficam intactas. |
| CA-DEVOL-05 | src/server/api/routers/emprestimos-consultas.test.ts:272; src/server/api/routers/emprestimos-devolver.test.ts:219, :230 → src/server/services/emprestimos.ts:201, :231-243; src/server/services/encerramento-emprestimo.ts:47-51 | ATENDIDO | Os três procedimentos (`meus`, `historico` com e sem cursor, `devolver`) foram testados com um usuário do tenant B contra dados do tenant A, com Postgres real. Como esse usuário também é outra pessoa, o filtro de tenant isolado só é provado no serviço (emprestimos-devolver.test.ts:337). |
| CA-DEVOL-06 | src/server/api/routers/emprestimos-consultas.test.ts:197, :212, :253; src/components/emprestimos/tela-meus-emprestimos.test.tsx:212 → src/server/services/emprestimos.ts:276, :213; src/components/emprestimos/tela-meus-emprestimos.tsx:142-150 | ATENDIDO | As datas são fixas e cobrem as bordas do dia em São Paulo: 23:59 de 15/09 conta como no prazo e 00:00 de 16/10 como atraso. A tela mostra "No prazo" ou "Com atraso". |
| CA-DEVOL-07 | src/server/api/routers/emprestimos-devolver.test.ts:274, :286 → src/server/services/encerramento-emprestimo.ts:46-73 | ATENDIDO | A auditoria é gravada com o UUID do ator, a ação e o recurso. Com falha forçada em `auditoria.create` dentro da transação real, a devolução é desfeita e nada fica auditado. |
| CA-DEVOL-08 | src/server/api/routers/emprestimos-devolver.test.ts:252 → src/server/services/encerramento-emprestimo.ts:60-63; src/server/services/emprestimos.ts:49-61, :101 | ATENDIDO | Antes da devolução, `solicitar` é recusado com `ITEM_EM_ATRASO`. Depois de devolver o item vencido, a solicitação é aceita e `meuResumo` mostra `emAtraso: 0`. |
| CA-DEVOL-09 | nenhum teste cita este CA; registro verificável na delegação: lint, typecheck, npm test, test:e2e e build no commit 9a421a24af0ec9d250ef70136febecf04808a268, em 2026-11-11, com código de saída 0 e última linha | ATENDIDO | O CA aceita E2E com tRPC simulado para PRONTA, e a validação integrada real (docs/VALIDACAO-INTEGRADA.md §5) fica para antes da entrega final, pela DF-14. O `## Estado` da spec ("Ainda não implementada") e T-DEVOL-04/05 sem `[x]` em tasks.md são alegações e não mudam a prova. |

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
Veredito: PRONTA — CA-DEVOL-01 a CA-DEVOL-09 estão ATENDIDOS, todos os checks constam como `passou` no commit verificado e não há nada fora de escopo.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- O relatório foi transcrito sem o recuo de dois espaços que o harness acrescenta às linhas da resposta do subagente; o conteúdo não foi alterado.
- O E2E rodou com a chave pública de teste `chave-publica-de-teste-sem-credencial-real` no `npm run dev`, porque a pasta `C:\dev\empresti-backend` não tem arquivo de ambiente local; os testes E2E simulam o tRPC.
- A validação integrada real (`docs/VALIDACAO-INTEGRADA.md`) não foi executada; pela DF-14 ela não é condição desta verificação, mas é obrigatória antes da publicação em `main` e na Vercel.
