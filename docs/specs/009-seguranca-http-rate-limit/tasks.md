# Tarefas — segurança HTTP, CSP e limite de requisições

## Estado

**Status:** EM APROVAÇÃO — aguarda o responsável, junto com `plan.md`. A T-SEG-05 depende ainda da
aprovação específica do DDL.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; código e documentação
em commits separados; sem alteração no Supabase remoto, em variáveis reais, em deploy de produção
ou merge em `main`.

Ordem: o Bloco A (CSP) e a T-SEG-05 (migration) são independentes entre si. Os Blocos C e D
dependem da T-SEG-05. O Bloco E fecha.

## Bloco A — cabeçalhos e CSP

- [ ] **T-SEG-01 (BE) — Cabeçalhos fixos e HSTS**
  - `cabecalhosFixos()` e `next.config.ts`.
  - Atende: CA-SEG-04. Depende de: nada.
  - Commit: `feat(seguranca): definir cabeçalhos HTTP fixos`.
- [ ] **T-SEG-02 (BE) — CSP com nonce no proxy**
  - `montarCsp()`, nonce por requisição e `atualizarSessao` repassando CSP e `x-nonce` ao Next e à
    resposta. Conferir no build que toda rota é `ƒ`.
  - Atende: CA-SEG-01, 02, 05 (unitários). Depende de: nada.
  - Commit: `feat(seguranca): aplicar CSP com nonce por requisição`.
- [ ] **T-SEG-03 (FE) — Barra de prazo sem estilo inline**
  - `rect` SVG com `width` em atributo, mesma aparência.
  - Atende: CA-SEG-06. Depende de: nada.
  - Commit: `fix(emprestimos): remover estilo inline da barra de prazo`.
- [ ] **T-SEG-04 (verificação) — E2E no build de produção**
  - `playwright.producao.config.ts`, script `test:e2e:producao` e `e2e/producao/`: cabeçalhos,
    nonces e nenhuma `securitypolicyviolation` nas seis telas.
  - Atende: CA-SEG-01, 02, 03, 04, 06 (no navegador). Depende de: T-SEG-01, 02, 03.
  - Commit: `test(seguranca): verificar CSP no build de produção`.

## Bloco B — migration

- [ ] **T-SEG-05 (migration) — Tabela `limites_requisicao`**
  - Só depois da aprovação específica do DDL (`plan.md`).
  - O responsável gera a migration (`--create-only`) e roda o `prisma:reset` no banco local
    descartável. O agente acrescenta CHECK, RLS, policies e `REVOKE`.
  - Atende: CA-SEG-14. Depende de: aprovação do DDL.
  - Commit: `feat(banco): criar tabela de limites de requisição`.

## Bloco C — limite de requisições (BE)

- [ ] **T-SEG-06 — Chave, IP confiável e identificadores**
  - `CHAVE_HMAC_LIMITES` em `src/env.ts`, `.env.example` (só o nome) e valor de teste em
    `src/test/setup.ts`; `lerIpConfiavel`; HMAC por escopo.
  - Atende: CA-SEG-13 (HMAC), 16 (unitário). Depende de: nada.
  - Commit: `feat(seguranca): derivar IP confiável e identificadores de limite`.
- [ ] **T-SEG-07 — Contador atômico, expiração e limpeza**
  - `consumir`, `devolver`, `consumirJuntos` e a limpeza em lote; erros viram
    `ErroLimiteIndisponivel`.
  - Atende: CA-SEG-09 (serviço), 12 (serviço), 13, 15. Depende de: T-SEG-05, 06.
  - Commit: `feat(seguranca): contar tentativas de forma atômica`.
- [ ] **T-SEG-08 — Contexto, 429/503 e `Retry-After`**
  - Contexto com `ipConfiavel` e limitador; `mensagens-limite.ts`; `responseMeta`; limitador de
    teste explícito para os testes com Prisma simulado.
  - Atende: CA-SEG-12 (formato), 16 (contexto). Depende de: T-SEG-07.
  - Commit: `feat(seguranca): responder limite excedido e indisponível`.
- [ ] **T-SEG-09 — Limite do login**
  - IP (100/15 min), reserva por e-mail (5/15 min) e devolução no sucesso ou em falha que não é de
    credencial.
  - Atende: CA-SEG-07, 08, 09, 12, 16 (bloqueio coletivo). Depende de: T-SEG-08.
  - Commit: `feat(autenticacao): limitar tentativas de login`.
- [ ] **T-SEG-10 — Limite das cinco mutações**
  - `limitarMutacao` depois do `.input()` em cada mutação; prova pelo AppRouter.
  - Atende: CA-SEG-10, 11, 12. Depende de: T-SEG-08.
  - Commit: `feat(seguranca): limitar mutações por usuário e por IP`.

## Bloco D — interface (FE)

- [ ] **T-SEG-11 — Mensagens de limite e indisponibilidade**
  - `mensagemDeLimite` no login e nos componentes de solicitação, devolução, situação e cadastro.
  - Atende: CA-SEG-17. Depende de: T-SEG-08.
  - Commit: `feat(seguranca): mostrar limite excedido na interface`.

## Bloco E — fechamento

- [ ] **T-SEG-12 (docs) — Referências e roteiro de validação**
  - Linha em "Contrato afetado" das Specs 001, 005, 007 e 008 (P8). Seção da Spec 009 em
    `docs/VALIDACAO-INTEGRADA.md`, com os níveis 2 (preview) e 3 (URL de produção). Pendência
    `CHAVE_HMAC_LIMITES` em `docs/DEVOPS.md`.
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
| CA-SEG-03 | 04 |
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
