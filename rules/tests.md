# Estratégia de testes
> leitor: agente

## Quando
Ao planejar ou implementar uma feature, ou ao alterar comportamento existente.

## Procedimento
1. Todo teste de feature cita o critério de aceitação que evidencia (`CA-xx`).
2. Use Vitest para serviços e componentes; use Testing Library para componentes;
   use `createCaller` do tRPC para procedimentos; e Playwright para fluxos críticos
   de interface.
3. Testes de integração de banco usam PostgreSQL real isolado com Testcontainers.
   Não use banco remoto nem mock do Prisma para provar constraints, transações ou RLS.
4. Todo procedimento que lê ou altera dado de tenant tem caso que prova que um
   usuário do tenant A não acessa dado do tenant B.
5. Rode a suíte com `npm test` e os demais comandos de `rules/checks.md`.

## Não faça
- Não declare um CA atendido sem teste ou evidência verificável correspondente.
- Não use percentual de cobertura como substituto de caminho crítico.
