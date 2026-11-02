---
description: Como escrever, alterar ou remover testes neste projeto
globs: ["**/*.test.ts", "**/*.test.tsx", "e2e/**", "vitest.config.ts", "playwright.config.ts"]
alwaysApply: false
---

# Estratégia de testes
> leitor: agente

## Quando
Ao planejar ou implementar uma feature, ao alterar comportamento existente, ou ao
escrever, alterar ou remover qualquer teste.

## Procedimento
1. Todo teste de feature cita no nome o critério de aceitação que evidencia
   (`CA-<FEATURE>-xx`).
2. Use Vitest para serviços e componentes; use Testing Library para componentes;
   use `createCaller` do tRPC para procedimentos; e Playwright para fluxos críticos
   de interface.
3. Teste de procedimento ou de rota verifica o status E o corpo da resposta.
4. Testes de integração de banco usam PostgreSQL real isolado com Testcontainers.
   Não use banco remoto nem mock do Prisma para provar constraints, transações ou RLS.
5. Toda tabela com política de acesso tem um teste que prova o bloqueio: o mesmo
   dado, consultado com outro usuário ou outro tenant, não retorna.
6. Todo procedimento que lê ou altera dado de tenant tem caso que prova que um
   usuário do tenant A não acessa dado do tenant B.
7. Datas nos testes são explícitas e fixas.
8. Rode a suíte com `npm test` (e `npm run test:e2e` quando houver tela) e os
   demais comandos de `rules/checks.md`.

## Verificação
`npm test` passa, e uma busca pelo ID de cada CA da spec encontra ao menos um teste.

## Não faça
- Não declare um CA atendido sem teste ou evidência verificável correspondente.
- Não use percentual de cobertura como substituto de caminho crítico.
- Não use credenciais reais em teste.
