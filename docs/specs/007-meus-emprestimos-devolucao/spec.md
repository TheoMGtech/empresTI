# Spec — meus empréstimos, devolução e histórico

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Permitir que cada pessoa veja os próprios empréstimos, devolva um item e consulte o histórico.

## Vínculos

- **PRD:** itens 1 e 4. **ADR-001:** §4 (cursor), §6, §10. **Specs 003, 005 e 006.**
- **Layout:** tela 04, §5.10 e §8 (remoção de linha após devolução).

## Escopo

- Rota `/meus-emprestimos`.
- Procedimentos `emprestimos.meus`, `emprestimos.historico` e `emprestimos.devolver`.
- Seção "Comigo agora", barra de prazo e tabela de histórico.

## Fora de escopo

Devolução em nome de outra pessoa (Spec 008), renovação e comprovante.

## Requisitos funcionais

- **RF-DEVOL-01** — `emprestimos.meus` devolve só empréstimos em aberto da própria pessoa.
- **RF-DEVOL-02** — `emprestimos.historico` devolve os encerrados da própria pessoa, por cursor.
- **RF-DEVOL-03** — `emprestimos.devolver` encerra um empréstimo em aberto da própria pessoa.
- **RF-DEVOL-04** — A barra de prazo mostra dias decorridos sobre o prazo.
- **RF-DEVOL-05** — O histórico indica "No prazo" ou atraso, por comparação de datas.

## Regras de negócio

- **RN-DEVOL-01** — Ao devolver, o item volta a ser disponível se a situação for `ativo`.
- **RN-DEVOL-02** — Um empréstimo só pode ser encerrado uma vez.

## Segurança e autorização

- **RS-DEVOL-01** — `tenantProcedure`, com a pessoa vinda da sessão.
- **RS-DEVOL-02** — Um colaborador não vê nem devolve empréstimo de outra pessoa.
- **RS-DEVOL-03** — A devolução grava auditoria na mesma transação.

## Contrato afetado

Três procedimentos novos e rota `/meus-emprestimos`. Campos de devolução na tabela de empréstimos.

## Critérios de aceitação

- **CA-DEVOL-01** — A lista traz só os empréstimos em aberto da própria pessoa.
- **CA-DEVOL-02** — Devolver encerra o empréstimo e libera o item.
- **CA-DEVOL-03** — Devolver duas vezes não altera o registro e é recusado.
- **CA-DEVOL-04** — Colaborador não devolve empréstimo de outra pessoa.
- **CA-DEVOL-05** — Usuário do tenant A não acessa dado do tenant B, em cada procedimento.
- **CA-DEVOL-06** — O histórico marca corretamente no prazo e em atraso, com datas fixas.
- **CA-DEVOL-07** — A devolução grava auditoria, e falha nela desfaz a devolução.
- **CA-DEVOL-08** — Lint, typecheck, testes, E2E e build passam.

## Dependências

Specs 003, 005 e 006.

## Riscos

Devolução concorrente com Operações: a atualização precisa condicionar a empréstimo ainda em aberto.

## Decisões pendentes

- **D-DEVOL-01 — Item que volta com defeito.** **Recomendação:** fora desta spec; Operações marca
  a manutenção depois (ver Spec 008).
- **D-DEVOL-02 — Devolução sem conferência.** O PRD permite ao colaborador devolver, e Operações
  registra no balcão. Basta a ação do colaborador? **Recomendação:** sim, sem confirmação de
  Operações.
