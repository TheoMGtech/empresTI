# Tarefas — operações: empréstimos em aberto, devolução e cadastro

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Uma tarefa por vez, um commit por tarefa,
com `rules/checks.md` ao concluir. Todo teste cita no nome o CA que evidencia.

## Bloco A — servidor (BE)

- [ ] **T-OPER-01 — Contrato dos seis procedimentos**
  - Avisar o FE.
  - Atende: CA-OPER-04 (formato e `adminProcedure`).
  - Commit: `feat(operacoes): publicar contrato de operações`.
- [ ] **T-OPER-02 — Lista, resumo e últimos cadastros**
  - Atende: CA-OPER-01, 02, 04, 07, 10, 11.
  - Commit: `feat(operacoes): listar empréstimos em aberto e resumo`.
- [ ] **T-OPER-03 — `registrarDevolucao`**
  - Atende: CA-OPER-03, 04, 08.
  - Commit: `feat(operacoes): registrar devolução no balcão`.
- [ ] **T-OPER-04 — `equipamentos.cadastrar`**
  - Atende: CA-OPER-04, 05, 06, 08.
  - Commit: `feat(operacoes): cadastrar equipamento`.
- [ ] **T-OPER-05 — `equipamentos.alterarSituacao`**
  - Atende: CA-OPER-04, 07, 08, 09.
  - Commit: `feat(operacoes): alterar situação do equipamento`.

## Bloco B — interface (FE)

- [ ] **T-OPER-06 — Tela de empréstimos em aberto**
  - Atende: CA-OPER-01, 02, 03, 11.
  - Commit: `feat(operacoes): exibir painel de empréstimos`.
- [ ] **T-OPER-07 — Formulário e controle de situação**
  - Atende: CA-OPER-05, 06, 09, 10.
  - Commit: `feat(operacoes): cadastrar e alterar situação na interface`.

## Bloco C — fechamento

- [ ] **T-OPER-08 — Provas finais (BE)**
  - Atende: CA-OPER-12. Verificação formal conforme `rules/spec-flow.md`.
  - Commit: `test(operacoes): provar critérios finais da spec 008`.
