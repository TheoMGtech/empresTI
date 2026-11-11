# Tarefas — detalhe do equipamento e solicitação de empréstimo

## Estado

**Status:** Aprovadas pelo responsável em 2026-11-11. Em execução: T-SOLIC-01 concluída.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; DDL de migration com
aprovação específica e comandos protegidos executados pelo responsável; ajuste de prova histórica
da Spec 002 não elimina teste permanente de segurança; sem alteração no Supabase remoto, deploy
de produção ou merge em `main`.

## Bloco A — contrato e dados (BE)

- [x] **T-SOLIC-01 — Delimitar provas históricas da Spec 002**
  - Restringir CA-DADOS-01, 06 e 18 ao estado da Spec 002, sem remover provas.
  - Atende: pré-condição de CA-SOLIC-11.
  - Commit: `test(dados): delimitar provas de estrutura à spec 002`.
- [ ] **T-SOLIC-02 — Contrato de `detalhar` e `solicitar`**
  - Avisar o FE.
  - Atende: CA-SOLIC-09 (formato).
  - Commit: `feat(emprestimos): publicar contrato de detalhe e solicitação`.
- [ ] **T-SOLIC-03 — Migration de empréstimos**
  - Paradas: DDL para revisão; geração e reset pelo responsável.
  - Atende: CA-SOLIC-05, 06, 11.
  - Testes: FK entre tenants recusada; RLS; `TRUNCATE` bloqueado; índice parcial.
  - Commit: `feat(banco): criar empréstimos com RLS e índice de aberto`.

## Bloco B — servidor (BE)

- [ ] **T-SOLIC-04 — `equipamentos.detalhar`**
  - Atende: CA-SOLIC-04, 08, 09, 10.
  - Commit: `feat(catalogo): detalhar equipamento por papel`.
- [ ] **T-SOLIC-05 — `emprestimos.solicitar`**
  - Atende: CA-SOLIC-01, 02, 03, 04, 07.
  - Testes: prazo; manutenção; concorrência; isolamento; rollback sem auditoria.
  - Commit: `feat(emprestimos): solicitar equipamento disponível`.
- [ ] **T-SOLIC-06 — Estado "emprestado" na listagem**
  - Atende: CA-CATALOGO-10; RF-SOLIC-04.
  - Commit: `feat(catalogo): refletir empréstimo na disponibilidade`.

## Bloco C — interface (FE)

- [ ] **T-SOLIC-07 — Tela de detalhe e diálogo**
  - Instala Radix Dialog (DF-10).
  - Atende: CA-SOLIC-09, 10.
  - Commit: `feat(catalogo): detalhar e solicitar na interface`.

## Bloco D — fechamento

- [ ] **T-SOLIC-08 — Provas finais (BE)**
  - Atende: CA-SOLIC-11. Verificação formal conforme `rules/spec-flow.md`.
  - Commit: `test(emprestimos): provar critérios finais da spec 005`.
