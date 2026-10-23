---
description: Procedimento para encerrar uma sessão com trabalho pendente
globs: []
alwaysApply: false
---

# Handoff de sessão
> leitor: agente

## Quando
Ao encerrar uma sessão com tarefa incompleta, bloqueio externo ou contexto que
precise continuar em outra conversa.

## Procedimento
1. Atualize `handoff.md` com branch, último commit, trabalho concluído, pendências
   e próximo comando seguro.
2. Registre resultados de lint, typecheck, testes e build sem declarar como
   aprovado o que não foi executado.
3. Não copie segredos, tokens, URLs com senha ou saídas sensíveis.
4. Aponte para spec, ADR e rule aplicáveis; não replique seus requisitos.

## Verificação
Uma nova sessão consegue continuar sem inferir decisão nem repetir trabalho.

## Não faça
- Não use `handoff.md` como fonte de verdade.
- Não marque tarefa como concluída por falta de tempo.
