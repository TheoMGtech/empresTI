# Spec — meus empréstimos, devolução e histórico

## Estado

**Status:** APROVADA — pelo responsável em 2026-11-11, com `plan.md` e `tasks.md`. Ainda não
implementada.

## Objetivo

Permitir que cada pessoa veja os próprios empréstimos, devolva um item e consulte o histórico.

## Vínculos

- **PRD:** itens 1 e 4. **ADR-001:** §4, §6, §10. **Specs 003, 005 e 006.**
- **Layout:** tela 04, §5.10 e §8.

## Escopo

- Rota `/meus-emprestimos`.
- `emprestimos.meus`, `emprestimos.historico` e `emprestimos.devolver`.
- Seção "Comigo agora", barra de prazo, diálogo de confirmação e tabela de histórico.

## Fora de escopo

Devolução em nome de outra pessoa (Spec 008), renovação, comprovante, registro de defeito.

## Requisitos funcionais

- **RF-DEVOL-01** — `emprestimos.meus` devolve só empréstimos em aberto da própria pessoa.
- **RF-DEVOL-02** — `emprestimos.historico` devolve os encerrados da própria pessoa, por cursor.
- **RF-DEVOL-03** — `emprestimos.devolver` encerra um empréstimo em aberto da própria pessoa.
- **RF-DEVOL-04** — A barra de prazo mostra dias decorridos sobre o prazo.
- **RF-DEVOL-05** — O histórico indica "No prazo" ou atraso, por comparação de datas.
- **RF-DEVOL-06** — A devolução pede confirmação em diálogo e encerra na hora.
- **RF-DEVOL-07** — Empréstimo já encerrado é recusado com o motivo `EMPRESTIMO_JA_ENCERRADO`.

## Regras de negócio

- **RN-DEVOL-01** — Ao devolver, o item volta a ser disponível se a situação for `ativo`.
- **RN-DEVOL-02** — Um empréstimo só pode ser encerrado uma vez.
- **RN-DEVOL-03** — O encerramento é um serviço único, compartilhado com
  `operacoes.registrarDevolucao`, condicionado a empréstimo ainda em aberto.

## Segurança e autorização

- **RS-DEVOL-01** — `tenantProcedure`, com a pessoa vinda da sessão.
- **RS-DEVOL-02** — Um colaborador não vê nem devolve empréstimo de outra pessoa.
- **RS-DEVOL-03** — A devolução grava auditoria na mesma transação.

## Contrato afetado

Três procedimentos novos e rota `/meus-emprestimos`. Sem migration.

## Critérios de aceitação

- **CA-DEVOL-01** — A lista traz só os empréstimos em aberto da própria pessoa.
- **CA-DEVOL-02** — Devolver encerra o empréstimo e libera o item.
- **CA-DEVOL-03** — Devolver duas vezes é recusado com `EMPRESTIMO_JA_ENCERRADO`.
- **CA-DEVOL-04** — Colaborador não devolve empréstimo de outra pessoa.
- **CA-DEVOL-05** — Usuário do tenant A não acessa dado do tenant B, em cada procedimento.
- **CA-DEVOL-06** — O histórico marca corretamente no prazo e em atraso, com datas fixas.
- **CA-DEVOL-07** — A devolução grava auditoria, e falha nela desfaz a devolução.
- **CA-DEVOL-08** — Devolver o item atrasado libera novas solicitações.
- **CA-DEVOL-09** — Lint, typecheck, testes, E2E e build passam. E2E com tRPC simulado vale no
  desenvolvimento e basta para declarar esta spec PRONTA; a validação integrada real é obrigatória
  antes da entrega final, isto é, antes da publicação em `main` e na Vercel (DF-14).

## Dependências

Specs 003, 005 e 006.

## Riscos

Devolução concorrente com Operações: a atualização condiciona a empréstimo ainda em aberto.

## Decisões tomadas

- **D-DEVOL-01 (DF-7):** registro de defeito fica fora; Operações marca a manutenção depois.
- **D-DEVOL-02 (DF-4):** encerra na hora, com diálogo de confirmação.
- **DF-14 (responsável, 2026-11-11):** a validação integrada real é obrigatória antes da entrega
  final (publicação em `main` e na Vercel), mas não é pré-condição para declarar esta spec PRONTA.
  A spec pode ser PRONTA com os critérios comprovados, lint, typecheck, testes e build aprovados, o
  E2E previsto aprovado (tRPC simulado vale no desenvolvimento) e `Veredito: PRONTA` do
  `verificador-spec` no commit exato. Roteiro: `docs/VALIDACAO-INTEGRADA.md`.
