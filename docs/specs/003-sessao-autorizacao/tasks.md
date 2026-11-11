# Tarefas — sessão autenticada, tenant e autorização

## Estado

**Status:** Aprovadas pelo responsável em 2026-11-11. Em execução: T-SESSAO-01 e T-SESSAO-02
concluídas.

Condições: uma tarefa por vez, só com autorização específica; um commit por tarefa, com
`rules/checks.md` ao concluir; todo teste cita no nome o CA que evidencia; DDL de migration com
aprovação específica e comandos protegidos executados pelo responsável; ajuste de prova histórica
da Spec 002 não elimina teste permanente de segurança; sem alteração no Supabase remoto, deploy
de produção ou merge em `main`.

## Bloco A — contrato e dados (BE)

- [x] **T-SESSAO-01 — Delimitar provas históricas da Spec 002**
  - Restringir CA-DADOS-25, a lista de migrations e as colunas de `memberships` ao estado da
    Spec 002, sem remover provas. Inclui CA-DADOS-26 (dependências), necessário para instalar
    `@phosphor-icons/react` na T-SESSAO-08. As provas de segurança continuam valendo para todos
    os arquivos.
  - Atende: pré-condição de CA-SESSAO-14.
  - Commit: `test(dados): delimitar provas históricas à spec 002`.
- [x] **T-SESSAO-02 — Contrato de `sessao.atual`**
  - Esquema Zod de saída e procedimento registrado, ainda "não implementado". Avisar o FE.
  - Atende: CA-SESSAO-05 (formato).
  - Commit: `feat(sessao): publicar contrato de sessao.atual`.
- [ ] **T-SESSAO-03 — Migration de `nome_exibicao`**
  - Paradas: DDL para revisão; geração e reset pelo responsável.
  - Atende: CA-SESSAO-05, CA-SESSAO-14.
  - Testes: coluna opcional; texto vazio recusado.
  - Commit: `feat(banco): adicionar nome de exibição em memberships`.

## Bloco B — autorização (BE)

- [ ] **T-SESSAO-04 — Contexto e middlewares**
  - Identidade validada a cada request; `protectedProcedure`, `tenantProcedure`, `adminProcedure`.
  - Atende: CA-SESSAO-01, 02, 03, 04, 08.
  - Testes: sem sessão; sem membership; múltiplos memberships; papel; `tenantId` no input ignorado.
  - Commit: `feat(sessao): resolver identidade, tenant e papel no contexto`.
- [ ] **T-SESSAO-05 — `errorFormatter`**
  - Atende: CA-SESSAO-11.
  - Testes: erro Zod com `campos`; erro de regra com `motivo`; sem vazamento de detalhe interno.
  - Commit: `feat(api): padronizar motivo e campos nos erros`.
- [ ] **T-SESSAO-06 — Implementar `sessao.atual`**
  - Atende: CA-SESSAO-05.
  - Testes: devolve só `nomeExibicao` e `papel`; `null` sem nome.
  - Commit: `feat(sessao): devolver nome e papel da sessão`.
- [ ] **T-SESSAO-07 — Rotina de vínculo com papel e nome**
  - Atende: CA-SESSAO-12.
  - Testes: papel e nome gravados; verificação de identidade mantida; papel inválido recusado.
  - Commit: `feat(banco): aceitar papel e nome no vínculo`.

## Bloco C — interface (FE)

- [ ] **T-SESSAO-08 — Shell responsivo**
  - Instala `@phosphor-icons/react` (DF-10).
  - Atende: CA-SESSAO-06, CA-SESSAO-13.
  - Commit: `feat(shell): criar área autenticada responsiva`.
- [ ] **T-SESSAO-09 — Destino, expiração e acesso restrito**
  - Atende: CA-SESSAO-07, 09, 10; CA-LOGIN-05 e CA-LOGIN-06 revisados.
  - Commit: `feat(sessao): redirecionar ao catálogo e tratar sessão inválida`.

## Bloco D — fechamento

- [ ] **T-SESSAO-10 — Provas finais (BE)**
  - Atende: CA-SESSAO-14. Verificação formal conforme `rules/spec-flow.md`.
  - Commit: `test(sessao): provar critérios finais da spec 003`.
