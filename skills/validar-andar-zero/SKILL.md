---
name: validar-andar-zero
description: Verifica o andar zero do EmpresTI antes de PR, deploy ou declaração de conclusão, reunindo evidências locais, de CI, banco e URL publicada. Não implementa funcionalidade nem corrige falhas sem pedido explícito.
---

# Validar o andar zero

Use esta skill quando o pedido for validar, revisar ou provar a fundação
executável do EmpresTI.

1. Leia `docs/andar-zero.md`, `docs/plan-andar-zero.md` e
   `rules/checks.md`. Eles são as fontes de verdade; não replique seus
   critérios aqui.
2. Execute os comandos reais declarados no `package.json`, incluindo lint,
   typecheck, testes e build.
3. Se houver migration no escopo, valide o histórico e a aplicação em banco
   isolado conforme `rules/migration.md`. Nunca use o banco remoto para teste.
4. Confirme que a tela consome o procedimento tRPC e que o procedimento consulta
   o banco por Service → Prisma.
5. Para CI ou deploy, registre URL, commit, ambiente e resposta HTTP sem expor
   variáveis ou logs sensíveis.
6. Relate cada AZ como `atendido`, `falhou` ou `não verificado`, citando a
   evidência observável. Não converta ausência de evidência em sucesso.

Pare diante de login, consentimento de provedor, DDL não aprovado, segredo
ausente ou necessidade de merge em `main` sem autorização vigente.
