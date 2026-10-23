# Andar zero — prova do ADR-001

Este documento não é uma spec: não há comportamento de produto aqui. Ele define
a prova executável de que as decisões do ADR-001 funcionam juntas antes da primeira
feature. Não introduz login, catálogo, equipamento, empréstimo, devolução nem
tabelas de domínio.

## Vínculo

- ADR: `docs/adr/001-stack.md`
- Processo: `AGENTS.md` e `rules/*.md`

## Critérios de aceitação

- AZ-01 — uma instalação limpa disponibiliza os comandos `lint`, `typecheck`,
  `test` e `build`, todos concluindo sem falha.
- AZ-02 — a aplicação Next.js em TypeScript estrito inicia localmente e expõe o
  Route Handler do tRPC definido no ADR.
- AZ-03 — Prisma gera o cliente a partir de schema versionado e aplica uma
  migration local pelo fluxo Prisma Migrate.
- AZ-04 — uma tabela técnica mínima tem `tenant_id`, RLS habilitada e uma policy
  explícita na migration; não modela equipamento, pessoa ou empréstimo.
- AZ-05 — uma tela cliente consome um procedimento tRPC técnico pela integração
  TanStack Query, sem Server Action e sem acesso direto ao Prisma.
- AZ-06 — há uma prova automatizada com Vitest e `createCaller`; a configuração
  também permite testes de componentes com Testing Library, banco real isolado
  com Testcontainers e fluxos futuros com Playwright.
- AZ-07 — variáveis públicas e exclusivas do servidor são validadas no boot e
  documentadas em `.env.example`, sem valores reais.
- AZ-08 — CI executa a proteção documental e, após a criação dos scripts, lint,
  typecheck, testes e build para pull requests destinados a `develop` e `main`.

## Tarefas de execução

1. Inicializar o monólito e as dependências definidas pelo ADR.
2. Configurar scripts, lint, typecheck, Vitest, Testing Library, Testcontainers
   e Playwright.
3. Configurar Prisma, uma migration técnica e as garantias mínimas de RLS.
4. Configurar tRPC, contexto técnico, procedimento técnico e tela cliente de prova.
5. Configurar validação de ambiente, CI de qualidade e testes dos critérios AZ.
6. Executar os comandos de verificação e registrar a evidência em PR para `develop`.

## Não decidido ainda

O andar zero não decide modelagem de domínio, papéis e permissões de negócio,
provisionamento de tenant, fluxo de convite ou regras de empréstimo. Essas decisões
pertencem à primeira spec que as acionar e exigem aprovação do responsável.
