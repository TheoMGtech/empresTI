---
description: Procedimento para qualquer mudança de schema sob Prisma Migrate
globs: ["prisma/**"]
alwaysApply: false
---

# Mudança de schema
> leitor: agente

## Quando
Qualquer tarefa que precise criar, alterar ou remover tabela, coluna,
índice, constraint ou política de acesso — inclusive quando a mudança
parecer trivial.

## Procedimento
1. Antes de gerar qualquer coisa: escreva o DDL pretendido na resposta
   e PARE. Eu aprovo ou corrijo.
2. Gere a migration com `npm run prisma:migrate -- --name <nome-curto>`.
   Prisma Migrate é o único dono do schema. Uma migration por tarefa.
3. Toda tabela nova nasce com Row Level Security habilitada e pelo
   menos uma policy explícita no SQL da migration gerada. Tabela sem
   policy não entra no repositório.
4. Se a tabela já tem dado, diga o que acontece com as linhas
   existentes. Coluna obrigatória nova precisa de default ou de um
   passo de preenchimento.
5. Aplique com `npm run prisma:reset` no banco local e rode `npm test`.
   Ainda não existe banco local definido: até essa decisão do responsável,
   pare neste passo e avise. Nunca aponte `DATABASE_URL` ou `DIRECT_URL`
   para o projeto remoto para contornar.

## Verificação
`npm run prisma:reset` num banco local limpo aplica todas as migrations
do zero, sem erro e sem nenhum passo manual.

## Não faça
- Não altere schema pelo Studio, pela Supabase CLI nem por SQL avulso.
  O que não está em migration do Prisma não existe.
- Não edite migration que já foi para o repositório remoto. Escreva
  a próxima.
- Não toque no projeto Supabase remoto. Tudo acontece no local.
- Não use `npx` nesta pasta: o `&` no caminho quebra o comando. Use os
  scripts `npm run prisma:*`.
