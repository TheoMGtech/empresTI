---
description: Procedimento para encerrar uma sessão com trabalho pendente
globs: []
alwaysApply: false
---

# Handoff de sessão
> leitor: agente

## Quando
Ao terminar uma tarefa do plano com trabalho restante, ao encerrar uma sessão com
tarefa incompleta ou bloqueio externo, ou quando o responsável disser "vamos fechar".

## Procedimento
Sobrescreva `handoff.md` na raiz (não versionado) com no máximo 30 linhas, nesta
ordem:
1. Onde parei — tarefa e CA em andamento.
2. O que está commitado, em qual branch e qual PR.
3. O que está aplicado em banco local e ainda não commitado.
4. O que já foi publicado (preview ou produção).
5. O que tentei e não funcionou — para não ser tentado de novo.
6. O que NÃO fazer na próxima sessão, e por quê.
7. Próximo passo exato, em uma frase imperativa com arquivo e tarefa.

Regras de redação:
- Registre lint, typecheck, testes e build sem declarar como aprovado o que não
  foi executado.
- Aponte para spec, ADR, rule ou `AGENTS.md`; não repita o conteúdo deles.
- Pendência permanente do responsável não é handoff: ela vai para
  `docs/DEVOPS.md` ou para uma issue.
- Não copie segredos, tokens, URLs com senha ou saídas sensíveis.

## Verificação
Uma sessão nova, lendo só `handoff.md` e a spec, continua sem perguntar nada sobre
o que já foi feito.

## Não faça
- Não use `handoff.md` como fonte de verdade.
- Não acumule histórico de sessões: o arquivo é sobrescrito.
- Não marque tarefa como concluída por falta de tempo.
