# Verificações — 009-seguranca-http-rate-limit

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-13 | c7992a5607ea1f071fe3bab99c190ddc259f82e1 | CA-SEG-05: REPROVADO; CA-SEG-08: AMBÍGUO; CA-SEG-11: REPROVADO; CA-SEG-17: REPROVADO; CA-SEG-18: REPROVADO | `npm run test:e2e` | NÃO PRONTA |
| V-02 | 2026-11-13 | 05b549f277b6f5856851057848177248a536404c | nenhum | nenhum | PRONTA |

## V-01 — 2026-11-13

- Spec: `docs/specs/009-seguranca-http-rate-limit/spec.md`
- Commit verificado: c7992a5607ea1f071fe3bab99c190ddc259f82e1
- Veredito: NÃO PRONTA — `npm run test:e2e` falhou em 3 de 4 execuções no commit verificado, sem mudança entre elas, o que reprova CA-SEG-05, CA-SEG-11, CA-SEG-17 e CA-SEG-18; e CA-SEG-08 está AMBÍGUO na parte "variando espaços".
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md. Pasta de trabalho: C:\dev\empresti-backend (os caminhos abaixo são relativos a ela).

1. Caminho da spec: docs/specs/009-seguranca-http-rate-limit/spec.md

2. Commit verificado: c7992a5607ea1f071fe3bab99c190ddc259f82e1 (a pasta de trabalho está exatamente nesse commit, sem alterações).

3. O que verificar — arquivos tocados pelos commits da Spec 009 (PRs #91, #92, #94, #95, #96, #97, #99, #100, #104, #106, #107, #108, #110, #111):
.env.example
docs/DEVOPS.md
docs/VALIDACAO-INTEGRADA.md
docs/specs/001-login/spec.md
docs/specs/005-solicitacao-emprestimo/spec.md
docs/specs/007-meus-emprestimos-devolucao/spec.md
docs/specs/008-operacoes/spec.md
docs/specs/009-seguranca-http-rate-limit/plan.md
docs/specs/009-seguranca-http-rate-limit/spec.md
docs/specs/009-seguranca-http-rate-limit/tasks.md
e2e/apoio/teste.ts
e2e/apoio/trpc.ts
e2e/cadastro.spec.ts
e2e/catalogo.spec.ts
e2e/detalhe.spec.ts
e2e/login.spec.ts
e2e/meus-emprestimos.spec.ts
e2e/operacoes.spec.ts
e2e/producao/cabecalhos.spec.ts
e2e/producao/estilos-radix.spec.ts
e2e/sessao.spec.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
playwright.producao.config.ts
prisma/migrations/20261112174149_criar_limites_requisicao/migration.sql
prisma/schema.prisma
src/app/api/trpc/[trpc]/route.test.ts
src/app/api/trpc/[trpc]/route.ts
src/app/layout.tsx
src/components/catalogo/card-solicitacao.tsx
src/components/catalogo/tela-detalhe.test.tsx
src/components/emprestimos/barra-prazo.test.tsx
src/components/emprestimos/barra-prazo.tsx
src/components/emprestimos/devolucao.tsx
src/components/emprestimos/tela-meus-emprestimos.test.tsx
src/components/login/formulario-login.tsx
src/components/login/tela-login.test.tsx
src/components/operacoes/controle-situacao.tsx
src/components/operacoes/tela-cadastro.test.tsx
src/components/operacoes/tela-cadastro.tsx
src/components/operacoes/tela-emprestimos-abertos.test.tsx
src/components/seguranca/nonce-estilos.test.tsx
src/components/seguranca/nonce-estilos.tsx
src/env.test.ts
src/env.ts
src/lib/esquemas/autenticacao.ts
src/lib/esquemas/emprestimos.ts
src/lib/esquemas/equipamentos.ts
src/lib/esquemas/operacoes.ts
src/lib/esquemas/sessao.ts
src/lib/mensagens-limite.test.ts
src/lib/mensagens-limite.ts
src/lib/zod.test.ts
src/lib/zod.ts
src/proxy.test.ts
src/proxy.ts
src/server/api/routers/autenticacao-limite.test.ts
src/server/api/routers/autenticacao.test.ts
src/server/api/routers/autenticacao.ts
src/server/api/routers/emprestimos.ts
src/server/api/routers/equipamentos.ts
src/server/api/routers/mutacoes-limite-roteador.test.ts
src/server/api/routers/mutacoes-limite.test.ts
src/server/api/routers/operacoes.ts
src/server/api/trpc-limite.test.ts
src/server/api/trpc.ts
src/server/seguranca/cabecalhos.test.ts
src/server/seguranca/cabecalhos.ts
src/server/seguranca/csp.test.ts
src/server/seguranca/csp.ts
src/server/services/erros-limite.ts
src/server/services/identificadores-limite.test.ts
src/server/services/identificadores-limite.ts
src/server/services/ip-confiavel.test.ts
src/server/services/ip-confiavel.ts
src/server/services/limites.test.ts
src/server/services/limites.ts
src/server/supabase/proxy.test.ts
src/server/supabase/proxy.ts
src/test/limitador.ts
src/test/limites-requisicao-estrutura.test.ts
src/test/setup.ts
src/test/trpc.tsx

4. Evidência dos checks (todos no commit c7992a5607ea1f071fe3bab99c190ddc259f82e1, executados pelo agente principal em C:\dev\empresti-backend em 2026-11-13, exceto o prisma:reset, executado pelo responsável):

- npm run lint — passou (exit 0). A saída não tem linha de resumo; última linha: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts playwright.producao.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs`
- npm run typecheck — passou (exit 0). Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit`
- npm test — passou (exit 0). Últimas linhas: `Test Files  72 passed (72)` / `Tests  1579 passed | 1 skipped (1580)`
- npm run build — passou (exit 0). Última linha relevante: `✓ Compiled successfully in 3.9s`. `next-env.d.ts` restaurado depois.
- npm run test:e2e:producao — passou (exit 0). Última linha: `39 passed (2.9m)`
- npm run test:e2e (servidor de desenvolvimento, 24 testes, 6 workers, com NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY igual ao valor fictício de src/test/setup.ts só no processo) — quatro execuções no mesmo commit, sem nenhuma mudança de código ou configuração entre elas:
  - Execução 1 (manhã de 2026-11-13; máquina com 22 containers Docker de outros projetos ativos e cerca de 0,5–0,7 GB de RAM livre) — falhou (exit 1). Última linha: `18 passed (2.6m)`, com `6 failed`. Os 6 testes que falharam: e2e/catalogo.spec.ts:110 (CA-CATALOGO-07), e2e/catalogo.spec.ts:131 (CA-SESSAO-06), e2e/detalhe.spec.ts:53 (CA-SOLIC-10/RF-SOLIC-04), e2e/detalhe.spec.ts:74 (RF-SOLIC-06), e2e/detalhe.spec.ts:94 (CA-SESSAO-13), e2e/detalhe.spec.ts:104 (CA-REGRAS-07). Erros: `page.goto: Test timeout of 30000ms exceeded` (navegando para /catalogo/TI-0001), `expect(locator).toBeVisible() failed ... element(s) not found` (título "Notebook 14 polegadas", 5000ms), `locator.click: Test timeout of 30000ms exceeded` (chip "Notebooks").
  - Execução 2 (mesmas condições da 1) — falhou (exit 1). Última linha: `23 passed (1.6m)`, com `1 failed`: e2e/sessao.spec.ts:5 (CA-LOGIN-05), erro `expect(page).toHaveURL(expected) failed — Expected pattern: /\/catalogo$/ — Received string: "http://localhost:3000/" — Timeout: 5000ms`.
  - Execução 3 (2026-11-13T14:02:12Z; mesmas condições, porta 3000 conferida livre antes) — falhou (exit 1). Última linha: `18 passed (2.6m)`, com `6 failed`: e2e/login.spec.ts:23 (CA-LOGIN-09), e2e/login.spec.ts:30 (CA-LOGIN-02), e2e/login.spec.ts:53 (CA-SEG-17), e2e/meus-emprestimos.spec.ts:59 (CA-DEVOL-01/02), e2e/meus-emprestimos.spec.ts:78 (CA-SESSAO-13), e2e/operacoes.spec.ts:59 (CA-OPER-01/03). Erros: `page.goto: Test timeout of 30000ms exceeded` (/login e /meus-emprestimos), `locator.click: Test timeout of 30000ms exceeded` (botão Entrar), `page.waitForResponse: Test timeout of 30000ms exceeded`.
  - Diagnóstico entre a 3 e a 4 (sem E2E): `next dev` sozinho, uma requisição por vez — primeira requisição de cada rota entre 0,47 s e 7,5 s (máximo em /catalogo/TI-0001), segunda entre 0,25 s e 0,77 s.
  - Execução 4 (2026-11-13T16:14:16Z a 16:14:43Z; containers Docker e Docker Desktop encerrados pelo responsável; porta 3000 livre; memória disponível amostrada a cada 5 s durante a execução entre 1617 e 2777 MB, CPU entre 25% e 79%) — passou (exit 0). Última linha: `24 passed (23.8s)`. É a execução mais recente.
- npm run prisma:reset — executado pelo responsável em C:\dev\empresti-backend, com `git rev-parse HEAD` = c7992a5607ea1f071fe3bab99c190ddc259f82e1, contra PostgreSQL 17.6 descartável em container local (`localhost:55432`; `select version()` = `PostgreSQL 17.6 on x86_64-pc-linux-musl`), com DATABASE_URL e DIRECT_URL apontando para ele. Saída do Prisma: `Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:55432"`, 7 migrations aplicadas, última linha `Database reset successful`. Conferência depois: `_prisma_migrations` com 7 linhas, a última `20261112174149_criar_limites_requisicao`; `select relrowsecurity from pg_class where relname = 'limites_requisicao'` = `t`. Container parado em seguida. (Uma execução anterior do responsável rodou por engano no checkout principal, em outro commit, com 4 migrations; não vale para este commit.)
- git status --short — vazio antes e depois de cada check (`next-env.d.ts` restaurado após o build).
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/009-seguranca-http-rate-limit/spec.md
Commit verificado: c7992a5607ea1f071fe3bab99c190ddc259f82e1

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-SEG-01 | e2e/producao/cabecalhos.spec.ts:45; src/server/seguranca/csp.test.ts:19, :36; src/proxy.test.ts:32 → src/server/seguranca/csp.ts:24; src/proxy.ts:7; src/server/supabase/proxy.ts:62 | ATENDIDO | O E2E de produção compara as diretivas exatas de RF-SEG-02 nas seis telas, exige ausência de `unsafe-inline`/`unsafe-eval` e de `Report-Only`. `test:e2e:producao` passou. |
| CA-SEG-02 | e2e/producao/cabecalhos.spec.ts:73, :83; src/proxy.test.ts:45, :56; src/server/seguranca/csp.test.ts:64 → src/server/seguranca/csp.ts:11; src/proxy.ts:9; src/server/supabase/proxy.ts:24 | ATENDIDO | Nonces de duas respostas diferem, e todo `<script>` do HTML tem o nonce da CSP da própria resposta. O nonce tem 16 bytes de `crypto.getRandomValues`. |
| CA-SEG-03 | e2e/producao/estilos-radix.spec.ts:21; fixture automática e2e/apoio/teste.ts:13 (cita CA-SEG-03 em :3) aplicada aos 24 testes de e2e/*.spec.ts; src/components/seguranca/nonce-estilos.test.tsx:25-63; src/lib/zod.test.ts:21, :43, :49 → src/components/seguranca/nonce-estilos.tsx:16; src/app/layout.tsx:27-34; src/lib/zod.ts | ATENDIDO | As seis telas são exercidas no build de produção pelos fluxos existentes, com a fixture que falha diante de qualquer `securitypolicyviolation` (39 passed). Só o teste do Radix cita o CA no nome; nas demais telas, a citação está na fixture. |
| CA-SEG-04 | src/server/seguranca/cabecalhos.test.ts:22, :28, :36, :49, :61; e2e/producao/cabecalhos.spec.ts:45 → src/server/seguranca/cabecalhos.ts:25; next.config.ts:9 | ATENDIDO | `source: "/:path*"` com os quatro cabeçalhos; o HSTS `max-age=31536000` aparece só com `VERCEL_ENV=production`, sem `preload` nem `includeSubDomains`. |
| CA-SEG-05 | src/server/supabase/proxy.test.ts:99, :109 → src/server/supabase/proxy.ts:24-62 | REPROVADO | Os testes unitários provam que o cookie renovado e a CSP seguem juntos na resposta e para o Next. A parte "os testes da Spec 003 continuam passando" cai porque CA-SESSAO-06 (e2e/catalogo.spec.ts:131) e CA-SESSAO-13 (e2e/detalhe.spec.ts:94, e2e/meus-emprestimos.spec.ts:78) falharam em execuções de `npm run test:e2e` neste commit. |
| CA-SEG-06 | src/components/emprestimos/barra-prazo.test.tsx:23, :45, :60; e2e/producao/cabecalhos.spec.ts:95 → src/components/emprestimos/barra-prazo.tsx:47-56 | ATENDIDO | O HTML do servidor não tem `style`; a largura vai em atributo SVG, com as proporções 0/50/100% para datas fixas. |
| CA-SEG-07 | src/server/api/routers/autenticacao-limite.test.ts:144, :164 → src/server/api/routers/autenticacao.ts:28-32; src/server/services/limites.ts:100-113; src/server/api/trpc.ts:76; src/app/api/trpc/[trpc]/route.ts:16 | ATENDIDO | Banco real: a 101ª tentativa responde 429 com a mensagem, o Supabase é chamado 100 vezes, e pela rota sai HTTP 429 com `Retry-After: 450`. |
| CA-SEG-08 | src/server/api/routers/autenticacao-limite.test.ts:205, :225, :248, :260 → src/server/api/routers/autenticacao.ts:35-49; src/server/services/identificadores-limite.ts:16 | AMBÍGUO | O teste do CA varia só maiúsculas. `z.email()` (src/lib/esquemas/autenticacao.ts:4) rejeita e-mail com espaços antes do limite, então uma "falha de credencial variando espaços" não acontece no procedimento, e o trim só é provado no limitador (src/server/services/identificadores-limite.test.ts:103, src/server/api/trpc-limite.test.ts:159): falta decidir se isso basta para a parte "espaços". |
| CA-SEG-09 | src/server/api/routers/autenticacao-limite.test.ts:276, :292; src/server/services/limites.test.ts:205, :324 → src/server/services/limites.ts:55-76, :100-108 | ATENDIDO | Com 12 tentativas simultâneas em banco real, exatamente 5 chegam ao Supabase por e-mail e o IP para em 100. |
| CA-SEG-10 | src/server/api/routers/mutacoes-limite.test.ts:158, :186, :220, :253 → src/server/api/trpc.ts:201-213; src/server/api/routers/emprestimos.ts:92, :122; src/server/api/routers/equipamentos.ts:77, :100; src/server/api/routers/operacoes.ts:44 | ATENDIDO | 31ª somando as cinco mutações para `operacoes` e `colaborador`, 121ª do IP entre usuários diferentes, recusa sem consumo e concorrência sem ultrapassar o limite, tudo em banco real. |
| CA-SEG-11 | src/server/api/routers/mutacoes-limite-roteador.test.ts:41, :50; src/server/api/routers/mutacoes-limite.test.ts:293, :321 → src/server/api/trpc.ts:201; src/server/api/routers/autenticacao.ts:57 | REPROVADO | Pelo AppRouter, consultas e `sair` não usam o limite, e a recusa por autorização continua `FORBIDDEN` sem consumir. A parte "os testes das Specs 001 e 003 a 008 continuam passando" cai porque os E2E dessas specs (CA-LOGIN-02/05/09, CA-CATALOGO-07, CA-SOLIC-10, CA-REGRAS-07, CA-DEVOL-01/02, CA-OPER-01/03, CA-SESSAO-06/13) falharam em execuções de `npm run test:e2e` neste commit. |
| CA-SEG-12 | src/server/api/routers/autenticacao-limite.test.ts:340, :353; src/server/api/routers/mutacoes-limite.test.ts:336, :354; src/server/api/trpc-limite.test.ts:296, :309; src/server/services/limites.test.ts:400, :417 → src/server/services/limites.ts:130-137, :190-197; src/env.ts:47-51; src/server/api/trpc.ts:54-69 | ATENDIDO | Sem tabela ou sem chave, login e mutações respondem `SERVICE_UNAVAILABLE` com a mensagem de RN-SEG-12, sem chamar o Supabase, sem gravar (equipamentos, auditoria e contador vazios) e sem pilha. As consultas continuam respondendo. |
| CA-SEG-13 | src/server/services/identificadores-limite.test.ts:37, :46; src/server/api/routers/autenticacao-limite.test.ts:388; src/server/services/limites.test.ts:446 → src/server/services/identificadores-limite.ts:20-26 | ATENDIDO | Hex de 64 caracteres igual ao HMAC com a chave e diferente do SHA-256 sem chave; no banco real só há hex, e os espiões de `console` não são chamados no fluxo de login nem no contador. |
| CA-SEG-14 | src/test/limites-requisicao-estrutura.test.ts:169, :194, :209, :238 → prisma/migrations/20261112174149_criar_limites_requisicao/migration.sql:28-37 | ATENDIDO | Em Postgres real com `SET ROLE anon/authenticated`, SELECT/INSERT/UPDATE/DELETE são recusados e `relrowsecurity` é verdadeiro. O `prisma:reset` do responsável confirmou `relrowsecurity = t` no mesmo commit. |
| CA-SEG-15 | src/server/services/limites.test.ts:218, :234, :251, :269 → src/server/services/limites.ts:38-42, :120-128 | ATENDIDO | Uma linha cheia e expirada não bloqueia a janela nova, e cada escrita remove no máximo 200 expiradas, preservando as atuais. |
| CA-SEG-16 | src/server/services/ip-confiavel.test.ts:18, :24, :55, :64; src/server/api/trpc-limite.test.ts:83, :89, :101; src/server/api/routers/autenticacao-limite.test.ts:370; src/server/api/routers/mutacoes-limite.test.ts:235 → src/server/services/ip-confiavel.ts:12-22; src/server/services/identificadores-limite.ts:32, :49; src/server/api/trpc.ts:39 | ATENDIDO | Só `x-forwarded-for` válido com `VERCEL=1`; os cabeçalhos forjados são ignorados, e o bloqueio coletivo de `ip-indisponivel` é provado em banco real no login e nas mutações. |
| CA-SEG-17 | src/components/login/tela-login.test.tsx:138; src/components/catalogo/tela-detalhe.test.tsx:188; src/components/emprestimos/tela-meus-emprestimos.test.tsx:202; src/components/operacoes/tela-emprestimos-abertos.test.tsx:168; src/components/operacoes/tela-cadastro.test.tsx:132, :235; src/lib/mensagens-limite.test.ts:8; e2e/login.spec.ts:53 → src/lib/mensagens-limite.ts:15-23; src/components/login/formulario-login.tsx:17; src/components/catalogo/card-solicitacao.tsx:42; src/components/emprestimos/devolucao.tsx:28; src/components/operacoes/controle-situacao.tsx:42; src/components/operacoes/tela-cadastro.tsx:150 | REPROVADO | Os testes de componente provam as duas mensagens exatas nas telas das cinco mutações e no login. O E2E que cita o CA (e2e/login.spec.ts:53) falhou na execução 3 de `npm run test:e2e` neste commit (timeout) e passou na 4. |
| CA-SEG-18 | nenhum teste cita este CA; registro na delegação → checks abaixo | REPROVADO | Lint, typecheck, testes, E2E de produção, build e `prisma:reset` passaram, mas `npm run test:e2e` falhou em 3 de 4 execuções no mesmo commit, sem mudança entre elas. A única execução verde veio depois do diagnóstico que já tinha aquecido as rotas no `next dev` (23,8 s contra 1,6 a 2,6 min), e isso não mostra que o resultado se reproduz. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → falhou
`npm run test:e2e:producao` → passou
`npm run prisma:reset` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — `npm run test:e2e` falhou em 3 de 4 execuções no commit verificado, sem mudança entre elas, o que reprova CA-SEG-05, CA-SEG-11, CA-SEG-17 e CA-SEG-18; e CA-SEG-08 está AMBÍGUO na parte "variando espaços".
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- As quatro execuções de `npm run test:e2e` foram registradas integralmente na delegação, inclusive as três falhas; nenhuma configuração de timeout, retry ou paralelismo foi alterada entre elas, por decisão do responsável.
- Sobre a observação do verificador em CA-SEG-18 (rotas aquecidas pelo diagnóstico): as execuções 2 e 3 também vieram depois de execuções que compilaram as mesmas rotas no mesmo checkout, e falharam. O que mudou na execução 4 foi a carga da máquina (Docker Desktop e 21 containers encerrados). Isso é uma hipótese apoiada pelas medições, não uma prova de reprodutibilidade; o próprio verificador apontou essa lacuna.
- CA-SEG-08 (AMBÍGUO): o esquema de entrada do login recusa e-mail com espaços nas pontas antes do limite, então a parte "variando espaços" só é exercida no limitador. A decisão sobre o que essa parte do CA exige é do responsável (spec), não do agente.
- O `prisma:reset` foi executado pelo responsável; a primeira tentativa rodou por engano no checkout principal (outro commit, 4 migrations) e foi descartada; a segunda, no commit verificado, está na delegação.

## V-02 — 2026-11-13

- Spec: `docs/specs/009-seguranca-http-rate-limit/spec.md`
- Commit verificado: 05b549f277b6f5856851057848177248a536404c
- Veredito: PRONTA — todos os CAs de CA-SEG-01 a CA-SEG-18 estão ATENDIDOS, todos os checks constam como `passou` no commit verificado, e nada foi encontrado fora de escopo.
- Relatório original: sessão f76e9577-2c12-4da6-8ba8-5fbf41ceef5c, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md. Pasta de trabalho: C:\dev\empresti-backend (os caminhos abaixo são relativos a ela).

1. Caminho da spec: docs/specs/009-seguranca-http-rate-limit/spec.md

2. Commit verificado: 05b549f277b6f5856851057848177248a536404c (a pasta de trabalho está exatamente nesse commit, sem alterações).

3. O que verificar — arquivos tocados pelos commits da Spec 009 (PRs #91, #92, #94, #95, #96, #97, #99, #100, #104, #106, #107, #108, #110, #111, #112, #113, #114, #115):
.env.example
.github/workflows/architecture.yml
docs/DEVOPS.md
docs/VALIDACAO-INTEGRADA.md
docs/specs/001-login/spec.md
docs/specs/005-solicitacao-emprestimo/spec.md
docs/specs/007-meus-emprestimos-devolucao/spec.md
docs/specs/008-operacoes/spec.md
docs/specs/009-seguranca-http-rate-limit/plan.md
docs/specs/009-seguranca-http-rate-limit/spec.md
docs/specs/009-seguranca-http-rate-limit/tasks.md
docs/specs/009-seguranca-http-rate-limit/verificacao.md
e2e/apoio/teste.ts
e2e/apoio/trpc.ts
e2e/cadastro.spec.ts
e2e/catalogo.spec.ts
e2e/detalhe.spec.ts
e2e/login.spec.ts
e2e/meus-emprestimos.spec.ts
e2e/operacoes.spec.ts
e2e/producao/cabecalhos.spec.ts
e2e/producao/estilos-radix.spec.ts
e2e/sessao.spec.ts
next.config.ts
package-lock.json
package.json
playwright.config.ts
playwright.producao.config.ts
prisma/migrations/20261112174149_criar_limites_requisicao/migration.sql
prisma/schema.prisma
src/app/api/trpc/[trpc]/route.test.ts
src/app/api/trpc/[trpc]/route.ts
src/app/layout.tsx
src/components/catalogo/card-solicitacao.tsx
src/components/catalogo/tela-detalhe.test.tsx
src/components/emprestimos/barra-prazo.test.tsx
src/components/emprestimos/barra-prazo.tsx
src/components/emprestimos/devolucao.tsx
src/components/emprestimos/tela-meus-emprestimos.test.tsx
src/components/login/formulario-login.tsx
src/components/login/tela-login.test.tsx
src/components/operacoes/controle-situacao.tsx
src/components/operacoes/tela-cadastro.test.tsx
src/components/operacoes/tela-cadastro.tsx
src/components/operacoes/tela-emprestimos-abertos.test.tsx
src/components/seguranca/nonce-estilos.test.tsx
src/components/seguranca/nonce-estilos.tsx
src/env.test.ts
src/env.ts
src/lib/esquemas/autenticacao.ts
src/lib/esquemas/emprestimos.ts
src/lib/esquemas/equipamentos.ts
src/lib/esquemas/operacoes.ts
src/lib/esquemas/sessao.ts
src/lib/mensagens-limite.test.ts
src/lib/mensagens-limite.ts
src/lib/zod.test.ts
src/lib/zod.ts
src/proxy.test.ts
src/proxy.ts
src/server/api/routers/autenticacao-limite.test.ts
src/server/api/routers/autenticacao.test.ts
src/server/api/routers/autenticacao.ts
src/server/api/routers/emprestimos.ts
src/server/api/routers/equipamentos.ts
src/server/api/routers/mutacoes-limite-roteador.test.ts
src/server/api/routers/mutacoes-limite.test.ts
src/server/api/routers/operacoes.ts
src/server/api/trpc-limite.test.ts
src/server/api/trpc.ts
src/server/seguranca/cabecalhos.test.ts
src/server/seguranca/cabecalhos.ts
src/server/seguranca/csp.test.ts
src/server/seguranca/csp.ts
src/server/services/erros-limite.ts
src/server/services/identificadores-limite.test.ts
src/server/services/identificadores-limite.ts
src/server/services/ip-confiavel.test.ts
src/server/services/ip-confiavel.ts
src/server/services/limites.test.ts
src/server/services/limites.ts
src/server/supabase/proxy.test.ts
src/server/supabase/proxy.ts
src/test/limitador.ts
src/test/limites-requisicao-estrutura.test.ts
src/test/setup.ts
src/test/trpc.tsx

4. Evidência dos checks (todos no commit 05b549f277b6f5856851057848177248a536404c, em 2026-11-13):

Executados pelo agente principal em C:\dev\empresti-backend, em sequência, sem outros testes ou builds em paralelo:
- npm run lint — passou (exit 0). A saída não tem linha de resumo; última linha: `> node ./node_modules/eslint/bin/eslint.js src e2e skills prisma/rotinas prisma/seed.ts prisma/vincular-professor.ts next.config.ts playwright.config.ts playwright.producao.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs`
- npm run typecheck — passou (exit 0). Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit`
- npm test — passou (exit 0). Últimas linhas: `Test Files  72 passed (72)` / `Tests  1582 passed | 1 skipped (1583)`
- npm run build — passou (exit 0). Última linha relevante: `✓ Compiled successfully in 2.4s`. `next-env.d.ts` restaurado depois.
- npm run test:e2e (servidor de desenvolvimento; com NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY igual ao valor fictício de src/test/setup.ts só no processo; antes da execução: memória disponível 2731 MB, porta 3000 livre, 2026-11-13T18:49:47Z) — passou (exit 0). Saída: `Running 24 tests using 6 workers`; última linha: `24 passed (1.4m)`.
- npm run test:e2e:producao (antes: memória disponível 2923 MB, 2026-11-13T18:51:27Z) — passou (exit 0). Saída: `Running 39 tests using 6 workers`; última linha: `39 passed (1.4m)`.
- git status --short — vazio depois de todos os checks.

Executados no CI (GitHub Actions, workflow `Architecture checks`, run 43483449591, disparado pelo push em `develop` do commit 05b549f277b6f5856851057848177248a536404c), job `E2E (desenvolvimento)` (runner `ubuntu-24.04`, `npm ci`, `playwright install --with-deps chromium`, `npm run test:e2e -- --reporter=line --retries=0`), três execuções independentes, cada uma num runner novo:
- Tentativa 1 — job 132085602174, runner "GitHub Actions 1000000950", imagem `ubuntu-24.04`, 2026-11-13T18:31:29Z a 18:32:53Z — passou. Saída: `Running 24 tests using 2 workers`; última linha: `24 passed (19.1s)`.
- Tentativa 2 — job 132115147766, runner "GitHub Actions 1000000951", imagem `ubuntu-24.04`, 2026-11-13T19:24:51Z a 19:26:00Z — passou. Saída: `Running 24 tests using 2 workers`; última linha: `24 passed (17.4s)`.
- Tentativa 3 — job 132133762483, runner "GitHub Actions 1000000952", imagem `ubuntu-24.04`, 2026-11-13T19:59:30Z a 20:00:54Z — passou. Saída: `Running 24 tests using 2 workers`; última linha: `24 passed (22.7s)`.
Na tentativa 1 do mesmo run, os jobs `Application quality` (lint, typecheck, npm test, build) e `Documentation and secret guard` também passaram (conclusão `success`).

Executado pelo responsável:
- npm run prisma:reset — em C:\dev\empresti-backend, com `git rev-parse HEAD` = 05b549f277b6f5856851057848177248a536404c, contra PostgreSQL 17.6 descartável em container local (`localhost:55432`; `select version()` = `PostgreSQL 17.6 on x86_64-pc-linux-musl`), com DATABASE_URL e DIRECT_URL apontando para ele. Saída do Prisma: `Datasource "db": PostgreSQL database "postgres", schema "public" at "localhost:55432"`, 7 migrations aplicadas, última linha `Database reset successful`. Conferência depois: `_prisma_migrations` com 7 linhas, a última `20261112174149_criar_limites_requisicao`; `select relrowsecurity from pg_class where relname = 'limites_requisicao'` = `t`. Container parado em seguida.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/009-seguranca-http-rate-limit/spec.md
Commit verificado: 05b549f277b6f5856851057848177248a536404c

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-SEG-01 | e2e/producao/cabecalhos.spec.ts:45; src/server/seguranca/csp.test.ts:19, :36; src/proxy.test.ts:32 → src/server/seguranca/csp.ts:24-45; src/proxy.ts:7-16; src/server/supabase/proxy.ts:62 | ATENDIDO | O E2E de produção compara, nas seis telas, as diretivas exatas de RF-SEG-02. Também exige que não haja `unsafe-inline`, `unsafe-eval` nem `Report-Only`; `test:e2e:producao` passou. |
| CA-SEG-02 | e2e/producao/cabecalhos.spec.ts:73, :83; src/proxy.test.ts:45, :56; src/server/seguranca/csp.test.ts:64 → src/server/seguranca/csp.ts:11-14; src/server/supabase/proxy.ts:24-31; src/app/layout.tsx:27 | ATENDIDO | Duas respostas seguidas têm nonces diferentes, e todo `<script>` do HTML leva o nonce da CSP da própria resposta. O nonce tem 16 bytes de `crypto.getRandomValues`. |
| CA-SEG-03 | e2e/producao/estilos-radix.spec.ts:21; fixture automática e2e/apoio/teste.ts:13-41 (cita CA-SEG-03 em :3), aplicada aos 24 testes de e2e/*.spec.ts; src/components/seguranca/nonce-estilos.test.tsx:25-63; src/lib/zod.test.ts:21, :43, :49 → src/components/seguranca/nonce-estilos.tsx:16-25; src/app/layout.tsx:27-34; src/lib/zod.ts:10 | ATENDIDO | No build de produção, os fluxos existentes abrem as seis telas, e a fixture falha diante de qualquer `securitypolicyviolation` (39 passed). Só o teste do Radix cita o CA no nome; nas outras telas, a citação está na fixture que faz a asserção. |
| CA-SEG-04 | src/server/seguranca/cabecalhos.test.ts:21, :28, :35, :49, :61; e2e/producao/cabecalhos.spec.ts:45 → src/server/seguranca/cabecalhos.ts:7-27; next.config.ts:9-11 | ATENDIDO | `source: "/:path*"` com os quatro cabeçalhos. O HSTS `max-age=31536000` só aparece com `VERCEL_ENV=production`, sem `preload` nem `includeSubDomains`, e não aparece no build local. |
| CA-SEG-05 | src/server/supabase/proxy.test.ts:99, :109 → src/server/supabase/proxy.ts:24-62 | ATENDIDO | O cookie renovado e a CSP vão juntos na resposta e na requisição repassada ao Next. Os testes da Spec 003 passaram em `npm test`, em `npm run test:e2e` (local e três execuções no CI) e em `test:e2e:producao`. |
| CA-SEG-06 | src/components/emprestimos/barra-prazo.test.tsx:23, :45, :60; e2e/producao/cabecalhos.spec.ts:95 → src/components/emprestimos/barra-prazo.tsx:47-56 | ATENDIDO | O HTML do servidor não tem `style`; a largura vai em atributo SVG, com 0/50/100% para datas fixas. |
| CA-SEG-07 | src/server/api/routers/autenticacao-limite.test.ts:144, :164 → src/server/api/routers/autenticacao.ts:28-32; src/server/services/limites.ts:100-113; src/server/api/trpc.ts:54-64, :76-83; src/app/api/trpc/[trpc]/route.ts:16 | ATENDIDO | Em banco real, a 101ª tentativa responde `TOO_MANY_REQUESTS` com a mensagem, e o Supabase é chamado exatamente 100 vezes. Pela rota, a resposta é HTTP 429 com `Retry-After: 450`, sem chamar o Supabase. |
| CA-SEG-08 | src/server/api/routers/autenticacao-limite.test.ts:203, :222, :242, :265, :277; src/server/services/identificadores-limite.test.ts:97, :112; src/server/api/trpc-limite.test.ts:159 → src/server/api/routers/autenticacao.ts:28-54; src/server/services/identificadores-limite.ts:16-18, :29-35; src/lib/esquemas/autenticacao.ts:4 | ATENDIDO | Cobre cinco falhas variando maiúsculas e minúsculas, com a 6ª em 429 mesmo com a senha certa e o Supabase chamado 5 vezes; resposta igual para e-mail cadastrado ou não; sucesso e falha que não é de credencial sem consumo; e-mail com espaços recusado com `BAD_REQUEST` sem gravar linha. A normalização é provada no limitador, como pede a redação esclarecida (D-01). |
| CA-SEG-09 | src/server/api/routers/autenticacao-limite.test.ts:293, :309; src/server/services/limites.test.ts:205, :324 → src/server/services/limites.ts:55-76, :100-113 | ATENDIDO | Com 12 tentativas simultâneas em banco real, exatamente 5 chegam ao Supabase pelo mesmo e-mail. Com o IP em 95, só 5 passam e o contador para em 100. |
| CA-SEG-10 | src/server/api/routers/mutacoes-limite.test.ts:158, :186, :220, :253 → src/server/api/trpc.ts:201-213; src/server/api/routers/emprestimos.ts:92, :122; src/server/api/routers/equipamentos.ts:77, :100; src/server/api/routers/operacoes.ts:44; src/server/services/limites.ts:174-185 | ATENDIDO | Em banco real: a 31ª, somando as cinco mutações, recusa para `operacoes` e `colaborador`; a 121ª do IP recusa entre usuários diferentes; a recusa não consome vaga; a concorrência não passa de 30. |
| CA-SEG-11 | src/server/api/routers/mutacoes-limite-roteador.test.ts:41, :50; src/server/api/routers/mutacoes-limite.test.ts:293, :321 → src/server/api/trpc.ts:201; src/server/api/routers/autenticacao.ts:19, :57 | ATENDIDO | Pelo AppRouter, nenhuma consulta nem `sair` usa o limite; com os limites cheios, elas continuam respondendo, e a recusa por autorização continua `FORBIDDEN` sem consumir. As suítes das Specs 001 e 003 a 008 passaram em `npm test`, `test:e2e` e `test:e2e:producao`. |
| CA-SEG-12 | src/server/api/routers/autenticacao-limite.test.ts:357, :370; src/server/api/routers/mutacoes-limite.test.ts:336, :354; src/server/api/trpc-limite.test.ts:186, :198, :296, :309; src/server/services/limites.test.ts:400, :417, :432; src/env.test.ts:66 → src/server/services/limites.ts:130-137, :190-197; src/env.ts:47-51; src/server/api/trpc.ts:54-70 | ATENDIDO | Sem a tabela ou sem a chave, login e mutações respondem `SERVICE_UNAVAILABLE` (503) com a mensagem de RN-SEG-12, sem chamar o Supabase, sem pilha e sem gravar (equipamentos, auditoria e contador vazios). `equipamentos.listar` continua respondendo. |
| CA-SEG-13 | src/server/services/identificadores-limite.test.ts:37, :46; src/server/api/routers/autenticacao-limite.test.ts:405; src/server/services/limites.test.ts:158, :446 → src/server/services/identificadores-limite.ts:20-26 | ATENDIDO | O identificador é hex de 64 caracteres, igual ao HMAC com a chave e diferente do SHA-256 sem chave, e o banco real só tem hex. Os espiões de `console` não são chamados no fluxo de login nem no contador, e `src/server` não tem `console.`. |
| CA-SEG-14 | src/test/limites-requisicao-estrutura.test.ts:169, :194, :208, :237 → prisma/migrations/20261112174149_criar_limites_requisicao/migration.sql:28-37 | ATENDIDO | Em Postgres real com `SET ROLE anon/authenticated`, SELECT, INSERT, UPDATE e DELETE são recusados, mesmo com GRANT temporário, e `relrowsecurity` é verdadeiro. O `prisma:reset` do responsável confirmou `relrowsecurity = t` neste commit. |
| CA-SEG-15 | src/server/services/limites.test.ts:218, :234, :251, :269 → src/server/services/limites.ts:38-42, :120-128 | ATENDIDO | Uma linha cheia e expirada não bloqueia nem soma à janela nova. Cada escrita remove no máximo 200 expiradas e preserva as atuais. |
| CA-SEG-16 | src/server/services/ip-confiavel.test.ts:17, :24, :47, :59; src/server/api/trpc-limite.test.ts:83, :89, :101; src/server/services/identificadores-limite.test.ts:121, :157; src/server/api/routers/autenticacao-limite.test.ts:387; src/server/api/routers/mutacoes-limite.test.ts:235 → src/server/services/ip-confiavel.ts:12-22; src/server/services/identificadores-limite.ts:13, :32, :49; src/server/api/trpc.ts:39 | ATENDIDO | O IP só vem de `x-forwarded-for` válido com `VERCEL=1`, e os cabeçalhos forjados são ignorados. O bloqueio coletivo de `ip-indisponivel` é provado em banco real no login e nas mutações. |
| CA-SEG-17 | src/components/login/tela-login.test.tsx:138; src/components/catalogo/tela-detalhe.test.tsx:188; src/components/emprestimos/tela-meus-emprestimos.test.tsx:202; src/components/operacoes/tela-emprestimos-abertos.test.tsx:168; src/components/operacoes/tela-cadastro.test.tsx:132, :235; src/lib/mensagens-limite.test.ts:8; e2e/login.spec.ts:53 → src/lib/mensagens-limite.ts:3-23; src/components/login/formulario-login.tsx:15-18; src/components/catalogo/card-solicitacao.tsx:40-43; src/components/emprestimos/devolucao.tsx:26-29; src/components/operacoes/controle-situacao.tsx:42-44; src/components/operacoes/tela-cadastro.tsx:150-153 | ATENDIDO | O login e as telas das cinco mutações mostram as duas mensagens exatas, ignorando a mensagem do servidor. O E2E do login com 429 passou nas execuções local e de CI deste commit. |
| CA-SEG-18 | nenhum teste cita este CA; registro na delegação → checks abaixo | ATENDIDO | Lint, typecheck, `npm test`, build, `test:e2e` (local e três runners novos no CI, sem retries), `test:e2e:producao` e `prisma:reset` em banco local descartável passaram, todos no commit verificado. A validação no preview e na URL de produção fica fora do critério de PRONTA, como diz o próprio CA. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run test:e2e:producao` → passou
`npm run prisma:reset` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: PRONTA — todos os CAs de CA-SEG-01 a CA-SEG-18 estão ATENDIDOS, todos os checks constam como `passou` no commit verificado, e nada foi encontrado fora de escopo.
```

### Observações do agente principal

- Diferenças em relação à execução anterior (V-01, commit c7992a5): CA-SEG-05, CA-SEG-11, CA-SEG-17 e CA-SEG-18 passaram de REPROVADO para ATENDIDO, e CA-SEG-08 de AMBÍGUO para ATENDIDO; o check `npm run test:e2e` passou de `falhou` para `passou`; o veredito passou de NÃO PRONTA para PRONTA.
- Entre a V-01 e a V-02 entraram em `develop`, por decisão do responsável de 2026-11-13: PR #113 (T-SEG-14, job `E2E (desenvolvimento)` no CI, fixado em `ubuntu-24.04` porque o Playwright 1.56.1 não instala o Chromium no Ubuntu 26.04 do `ubuntu-latest`), PR #114 (T-SEG-15, redação do CA-SEG-08 e decisões D-01 e D-02) e PR #115 (T-SEG-16, testes que citam o CA-SEG-08, sem código de produto). Nenhum timeout, retry ou paralelismo da configuração do Playwright foi alterado; no runner do CI, o Playwright usou 2 workers por padrão (metade dos núcleos), e localmente 6.
- As três execuções do CI são tentativas do mesmo run (`43483449591`), disparadas pelo responsável na interface do GitHub, porque o hook do projeto não libera `gh run rerun` ao agente.
- A spec fica `PRONTA` só depois da validação final do responsável (`rules/spec-flow.md`). A validação integrada no preview e a verificação na URL de produção (`docs/VALIDACAO-INTEGRADA.md`, seção 9) continuam obrigatórias antes da entrega final.
- 2026-11-13: registro da V-02 integrado em `develop` pelo PR #116 (squash `2862f3b83eeebc94809c59785cfc51a0b3f7f76d`). No mesmo dia, o responsável fez a validação final: a Spec 009 está PRONTA.
