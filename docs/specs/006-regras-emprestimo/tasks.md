# Tarefas — regras de empréstimo

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Uma tarefa por vez, um commit por tarefa,
com `rules/checks.md` ao concluir. Todo teste cita no nome o CA que evidencia.

## Bloco A — servidor (BE)

- [ ] **T-REGRAS-01 — Contrato de `meuResumo` e motivos**
  - Avisar o FE.
  - Atende: RF-REGRAS-01, RF-REGRAS-04.
  - Commit: `feat(emprestimos): publicar contrato do resumo`.
- [ ] **T-REGRAS-02 — Limite de 3, serializado por pessoa**
  - Atende: CA-REGRAS-01, 02, 08.
  - Commit: `feat(emprestimos): aplicar limite de itens por pessoa`.
- [ ] **T-REGRAS-03 — Bloqueio por atraso e `meuResumo`**
  - Atende: CA-REGRAS-04, 05, 08, 09.
  - Commit: `feat(emprestimos): bloquear solicitação com item em atraso`.

## Bloco B — interface (FE)

- [ ] **T-REGRAS-04 — Contador, nota e botão desabilitado**
  - Atende: CA-REGRAS-07.
  - Commit: `feat(emprestimos): mostrar limite e atraso na interface`.

## Bloco C — fechamento

- [ ] **T-REGRAS-05 — Provas finais (BE)**
  - Atende: CA-REGRAS-03, 06 (por referência à Spec 005), 10. Verificação formal conforme
    `rules/spec-flow.md`.
  - Commit: `test(emprestimos): provar critérios finais da spec 006`.
