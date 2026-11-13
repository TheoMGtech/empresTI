# Tarefas — segurança HTTP, CSP e limite de requisições

## Estado

**Status:** APROVADAS — pelo responsável em 2026-11-12, com `plan.md` (sobre o commit `3841cfc`) e o
DDL de `limites_requisicao`. Cada tarefa depende de autorização específica. Concluídas e integradas
em `develop`: T-SEG-01 a 11 (2026-11-12 e 2026-11-13). Em execução: T-SEG-12, autorizada em
2026-11-13. Falta: T-SEG-13.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; código e documentação
em commits separados; sem alteração no Supabase remoto, em variáveis reais, em deploy de produção
ou merge em `main`.

Ordem: o Bloco A (CSP) e a T-SEG-05 (migration) são independentes entre si. Os Blocos C e D
dependem da T-SEG-05. O Bloco E fecha.

## Bloco A — cabeçalhos e CSP

- [x] **T-SEG-01 (BE) — Cabeçalhos fixos e HSTS** — PR #91.
  - `cabecalhosFixos()` e `next.config.ts`.
  - Atende: CA-SEG-04. Depende de: nada.
  - Commit: `feat(seguranca): definir cabeçalhos HTTP fixos`.
- [x] **T-SEG-02 (BE) — CSP com nonce no proxy** — PR #92.
  - `montarCsp()`, nonce por requisição e `atualizarSessao` repassando CSP e `x-nonce` ao Next e à
    resposta. Conferir no build que toda rota é `ƒ`.
  - Atende: CA-SEG-01, 02, 05 (unitários). Depende de: nada.
  - Commit: `feat(seguranca): aplicar CSP com nonce por requisição`.
- [x] **T-SEG-03 (FE) — Barra de prazo sem estilo inline** — PR #94.
  - `rect` SVG com `width` em atributo, mesma aparência.
  - Atende: CA-SEG-06. Depende de: nada.
  - Commit: `fix(emprestimos): remover estilo inline da barra de prazo`.
- [x] **T-SEG-04a (FE/BE) — Compatibilidade de runtime com a CSP** — PR #96.
  - Acrescentada em 2026-11-12, aprovada pelo responsável, depois de a primeira execução da
    T-SEG-04 encontrar duas violações reais no build de produção.
  - Zod 4 com `jitless` (`src/lib/zod.ts`). Nonce do Radix Dialog por `get-nonce@1.0.1`,
    dependência direta aprovada, configurado no navegador por `NonceEstilos` a partir do `x-nonce`
    do layout. Nada muda na CSP nem no comportamento dos diálogos e das validações.
  - Atende: CA-SEG-03 (pré-condição). Depende de: T-SEG-02.
  - Commit: `fix(seguranca): compatibilizar Zod e Radix com a CSP`.
- [x] **T-SEG-04 (verificação) — E2E no build de produção** — PR #97.
  - `playwright.producao.config.ts`, script `test:e2e:producao`, fixture de violação de CSP em
    `e2e/apoio/teste.ts` aplicada às sete specs de telas e `e2e/producao/`: cabeçalhos, nonces,
    nonce nos estilos do Radix e nenhuma `securitypolicyviolation` nas seis telas.
  - Atende: CA-SEG-01, 02, 03, 04, 06 (no navegador). Depende de: T-SEG-01, 02, 03, 04a.
  - Commit: `test(seguranca): verificar CSP no build de produção`.

## Bloco B — migration

- [x] **T-SEG-05 (migration) — Tabela `limites_requisicao`** — PR #99.
  - DDL aprovado em 2026-11-12 (`plan.md`); nova aprovação só se ele mudar.
  - O responsável gera a migration (`--create-only`) e roda o `prisma:reset` no banco local
    descartável. O agente acrescenta CHECK, RLS, policies e `REVOKE`. Nenhuma migration remota.
  - Atende: CA-SEG-14. Depende de: autorização da tarefa.
  - Commit: `feat(banco): criar tabela de limites de requisição`.

## Bloco C — limite de requisições (BE)

- [x] **T-SEG-06 — Chave, IP confiável e identificadores** — PR #100.
  - `CHAVE_HMAC_LIMITES` em `src/env.ts`, `.env.example` (só o nome) e valor de teste em
    `src/test/setup.ts`; `lerIpConfiavel`; HMAC por escopo.
  - Atende: CA-SEG-13 (HMAC), 16 (unitário). Depende de: nada.
  - Commit: `feat(seguranca): derivar IP confiável e identificadores de limite`.
- [x] **T-SEG-07 — Contador atômico, expiração e limpeza** — PR #104.
  - `consumir`, `devolver`, `consumirJuntos` e a limpeza em lote; erros viram
    `ErroLimiteIndisponivel`.
  - Atende: CA-SEG-09 (serviço), 12 (serviço), 13, 15. Depende de: T-SEG-05, 06.
  - Registro: o teste de rajada de `consumirJuntos` usa 12 chamadas sobre os contadores do login,
    com o pool aberto antes; com 40 conexões novas, a máquina carregada estourava o `maxWait` do
    Prisma antes do contador. O código de produção não mudou.
  - Commit: `feat(seguranca): contar tentativas de forma atômica`.
- [x] **T-SEG-08 — Contexto, 429/503 e `Retry-After`** — PR #106.
  - Contexto com `ipConfiavel` e limitador; `mensagens-limite.ts`; `responseMeta`; limitador de
    teste explícito para os testes com Prisma simulado.
  - Registro: o limitador real (`criarLimitador`) ficou em `src/server/services/limites.ts`, para
    manter a camada Service; `trpc.ts` só o monta no contexto.
  - Atende: CA-SEG-12 (formato), 16 (contexto). Depende de: T-SEG-07.
  - Commit: `feat(seguranca): responder limite excedido e indisponível`.
- [x] **T-SEG-09 — Limite do login** — PR #107.
  - Reserva atômica de `login_ip` (100/15 min) e `login_email` (5/15 min) numa única transação:
    se um bloquear, nenhum é consumido. Depois, o IP fica consumido. A vaga do e-mail volta no
    sucesso e na falha que não é de credencial, e fica na falha de credencial.
  - Testes de concorrência, de rollback e de bloqueio do e-mail sem consumo do IP.
  - Atende: CA-SEG-07, 08, 09, 12, 16 (bloqueio coletivo). Depende de: T-SEG-08.
  - Commit: `feat(autenticacao): limitar tentativas de login`.
- [x] **T-SEG-10 — Limite das cinco mutações** — PR #108.
  - `limitarMutacao` depois do `.input()` em cada mutação; prova pelo AppRouter.
  - Atende: CA-SEG-10, 11, 12. Depende de: T-SEG-08.
  - Commit: `feat(seguranca): limitar mutações por usuário e por IP`.

## Bloco D — interface (FE)

- [x] **T-SEG-11 — Mensagens de limite e indisponibilidade** — PR #110.
  - `mensagemDeLimite` no login e nos componentes de solicitação, devolução, situação e cadastro.
  - Atende: CA-SEG-17. Depende de: T-SEG-08.
  - Commit: `feat(seguranca): mostrar limite excedido na interface`.

## Bloco E — fechamento

- [ ] **T-SEG-12 (docs) — Referências e roteiro de validação**
  - Linha em "Contrato afetado" das Specs 001, 005, 007 e 008 (P8). Seção da Spec 009 em
    `docs/VALIDACAO-INTEGRADA.md`, com os níveis 2 (preview, com as regras de isolamento do
    plano) e 3 (URL de produção). Em `docs/DEVOPS.md`: `CHAVE_HMAC_LIMITES`, branches `main` e
    `develop` no Environment `production` e as configurações do preview que dependem do
    responsável.
  - Atende: rastreabilidade de CA-SEG-18. Depende de: T-SEG-01 a 11.
  - Commit: `docs(seguranca): referenciar a spec 009 e o roteiro de validação`.
- [ ] **T-SEG-13 (verificação) — Provas finais e verificação formal**
  - Checks completos, incluindo `npm run test:e2e:producao`, `prisma:reset` pelo responsável e
    V-01 pelo `verificador-spec`, conforme `rules/spec-flow.md`.
  - Atende: CA-SEG-18. Depende de: T-SEG-12.
  - Commit: `test(seguranca): provar critérios finais da spec 009`.

## Rastreabilidade

| CA | Tarefas |
|---|---|
| CA-SEG-01, 02 | 02, 04 |
| CA-SEG-03 | 04a, 04 |
| CA-SEG-04 | 01, 04 |
| CA-SEG-05 | 02 |
| CA-SEG-06 | 03, 04 |
| CA-SEG-07, 08 | 09 |
| CA-SEG-09 | 07, 09 |
| CA-SEG-10, 11 | 10 |
| CA-SEG-12 | 07, 08, 09, 10 |
| CA-SEG-13 | 06, 07 |
| CA-SEG-14 | 05 |
| CA-SEG-15 | 07 |
| CA-SEG-16 | 06, 08, 09 |
| CA-SEG-17 | 11 |
| CA-SEG-18 | 12, 13 |
