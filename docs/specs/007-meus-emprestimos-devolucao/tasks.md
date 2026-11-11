# Tarefas — meus empréstimos, devolução e histórico

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Uma tarefa por vez, um commit por tarefa,
com `rules/checks.md` ao concluir. Todo teste cita no nome o CA que evidencia.

## Bloco A — servidor (BE)

- [ ] **T-DEVOL-01 — Contrato de `meus`, `historico` e `devolver`**
  - Avisar o FE.
  - Atende: RF-DEVOL-01, 02, 03.
  - Commit: `feat(emprestimos): publicar contrato de devolução e histórico`.
- [ ] **T-DEVOL-02 — Serviço de encerramento e `devolver`**
  - Atende: CA-DEVOL-02, 03, 04, 05, 07, 08.
  - Commit: `feat(emprestimos): encerrar empréstimo em aberto`.
- [ ] **T-DEVOL-03 — `meus` e `historico`**
  - Atende: CA-DEVOL-01, 05, 06.
  - Commit: `feat(emprestimos): listar empréstimos da pessoa`.

## Bloco B — interface (FE)

- [ ] **T-DEVOL-04 — Tela "Meus empréstimos"**
  - Atende: CA-DEVOL-01, 02, 06.
  - Commit: `feat(emprestimos): exibir empréstimos e devolver`.

## Bloco C — fechamento

- [ ] **T-DEVOL-05 — Provas finais (BE)**
  - Atende: CA-DEVOL-09. Verificação formal conforme `rules/spec-flow.md`.
  - Commit: `test(emprestimos): provar critérios finais da spec 007`.
