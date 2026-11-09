---
description: Procedimento para iniciar ou alterar funcionalidade de produto
globs: ["docs/specs/**"]
alwaysApply: true
---

# Fluxo de especificação
> leitor: agente

## Quando
Ao iniciar funcionalidade nova ou alterar comportamento observável existente.

## Ordem oficial
`SPEC → aprovação humana → PLAN → TASKS → aprovação humana → CODE`

## Procedimento
1. Antes de escrever a spec, liste as perguntas que o PRD não responde sobre a
   funcionalidade, marcando cada uma como negócio, técnica ou fora de escopo.
   Espere as respostas.
2. Crie `docs/specs/<NNN-nome-curto>/spec.md` (próximo número livre, três
   dígitos) com objetivo, vínculo com PRD e ADRs, regras, critérios de aceitação
   identificados (`CA-<FEATURE>-xx`), fora de escopo e contrato afetado.
3. Pare para aprovação do responsável.
4. Depois da aprovação, escreva `plan.md` (citando os ADRs que o restringem e as
   skills que usará) e `tasks.md` (cada tarefa cita um CA e cabe num commit),
   mantendo rastreabilidade entre requisito, critério, tarefa e teste.
5. Pare novamente antes de escrever código.
6. Implemente uma tarefa por vez e valide conforme `rules/checks.md`.
7. Mudança de comportamento numa feature existente altera a spec vigente dela
   primeiro; só então plano, tarefas e código.

## Antes de declarar uma spec pronta
- Delegue ao subagente `verificador-spec` (`agents/verificador-spec.md`),
  passando o caminho da spec e o intervalo de commits.
- A spec só é pronta com "Veredito: PRONTA". Qualquer outro resultado volta para
  as tarefas — quem corrige é o agente principal, nunca o verificador.
- Com a spec pronta e implementada, atualize o `## Estado` dela para
  `Implementada` e marque as tarefas com `[x]`.

## Verificação
Todo comportamento implementado aponta para uma spec aprovada e para evidência
de seus critérios de aceitação.

## Não faça
- Não transforme PRD em spec sem fechar ambiguidades com o responsável.
- Não use ADR para decidir regra de negócio.
- Não escreva código antes da aprovação de spec, plano e tarefas.
- Não crie pasta de spec fora do padrão `NNN-nome-curto`.
- Não apague spec implementada: ela continua descrevendo o comportamento vigente.
