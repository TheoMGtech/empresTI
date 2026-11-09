---
description: Procedimento para iniciar ou alterar funcionalidade de produto
globs: ["docs/specs/**"]
alwaysApply: true
---

# Fluxo de especificação
> leitor: agente

## Quando
Ao iniciar funcionalidade nova, alterar comportamento observável existente ou
declarar uma spec `PRONTA`.

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

## `Implementada` e `PRONTA`
- `Implementada`: as tarefas foram concluídas e o comportamento foi entregue. A
  spec passa a descrever o comportamento vigente, o que não prova seus critérios.
  Nesse momento, atualize o `## Estado` dela e marque as tarefas com `[x]`.
- `PRONTA`: a execução mais recente em `verificacao.md` devolveu
  `Veredito: PRONTA` para o commit citado, e o responsável fez a validação final.
- `Implementada` não implica `PRONTA`. Spec marcada `Implementada` antes desta
  regra mantém o estado registrado até o responsável decidir.

## Antes de declarar uma spec `PRONTA`
Esta seção vale somente para declarar uma spec `PRONTA`. PR de configuração,
manutenção, dependência ou ferramenta de verificação que não faz essa declaração
não precisa de verificação nem de `verificacao.md`: escreva "Não se aplica" no PR.

1. Rode os checks de `rules/checks.md` no commit exato, com a pasta de trabalho
   sem alterações, no agente principal ou em ambiente isolado. O verificador só
   lê arquivos e não executa comandos.
2. Delegue ao subagente `verificador-spec` (`agents/verificador-spec.md`),
   passando o caminho da spec, o SHA completo do commit, a lista de arquivos
   verificados e a evidência dos checks: commit, resultado e última linha de cada
   comando. A delegação traz só essas entradas: não descreve o que mudou nem
   antecipa o resultado.
3. Registre o relatório em `docs/specs/<NNN-nome>/verificacao.md`, no formato
   abaixo. O verificador continua somente leitura: quem registra é o agente
   principal.
4. A spec só é `PRONTA` com `Veredito: PRONTA` na execução mais recente. Qualquer
   outro resultado volta para as tarefas — quem corrige é o agente principal,
   nunca o verificador — e a correção exige nova execução.
5. O veredito vale para o commit verificado. Depois dele, o commit de registro só
   pode tocar `verificacao.md`, o `## Estado` da spec e `tasks.md`. Qualquer outra
   mudança exige nova execução.

## Registro em `verificacao.md`
- Toda execução que devolveu veredito entra no arquivo, inclusive `NÃO PRONTA` e
  resultados inesperados. Sem veredito, como no pedido de entradas faltantes, não
  há execução a registrar.
- O arquivo só cresce: acrescente a linha do histórico e a seção da nova execução,
  sem editar nem remover execuções anteriores.
- O relatório é transcrito sem edição. Se vier fora do formato ou errado, registre
  assim mesmo, explique nas observações e rode de novo.
- Comentários do agente principal ficam só nas observações, nunca dentro do
  relatório. Nenhum trecho do registro pode conter segredo.

````markdown
# Verificações — <NNN-nome>

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | <AAAA-MM-DD> | <SHA completo> | <CA: status> ou nenhum | <comando> ou nenhum | <PRONTA ou NÃO PRONTA> |

## V-01 — <AAAA-MM-DD>

- Spec: `docs/specs/<NNN-nome>/spec.md`
- Commit verificado: <SHA completo>
- Veredito: <linha copiada literalmente do relatório>
- Relatório original: <identificadores da sessão e do subagente que o produziram>

### Evidências entregues ao verificador (delegação, sem edição)

```text
<prompt completo enviado ao subagente>
```

### Relatório do verificador (sem edição)

```text
<resposta completa do subagente>
```

### Observações do agente principal

- Diferenças em relação à execução anterior: <CAs, checks e veredito que mudaram> ou primeira execução.
- <AAAA-MM-DD>: <complemento posterior, como PR e SHA de integração após squash>.
````

## Verificação
Todo comportamento implementado aponta para uma spec aprovada e para evidência
de seus critérios de aceitação. Toda spec `PRONTA` tem, em `verificacao.md`,
`Veredito: PRONTA` na execução mais recente, sobre o commit citado.

## Não faça
- Não transforme PRD em spec sem fechar ambiguidades com o responsável.
- Não use ADR para decidir regra de negócio.
- Não escreva código antes da aprovação de spec, plano e tarefas.
- Não crie pasta de spec fora do padrão `NNN-nome-curto`.
- Não apague spec implementada: ela continua descrevendo o comportamento vigente.
- Não declare spec `PRONTA` sem o registro em `verificacao.md`.
- Não edite o veredito, não omita reprovação e não reescreva execução anterior.
