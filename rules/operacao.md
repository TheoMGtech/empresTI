---
description: Contrato de operacao entre mim e o agente neste projeto
globs: []
alwaysApply: true
---

# Contrato de operação

## Git
> leitor: agente

- Commit: O agente commita cada tarefa
- Push: O agente pode fazer push somente em branch de feature; nunca direto em
  `develop` ou `main`.
- A mensagem de commit cita a tarefa e o critério de aceitação.
- Um commit por tarefa. Nunca junte código e mudança de regra
  no mesmo commit.
- Branches de trabalho partem de `develop` e seguem `feature/<nome-curto>`.
- Depois de CI verde, o agente pode abrir e fazer squash merge de PR próprio em
  `develop`. O merge em `main` continua exclusivo do responsável, mediante
  autorização explícita nesta conversa.

## Autorização por tipo de ação
> leitor: agente

| ação                                        | nível          |
|---------------------------------------------|----------------|
| Editar arquivo existente dentro do escopo da tarefa | livre          |
| Criar arquivo novo                          | avisar depois  |
| Deletar ou renomear arquivo                 | avisar depois  |
| Instalar ou atualizar dependência           | pedir antes    |
| Criar ou alterar migration                  | pedir antes    |
| Alterar variável de ambiente ou configuração de deploy | pedir antes    |

O que cada nível significa:
- livre — faça e siga em frente.
- avisar depois — faça e me diga na resposta o que fez.
- pedir antes — descreva o que pretende fazer e PARE.
- proibido — não faça, mesmo que eu peça no meio de uma tarefa.
  Se eu pedir, me lembre desta linha.

## Configuração do operador
> leitor: humano — isto não é instrução para o agente

| fase                              | modelo / raciocínio |
|-----------------------------------|---------------------|
| Escrever a spec                   | raciocínio alto     |
| Planejar e quebrar em tarefas     | raciocínio alto     |
| Executar uma tarefa já decidida   | rápido              |
| Debugar algo que quebrou          | raciocínio alto     |
| Revisar o diff antes do commit    | padrão              |

- Revisão de diff acontece em sessão limpa, de preferência com
  modelo diferente do que escreveu o código.
- Sessão longa não se corrige com regra mais enfática: encerre
  seguindo rules/handoff.md e abra outra.

## Autorização vigente para o andar zero
> leitor: agente

- O responsável autorizou em 2026-10-19 a configuração do projeto Supabase
  `InovacaoTecnologia` (`wdudlqacomnasnrxgbni`) e o primeiro deploy de produção
  na Vercel a partir de `main`.
- A autorização vale somente para o andar zero técnico e não inclui
  funcionalidade de produto, regra de negócio ou segredo versionado.
- O DDL continua sujeito ao ponto de parada de `rules/migration.md`.
