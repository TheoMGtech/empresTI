# Tarefas — catálogo de equipamentos

## Estado

**Status:** Aprovadas pelo responsável em 2026-11-11. Nenhuma tarefa iniciada.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; sem alteração no
Supabase remoto, deploy de produção ou merge em `main`.

## Bloco A — servidor (BE)

- [ ] **T-CATALOGO-01 — Contrato de `equipamentos.listar`**
  - Esquemas de entrada e saída, e procedimento "não implementado". Avisar o FE.
  - Atende: CA-CATALOGO-10 (formato).
  - Commit: `feat(catalogo): publicar contrato da listagem`.
- [ ] **T-CATALOGO-02 — Listagem por tenant, com visibilidade**
  - Atende: CA-CATALOGO-01, 02, 03, 04, 09, 10.
  - Testes: 12 itens da carga; tenant B invisível; recusa sem sessão; manutenção; `fora_de_uso` por papel.
  - Commit: `feat(catalogo): listar equipamentos do tenant`.
- [ ] **T-CATALOGO-03 — Filtros, cursor e URL da fotografia**
  - Atende: CA-CATALOGO-05, 07, 08.
  - Commit: `feat(catalogo): filtrar e paginar a listagem`.

## Bloco B — interface (FE)

- [ ] **T-CATALOGO-04 — Tela e cards**
  - Atende: CA-CATALOGO-04, 06.
  - Commit: `feat(catalogo): exibir cards de equipamentos`.
- [ ] **T-CATALOGO-05 — Chips e "Só disponíveis"**
  - Atende: CA-CATALOGO-07.
  - Commit: `feat(catalogo): adicionar filtros à tela`.

## Bloco C — fechamento

- [ ] **T-CATALOGO-06 — Provas finais (BE)**
  - Atende: CA-CATALOGO-11. Verificação formal conforme `rules/spec-flow.md`.
  - Commit: `test(catalogo): provar critérios finais da spec 004`.
