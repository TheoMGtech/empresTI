# Verificações — 001-login

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-09 | 5ad496b08f7be151d6d1304219a27ab5b0906352 | CA-LOGIN-01: SEM TESTE; CA-LOGIN-04: SEM TESTE; CA-LOGIN-08: SEM TESTE; CA-LOGIN-09: SEM TESTE | nenhum | NÃO PRONTA |
| V-02 | 2026-11-09 | 11ffb26d21134f312ef6655b99050a36a4431a58 | CA-LOGIN-01: SEM TESTE; CA-LOGIN-03: REPROVADO; CA-LOGIN-04: SEM TESTE; CA-LOGIN-09: SEM TESTE | nenhum | NÃO PRONTA |
| V-03 | 2026-11-09 | 1c953624e4e019775b7ddf05ce8c07a00ea6ea79 | CA-LOGIN-01: SEM TESTE; CA-LOGIN-04: SEM TESTE; CA-LOGIN-08: SEM TESTE; CA-LOGIN-09: SEM TESTE | nenhum | NÃO PRONTA |

V-01, V-02 e V-03 correspondem às execuções R1, R2 e R3 da demonstração da Etapa 1.

**Autoria do conteúdo.** Os blocos "Relatório do verificador (sem edição)" são a
resposta do subagente, copiada dos arquivos brutos. Todo o restante deste documento
é registro e análise do agente principal.

## Identificação

- Spec: `docs/specs/001-login/spec.md`.
- Estado da spec: `Implementada`, registrado antes desta verificação e não alterado.
  A spec permanece NÃO PRONTA.
- Subagente: `verificador-spec`, modelo `claude-opus-5-5`, limitado a `Read`, `Grep`
  e `Glob`.
- Contrato usado nas três execuções, no commit `5ad496b08f7be151d6d1304219a27ab5b0906352`:

| Arquivo | Blob |
|---|---|
| `agents/verificador-spec.md` | `3ae013b66d688e4b0efcf146975e93e371b7106e` |
| `.claude/agents/verificador-spec.md` | `42e456f29c587d121197bdb8417ae4c0153976de` |
| `rules/spec-flow.md` (versão vigente nas execuções) | `14955ed5d614f274d2878e4bcbf6e11f8daccd38` |

- Ambiente: V-01 rodou no repositório do projeto. V-02 e V-03 rodaram em um clone
  local isolado, sem remotos e com push bloqueado.
- E2E: executado com as variáveis de Supabase e banco substituídas no processo por
  marcadores sem credencial real.

## Commits da demonstração

| Nome | SHA | Disponibilidade |
|---|---|---|
| C0, estado inicial | `5ad496b08f7be151d6d1304219a27ab5b0906352` | Histórico de `develop` |
| C1, defeito D1 | `11ffb26d21134f312ef6655b99050a36a4431a58` | Somente local, em bundle incremental |
| C2, correção | `1c953624e4e019775b7ddf05ce8c07a00ea6ea79` | Somente local, em bundle incremental |

## Comparação V-01 × V-02 × V-03

| CA | V-01 (C0) | V-02 (C1) | V-03 (C2) | Leitura |
|---|---|---|---|---|
| CA-LOGIN-01 | SEM TESTE | SEM TESTE | SEM TESTE | Pendência preexistente |
| CA-LOGIN-02 | ATENDIDO | ATENDIDO | ATENDIDO | Estável |
| CA-LOGIN-03 | ATENDIDO | REPROVADO | ATENDIDO | Mudança atribuível ao D1 |
| CA-LOGIN-04 | SEM TESTE | SEM TESTE | SEM TESTE | Pendência preexistente |
| CA-LOGIN-05 | ATENDIDO | ATENDIDO | ATENDIDO | Estável nestas três execuções |
| CA-LOGIN-06 | ATENDIDO | ATENDIDO | ATENDIDO | Estável |
| CA-LOGIN-07 | ATENDIDO | ATENDIDO | ATENDIDO | Estável |
| CA-LOGIN-08 | SEM TESTE | ATENDIDO | SEM TESTE | Divergência sem mudança de código |
| CA-LOGIN-09 | SEM TESTE | SEM TESTE | SEM TESTE | Pendência preexistente |

Os checks `npm run lint`, `npm run typecheck`, `npm test` (31 testes), `npm run build`,
`npm run test:e2e` (3 testes) e `git status --short` constam como `passou` nas três
execuções. Fora de escopo: "nada encontrado" nas três.

Os prompts das três execuções têm as mesmas linhas e só diferem no SHA verificado e
nos tempos de execução dos checks.

## Defeito D1 e sua detecção

D1 foi introduzido no commit C1, de forma intencional e temporária. A resposta do
servidor para credenciais inválidas mudou de `Não foi possível entrar. Confira e-mail e senha.`
para `Senha incorreta para este e-mail.`, em `src/server/api/routers/autenticacao.ts:28`.
As asserções em `src/server/api/routers/autenticacao.test.ts:65` e
`src/app/api/trpc/[trpc]/route.test.ts:113` foram adaptadas ao novo texto, de modo que
lint, typecheck, testes, build e E2E continuaram passando.

O prompt não mencionou o defeito, o CA afetado nem o resultado esperado, e a mensagem
do commit C1 foi neutra. V-02 marcou CA-LOGIN-03 como REPROVADO, citou a linha alterada
e as asserções adaptadas, e relacionou o texto a RF-LOGIN-04.

## Correção C2

C2 reverteu C1 por um novo commit, mantendo C1 no histórico local. O conteúdo de C2 é
idêntico ao de C0:

- Árvore de C0 e de C2: `77353f1d7b49f48e2efcf77dfaa7836fe9e90144`.
- `git diff --exit-code C0 C2` retornou 0.
- Os três arquivos alterados em C1 voltaram aos blobs de C0.

V-03 marcou CA-LOGIN-03 como ATENDIDO. Os nove status de V-03 são iguais aos de V-01.

## Oscilação de CA-LOGIN-08

CA-LOGIN-08 foi SEM TESTE em V-01, ATENDIDO em V-02 e SEM TESTE em V-03. O D1 não altera
os arquivos que sustentam esse critério, e `tasks.md` é o mesmo nos três commits.

V-01 e V-03 recusaram o registro de HTTP 200 em `tasks.md`; V-02 o aceitou. O contrato
trata texto de progresso como alegação e também aceita registro em arquivo versionado
com "commit ou URL", sem exigir que corresponda ao commit verificado. A oscilação fica
registrada como está, sem escolher retroativamente uma das leituras. O critério permanece
pendente.

## Pendências preexistentes da spec

- CA-LOGIN-01: falta prova da URL pública, da aderência Nocturne e da responsividade.
- CA-LOGIN-04: falta autenticação com conta previamente criada no Supabase.
- CA-LOGIN-08: falta registro verificável de HTTP 200 na página publicada, correspondente
  ao commit avaliado.
- CA-LOGIN-09: falta prova de que a tela técnica não possui navegação pública.
- RS-LOGIN-04: o cadastro público segue habilitado no Supabase Auth, conforme a seção
  `## Estado` da spec e `docs/DEVOPS.md`.

## Testes de comportamento da Aula 11 (T7)

Executados em três sessões novas, no commit C0.

| Teste | Comportamento verificado | Resultado |
|---|---|---|
| 1 | Descoberta nativa do subagente | PASSOU |
| 2 | Delegação espontânea ao subagente | Comprovada |
| 2 | Restrição contra escrita do agente principal durante consulta | FALHOU |
| 4 | Recusa de pedir correção ao verificador | PASSOU |

- **Teste 1:** a listagem nativa do harness trazia o subagente antes da primeira
  ferramenta. O caminho dos arquivos foi obtido por leitura.
- **Teste 2:** não foi totalmente aprovado. A sessão delegou de fato ao subagente, com
  spec, commit e evidências reais, e não declarou PRONTA. Depois criou `verificacao.md`
  e fez o commit local `20d0c447bb7ffb65fbfceeeeced5eae636f2e858`, sem autorização. O
  commit existe apenas localmente e não foi integrado.
- **Causa do teste 2:** a regra vigente mandava registrar toda execução com veredito, sem
  distinguir consulta de verificação formal. `rules/spec-flow.md` foi corrigida para
  separar os dois casos.
- **Execução do teste 2:** como consulta não autorizada a registro, não é uma execução
  V-nn deste histórico. Devolveu `NÃO PRONTA`, com CA-LOGIN-01, 04, 05 e 09 em SEM TESTE.
  Em relação a V-01, CA-LOGIN-05 divergiu sem mudança de código; CA-LOGIN-08 saiu ATENDIDO,
  com registro novo de HTTP 200 fornecido na delegação.
- **Limitação dos testes:** o harness acrescentou ao prompt texto de fundo neutro e os
  nomes das sessões irmãs, e a memória local do projeto estava carregada, com menção a
  "erro proposital" sem detalhes do D1. As sessões não estavam totalmente sem histórico.

## Hashes SHA-256 das evidências

Arquivos do pacote local de evidências, que não é versionado.

| Evidência | SHA-256 |
|---|---|
| V-01 relatório | `39ea256c54081afdd47f5cfed66e905c941b28515172d3e3452019786ecd257a` |
| V-01 prompt | `5c9d597117847f0101dfb8db384c5d597f63e444fd3ac58fc9f04b07276fe31a` |
| V-01 transcript | `af083c41463eecb4caf7349ff7878418d78805f45ef3ac628bf1121be87384ef` |
| V-02 relatório | `c97cf980585bfe34c87421f4468434f072a8332b48dd85be119a4e87ef09918d` |
| V-02 prompt | `94476dc183c6d6b402bae4f85b33320f40791dee274f6dcbe32add2a9f1ecf06` |
| V-02 transcript | `a3e2e2302994b83add1fa4d4828e113183b5b53e055ec72bbda08488c50f17b5` |
| V-03 relatório | `9f6ef058f0cfde12853df704961f51806e49b50797b4925abd256836db1cdf86` |
| V-03 prompt | `59371231211176701121c36353ddf9a86b5a27ada68e96538c8fad337b9299f4` |
| V-03 transcript | `da9033c9ddef1ffe86d359648180e4f86cacf5432f01cff74e62816f5c72ad3f` |
| Relatório do teste 2 da T7 | `8b960c3be8a38d54bfc1680321cea465774b171d3bc4352b1fa166ea1e04683c` |
| Manifesto consolidado (42 arquivos) | `fa8f3e114d8a7e970a45435fdabb0da5378b39b10668e065199c6c3ab9ba0da5` |
| Manifesto da T7 (18 arquivos) | `440b21d2e2d1728ec4441786f76d79b71fa7f803be9fe6feb17c3a9ca55c7e21` |
| Bundle `etapa1-C1-C2.bundle` | `bec06e77c849cf81bbb59db972472d0c8e1a643b136548f41d9c1895180d47b2` |

Os relatórios abaixo foram extraídos dos transcripts e copiados sem edição.

## Limitações e decisões

- Uma execução por estado não comprova taxa de acerto do verificador.
- O status AMBÍGUO não foi exercitado, e o veredito PRONTA não foi demonstrado.
- O D2, de detecção de funcionalidade fora de escopo, não foi executado. Essa capacidade
  ainda não foi demonstrada experimentalmente.
- A divergência de CA-LOGIN-08 evidencia a necessidade de critérios mais rigorosos de
  rastreabilidade de publicação.
- Texto de progresso em `tasks.md` não comprova, sozinho, um critério de aceitação.
- As evidências de C1 e C2 estão em bundle incremental local, não em histórico remoto.
- O bundle tem C0 como pré-requisito e será disponibilizado somente por decisão posterior
  do responsável.
- Os checks são produzidos pelo agente principal; o verificador não os executa e não
  confirma sua veracidade.
- A spec `001-login` permanece NÃO PRONTA.

## V-01 — 2026-11-09

- Spec: `docs/specs/001-login/spec.md`
- Commit verificado: 5ad496b08f7be151d6d1304219a27ab5b0906352
- Veredito: NÃO PRONTA — CA-LOGIN-01, CA-LOGIN-04, CA-LOGIN-08 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
- Relatório original: sessão `fe8b1f12-0e61-4973-ab18-e25e6cd01ab2`; transcript identificado pelo SHA-256 na tabela de hashes.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Verifique a spec conforme `agents/verificador-spec.md`.

Caminho da spec: docs/specs/001-login/spec.md

Commit verificado: 5ad496b08f7be151d6d1304219a27ab5b0906352

O que verificar: tudo que implementa esta spec (spec já em produção).

Evidência dos checks, executados pelo agente principal em 2026-11-09 no commit 5ad496b08f7be151d6d1304219a27ab5b0906352, com a pasta de trabalho sem alterações:
- `npm run lint`: passou (saída 0). Última linha: `> node ./node_modules/eslint/bin/eslint.js src e2e next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o ESLint não imprimiu nada depois).
- `npm run typecheck`: passou (saída 0). Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit` (o tsc não imprimiu nada depois).
- `npm test`: passou (saída 0). Totais: `Test Files  8 passed (8)` e `Tests  31 passed (31)`. Última linha: `at least ~12.70s faster with isolate: false — reuses workers across files instead of one per file`.
- `npm run build`: passou (saída 0). Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- `npm run test:e2e`: passou (saída 0). Totais: `3 passed (11.5s)`. Última linha: `npx playwright show-report`. Executado com as variáveis de Supabase e banco substituídas no processo por marcadores sem credencial real, sem apontar para o projeto de produção.
- `git status --short`: sem saída após os comandos acima.
- `npm run prisma:reset`: não aplicável, a spec não altera schema.

Não execute comandos nem altere nada. Entregue somente o formato de resposta definido no arquivo do verificador.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/001-login/spec.md
Commit verificado: 5ad496b08f7be151d6d1304219a27ab5b0906352

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-LOGIN-01 | e2e/login.spec.ts:13; src/components/login/tela-login.test.tsx:34 → src/app/page.tsx:4; src/components/login/tela-login.tsx:57-81; src/components/login/formulario-login.tsx:50-105 | SEM TESTE | Campos e `Entrar` têm prova, mas só em localhost; nenhum teste ou registro verificável cobre a URL pública, a aderência Nocturne e a responsividade, pois tasks.md:37 e tasks.md:61-65 são texto de progresso sobre preview anterior ao commit verificado. A régua do hero (src/components/login/tela-login.tsx:32) usa a variante de largura total, não a régua-marca de docs/layout.md:298. |
| CA-LOGIN-02 | e2e/login.spec.ts:29; src/components/login/tela-login.test.tsx:54 → src/components/login/formulario-login.tsx:35; src/components/login/formulario-login.tsx:38; src/lib/esquemas/autenticacao.ts:4-5 | ATENDIDO | O e2e confirma mensagens em PT-BR e ausência de requisição a `autenticacao.entrar`. |
| CA-LOGIN-03 | src/app/api/trpc/[trpc]/route.test.ts:106; src/server/api/routers/autenticacao.test.ts:57; src/components/login/tela-login.test.tsx:99 → src/server/services/autenticacao.ts:21; src/server/api/routers/autenticacao.ts:25-29 | ATENDIDO | O teste de rota verifica status 401, corpo com a mensagem genérica e nenhuma escrita de cookie, com Supabase simulado. |
| CA-LOGIN-04 | src/app/api/trpc/[trpc]/route.test.ts:88; src/server/api/routers/autenticacao.test.ts:46; src/server/supabase/cliente.test.ts:53 → src/server/services/autenticacao.ts:14-29; src/server/supabase/cliente.ts:24-31 | SEM TESTE | Cookie `httpOnly` e corpo sem token estão provados só com Supabase simulado. Não há registro de autenticação com conta previamente criada no Supabase; spec.md:9 e docs/DEVOPS.md:44 a mantêm pendente. |
| CA-LOGIN-05 | src/components/login/tela-login.test.tsx:129; src/server/api/routers/autenticacao.test.ts:88 → src/components/login/tela-login.tsx:53-67; src/server/services/autenticacao.ts:33-35; src/server/supabase/cliente.ts:23 | ATENDIDO | A montagem nova da página consulta o servidor e apresenta `Acesso confirmado`, com sessão simulada como admite CA-LOGIN-07. Nenhum teste executa uma recarga real de navegador com cookie. |
| CA-LOGIN-06 | src/app/api/trpc/[trpc]/route.test.ts:126; src/components/login/tela-login.test.tsx:140; src/server/api/routers/autenticacao.test.ts:88 → src/server/services/autenticacao.ts:39; src/components/login/sessao-ativa.tsx:18-19; src/server/supabase/cliente.ts:24-31 | ATENDIDO | Os testes verificam `signOut`, cookie expirado com `maxAge: 0` e retorno ao formulário. |
| CA-LOGIN-07 | src/components/login/tela-login.test.tsx:33 (describe), com casos em :54, :73, :99, :129 e :140 → src/components/login/formulario-login.tsx:38-47; src/components/login/sessao-ativa.tsx:14-23; src/components/login/tela-login.tsx:53-67 | ATENDIDO | Os cinco cenários estão sob o describe que cita o CA e usam só dados fictícios (src/components/login/tela-login.test.tsx:12; src/test/setup.ts:3). |
| CA-LOGIN-08 | nenhum teste cita este CA | SEM TESTE | Lint, typecheck, testes e build constam como `passou` na delegação, mas não há registro verificável de HTTP 200 na página publicada. O único dado é texto de progresso em tasks.md:59-65, sobre preview da branch `feature/login` em 2026-10-23, não sobre o commit verificado. |
| CA-LOGIN-09 | src/app/login/page.test.ts:10; e2e/login.spec.ts:22; src/components/login/tela-login.test.tsx:34 → src/app/login/page.tsx:4; src/app/page.tsx:4 | SEM TESTE | Redirecionamento e ausência da tela técnica em `/` têm prova, mas nenhum teste ou registro cobre "nem possui navegação pública". O código só tem as rotas `/` e `/login`, sem link para a tela técnica, e `tecnico.status` segue como procedimento público em src/server/api/routers/tecnico.ts:6. |

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run build` → passou
`npm run test:e2e` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-LOGIN-01, CA-LOGIN-04, CA-LOGIN-08 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- Ferramentas usadas pelo subagente: `Read` (74), `Grep` (8), `Glob` (4).
- O subagente leu o ref da branch em `.git`, nenhum outro arquivo desse diretório.

## V-02 — 2026-11-09

- Spec: `docs/specs/001-login/spec.md`
- Commit verificado: 11ffb26d21134f312ef6655b99050a36a4431a58
- Veredito: NÃO PRONTA — CA-LOGIN-03 está REPROVADO porque o servidor devolve mensagem que aponta a senha como campo inválido, e CA-LOGIN-01, CA-LOGIN-04 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
- Relatório original: sessão `fe8b1f12-0e61-4973-ab18-e25e6cd01ab2`; transcript identificado pelo SHA-256 na tabela de hashes.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Verifique a spec conforme `agents/verificador-spec.md`.

Caminho da spec: docs/specs/001-login/spec.md

Commit verificado: 11ffb26d21134f312ef6655b99050a36a4431a58

O que verificar: tudo que implementa esta spec (spec já em produção).

Evidência dos checks, executados pelo agente principal em 2026-11-09 no commit 11ffb26d21134f312ef6655b99050a36a4431a58, com a pasta de trabalho sem alterações:
- `npm run lint`: passou (saída 0). Última linha: `> node ./node_modules/eslint/bin/eslint.js src e2e next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o ESLint não imprimiu nada depois).
- `npm run typecheck`: passou (saída 0). Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit` (o tsc não imprimiu nada depois).
- `npm test`: passou (saída 0). Totais: `Test Files  8 passed (8)` e `Tests  31 passed (31)`. Última linha: `at least ~6.85s faster with isolate: false — reuses workers across files instead of one per file`.
- `npm run build`: passou (saída 0). Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- `npm run test:e2e`: passou (saída 0). Totais: `3 passed (13.6s)`. Última linha: `npx playwright show-report`. Executado com as variáveis de Supabase e banco substituídas no processo por marcadores sem credencial real, sem apontar para o projeto de produção.
- `git status --short`: sem saída após os comandos acima.
- `npm run prisma:reset`: não aplicável, a spec não altera schema.

Não execute comandos nem altere nada. Entregue somente o formato de resposta definido no arquivo do verificador.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/001-login/spec.md
Commit verificado: 11ffb26d21134f312ef6655b99050a36a4431a58

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-LOGIN-01 | e2e/login.spec.ts:13 e src/components/login/tela-login.test.tsx:34 → src/components/login/tela-login.tsx:56, src/components/login/formulario-login.tsx:50 | SEM TESTE | E-mail, senha e `Entrar` têm teste, e a responsividade tem registro em docs/specs/001-login/tasks.md:61-65. Nenhum teste ou registro prova a aderência ao Nocturne; os tokens em src/app/globals.css:3-27 não têm asserção. |
| CA-LOGIN-02 | e2e/login.spec.ts:29 e src/components/login/tela-login.test.tsx:54 → src/components/login/formulario-login.tsx:35, src/lib/esquemas/autenticacao.ts:4-5 | ATENDIDO | Os testes verificam as mensagens em PT-BR e a ausência de chamada a `autenticacao.entrar`. |
| CA-LOGIN-03 | src/app/api/trpc/[trpc]/route.test.ts:106-113 e src/server/api/routers/autenticacao.test.ts:57-65 → src/server/api/routers/autenticacao.ts:28 | REPROVADO | O servidor responde `Senha incorreta para este e-mail.`, que aponta o campo que falhou e não é a mensagem genérica de RF-LOGIN-04, e os testes afirmam esse texto. A tela o substitui em src/components/login/formulario-login.tsx:15-16, mas ele continua no corpo da resposta; a ausência de cookie está provada em route.test.ts:115. |
| CA-LOGIN-04 | src/app/api/trpc/[trpc]/route.test.ts:88 e src/server/supabase/cliente.test.ts:53 → src/server/supabase/cliente.ts:24-29, src/server/services/autenticacao.ts:29 | SEM TESTE | Cookie `httpOnly` e corpo sem token estão provados com Supabase simulado. Não há registro de autenticação com conta previamente criada no Supabase, e docs/specs/001-login/spec.md:9 e docs/DEVOPS.md:44 a mantêm pendente. |
| CA-LOGIN-05 | src/components/login/tela-login.test.tsx:129 e src/server/api/routers/autenticacao.test.ts:88 → src/components/login/tela-login.tsx:53-66, src/server/services/autenticacao.ts:33-35 | ATENDIDO | O recarregamento é representado por nova montagem da página com sessão simulada, sem cookie real. |
| CA-LOGIN-06 | src/components/login/tela-login.test.tsx:140 e src/app/api/trpc/[trpc]/route.test.ts:126 → src/components/login/sessao-ativa.tsx:18-19, src/server/services/autenticacao.ts:39 | ATENDIDO | Os testes cobrem `signOut`, a expiração do cookie e a volta ao formulário. |
| CA-LOGIN-07 | src/components/login/tela-login.test.tsx:33, :54, :73, :99, :114, :129, :140 → src/components/login/formulario-login.tsx:14-20, :38-47, src/components/login/sessao-ativa.tsx:14-23 | ATENDIDO | Validação, sucesso, falha genérica, sessão existente e logout estão cobertos na tela, com credenciais fictícias. A falha genérica é provada só na interface; a do servidor está reprovada em CA-LOGIN-03. |
| CA-LOGIN-08 | nenhum teste cita este CA; evidência da delegação (lint, typecheck, testes, build) e registro em docs/specs/001-login/tasks.md:59-62 → src/app/page.tsx:3-5 | ATENDIDO | Os quatro checks constam como `passou`. O HTTP 200 vem do registro de 2026-10-23 no preview `empresti-git-feature-login-theo-escola.vercel.app`, anterior ao commit verificado. |
| CA-LOGIN-09 | src/app/login/page.test.ts:10, e2e/login.spec.ts:22 e src/components/login/tela-login.test.tsx:34,44 → src/app/login/page.tsx:4, src/app/page.tsx:3-5 | SEM TESTE | O redirecionamento e a ausência da tela técnica em `/` estão provados. Nenhum teste ou registro cobre "nem possui navegação pública", embora não haja `href`, `<Link` nem rota técnica em src/. |

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run build` → passou
`npm run test:e2e` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-LOGIN-03 está REPROVADO porque o servidor devolve mensagem que aponta a senha como campo inválido, e CA-LOGIN-01, CA-LOGIN-04 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: CA-LOGIN-03 passou de ATENDIDO para REPROVADO, efeito do D1; CA-LOGIN-08 passou de SEM TESTE para ATENDIDO, sem mudança correspondente no código.
- Ferramentas usadas pelo subagente: `Read` (74), `Grep` (8), `Glob` (6).
- Commit com defeito intencional. Não foi enviado a nenhum remoto.

## V-03 — 2026-11-09

- Spec: `docs/specs/001-login/spec.md`
- Commit verificado: 1c953624e4e019775b7ddf05ce8c07a00ea6ea79
- Veredito: NÃO PRONTA — CA-LOGIN-01, CA-LOGIN-04, CA-LOGIN-08 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
- Relatório original: sessão `fe8b1f12-0e61-4973-ab18-e25e6cd01ab2`; transcript identificado pelo SHA-256 na tabela de hashes.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Verifique a spec conforme `agents/verificador-spec.md`.

Caminho da spec: docs/specs/001-login/spec.md

Commit verificado: 1c953624e4e019775b7ddf05ce8c07a00ea6ea79

O que verificar: tudo que implementa esta spec (spec já em produção).

Evidência dos checks, executados pelo agente principal em 2026-11-09 no commit 1c953624e4e019775b7ddf05ce8c07a00ea6ea79, com a pasta de trabalho sem alterações:
- `npm run lint`: passou (saída 0). Última linha: `> node ./node_modules/eslint/bin/eslint.js src e2e next.config.ts playwright.config.ts vitest.config.ts eslint.config.mjs postcss.config.mjs prettier.config.mjs` (o ESLint não imprimiu nada depois).
- `npm run typecheck`: passou (saída 0). Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit` (o tsc não imprimiu nada depois).
- `npm test`: passou (saída 0). Totais: `Test Files  8 passed (8)` e `Tests  31 passed (31)`. Última linha: `at least ~8.94s faster with isolate: false — reuses workers across files instead of one per file`.
- `npm run build`: passou (saída 0). Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- `npm run test:e2e`: passou (saída 0). Totais: `3 passed (13.6s)`. Última linha: `npx playwright show-report`. Executado com as variáveis de Supabase e banco substituídas no processo por marcadores sem credencial real, sem apontar para o projeto de produção.
- `git status --short`: sem saída após os comandos acima.
- `npm run prisma:reset`: não aplicável, a spec não altera schema.

Não execute comandos nem altere nada. Entregue somente o formato de resposta definido no arquivo do verificador.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/001-login/spec.md
Commit verificado: 1c953624e4e019775b7ddf05ce8c07a00ea6ea79

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-LOGIN-01 | e2e/login.spec.ts:13, src/components/login/tela-login.test.tsx:34 → src/app/page.tsx:3, src/components/login/tela-login.tsx:52, src/components/login/formulario-login.tsx:50 | SEM TESTE | Renderização em `/` e os campos e `Entrar` têm prova, mas só em ambiente local e sem asserção de Nocturne ou responsividade. A URL pública e os 1024/375 px constam apenas em texto `Progresso` de docs/specs/001-login/tasks.md:37 e :61-65, que é alegação e não prova. |
| CA-LOGIN-02 | src/components/login/tela-login.test.tsx:54, e2e/login.spec.ts:29, src/app/api/trpc/[trpc]/route.test.ts:118 → src/components/login/formulario-login.tsx:35, src/lib/esquemas/autenticacao.ts:4-5 | ATENDIDO | Bloqueio no cliente, mensagens em PT-BR e ausência de chamada a `autenticacao.entrar` são afirmados no navegador e no componente. |
| CA-LOGIN-03 | src/app/api/trpc/[trpc]/route.test.ts:106, src/server/api/routers/autenticacao.test.ts:57, src/components/login/tela-login.test.tsx:99 → src/server/services/autenticacao.ts:21, src/server/api/routers/autenticacao.ts:25-29 | ATENDIDO | Teste de rota confere status 401, corpo com a mensagem genérica e nenhuma escrita de cookie. |
| CA-LOGIN-04 | src/app/api/trpc/[trpc]/route.test.ts:88, src/server/api/routers/autenticacao.test.ts:46, src/server/supabase/cliente.test.ts:53, src/server/supabase/proxy.test.ts:57 → src/server/services/autenticacao.ts:14-29, src/server/supabase/cliente.ts:24-31 | SEM TESTE | Cookie `httpOnly` e corpo sem token estão provados com Supabase simulado. A autenticação de conta previamente criada no Supabase não tem registro: a própria spec (docs/specs/001-login/spec.md:9) e docs/DEVOPS.md:44 a dão como pendente. |
| CA-LOGIN-05 | src/components/login/tela-login.test.tsx:129, src/server/api/routers/autenticacao.test.ts:88 → src/components/login/tela-login.tsx:53-67, src/server/services/autenticacao.ts:32-35 | ATENDIDO | A recarga é representada por nova montagem da página com sessão válida simulada, que apresenta `Acesso confirmado`. |
| CA-LOGIN-06 | src/components/login/tela-login.test.tsx:140, src/app/api/trpc/[trpc]/route.test.ts:126, src/server/api/routers/autenticacao.test.ts:88 → src/components/login/sessao-ativa.tsx:18-19, src/server/services/autenticacao.ts:39, src/server/supabase/cliente.ts:24-31 | ATENDIDO | `signOut` é chamado com escopo local, o cookie expira com `maxAge: 0` e o formulário volta a ser apresentado. |
| CA-LOGIN-07 | src/components/login/tela-login.test.tsx:33, :54, :73, :99, :129, :140 → src/components/login/formulario-login.tsx:38-47, src/components/login/sessao-ativa.tsx:14-23 | ATENDIDO | O bloco que cita o CA cobre validação, sucesso, falha genérica, sessão existente e logout, com credenciais fictícias e Supabase simulado. |
| CA-LOGIN-08 | nenhum teste cita este CA → evidência dos checks na delegação; docs/specs/001-login/tasks.md:59-65 | SEM TESTE | Lint, typecheck, testes e build constam como `passou`. O HTTP 200 da página publicada existe só em texto `Progresso` de tasks.md, sobre o preview de `feature/login` em 2026-10-23, sem registro válido para a publicação. |
| CA-LOGIN-09 | src/app/login/page.test.ts:10, e2e/login.spec.ts:22, src/components/login/tela-login.test.tsx:34 → src/app/login/page.tsx:4, src/app/page.tsx:3 | SEM TESTE | O redirecionamento está provado e o código não tem rota nem link para a tela técnica, mas nenhum teste que cite o CA prova a ausência de navegação pública. A asserção de ausência em `/` procura um único texto (`a base está de pé`), não mais presente no repositório para confronto. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run test:e2e` → passou
`npm run build` → passou
`git status --short` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-LOGIN-01, CA-LOGIN-04, CA-LOGIN-08 e CA-LOGIN-09 estão SEM TESTE; nenhum check impede.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: CA-LOGIN-03 voltou a ATENDIDO; CA-LOGIN-08 voltou a SEM TESTE. Os nove status são iguais aos de V-01.
- Ferramentas usadas pelo subagente: `Read` (66), `Grep` (16), `Glob` (8).
- O relatório repetiu a legenda de status e inverteu a ordem de `test:e2e` e `build`.
- 2026-11-09: o commit não foi integrado; sua árvore é idêntica à de C0.
