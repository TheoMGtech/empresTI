## Contexto

<!-- Link para a spec, quando houver, e descreva o problema resolvido. -->

## Mudança

<!-- O que foi alterado e por quê. -->

## Evidências

<!-- Comandos executados, resultado e cobertura dos critérios de aceitação. -->

## Spec e verificação

<!--
Spec, commit e checks: preencha quando o PR implementa spec de produto.
Relatório e veredito: exigidos quando o PR declara a spec PRONTA (rules/spec-flow.md).
PR de manutenção, configuração, dependência ou ferramenta de verificação sem spec
de produto: escreva "Não se aplica" e o motivo em uma linha.
-->

- Spec:
- Commit verificado (SHA completo):
- Relatório (`docs/specs/<NNN-nome>/verificacao.md`, execução `V-nn`):
- Checks (comando e resultado):
- Veredito:

## Checklist

- [ ] A mudança está vinculada a uma spec aprovada ou declara acima por que não se aplica.
- [ ] Havendo spec, `plan.md` e `tasks.md` existem ou foram atualizados antes do código.
- [ ] Se declara uma spec `PRONTA`, a execução mais recente tem `Veredito: PRONTA` e o relatório foi transcrito sem edição.
- [ ] Não há segredo, `.env` ou dado pessoal no diff.
- [ ] Foram adicionados/atualizados testes proporcionais ao risco.
- [ ] O isolamento entre tenants foi considerado e testado quando aplicável.
- [ ] A documentação afetada foi atualizada.
