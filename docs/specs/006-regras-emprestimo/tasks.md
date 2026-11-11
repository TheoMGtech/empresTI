# Tarefas — regras de empréstimo

## Estado

**Status:** Aprovadas pelo responsável em 2026-11-11. Em execução: T-REGRAS-01 concluída.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; sem alteração no
Supabase remoto, deploy de produção ou merge em `main`.

## Bloco A — servidor (BE)

- [x] **T-REGRAS-01 — Contrato de `meuResumo` e motivos**
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
