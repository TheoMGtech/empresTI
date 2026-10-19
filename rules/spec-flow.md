---
description: Procedimento para iniciar ou alterar funcionalidade de produto
globs: ["docs/specs/**"]
alwaysApply: false
---

# Fluxo de especificação
> leitor: agente

## Quando
Ao iniciar funcionalidade nova ou alterar comportamento observável existente.

## Procedimento
1. Crie `docs/specs/<feature>/spec.md` com escopo, fora de escopo, requisitos e
   critérios de aceitação identificados.
2. Pare para aprovação do responsável.
3. Depois da aprovação, escreva `plan.md` e `tasks.md`, mantendo rastreabilidade
   entre requisito, critério, tarefa e teste.
4. Pare novamente antes de escrever código.
5. Implemente uma tarefa por vez e valide conforme `rules/checks.md`.

## Verificação
Todo comportamento implementado aponta para uma spec aprovada e para evidência
de seus critérios de aceitação.

## Não faça
- Não transforme PRD em spec sem fechar ambiguidades com o responsável.
- Não use ADR para decidir regra de negócio.
- Não escreva código antes da aprovação de spec, plano e tarefas.
