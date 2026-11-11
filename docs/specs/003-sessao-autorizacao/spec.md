# Spec — sessão autenticada, tenant e autorização

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Resolver no servidor quem é o usuário, a qual tenant pertence e qual seu papel, proteger os
procedimentos e entregar a área autenticada, base de todas as telas da Etapa 4.

## Vínculos

- **PRD:** item 1 (cada pessoa vê os próprios empréstimos); atores Colaborador e Operações.
- **ADR-001:** §3 (contexto com sessão, `tenant_id` e `role`), §6 (tenant vindo da sessão), §7
  (`protectedProcedure`, `tenantProcedure`, `adminProcedure`).
- **Spec 001:** RF-LOGIN-06 e RS-LOGIN-05. **Spec 002:** `memberships` e papéis.
- **Layout:** §7, sidebar e navegação.

## Escopo

- Contexto tRPC com identidade, tenant e papel.
- Os três middlewares de autorização e o procedimento `sessao.atual`.
- Shell autenticado, com sidebar.
- Destino após o login e tratamento de sessão sem membership.

## Fora de escopo

- Catálogo, empréstimos e Operações. Convite, cadastro, recuperação de senha, seletor de tenant.
- Cabeçalhos de segurança, CSP e rate limit (ADR-001 §10), a tratar em spec própria.

## Requisitos funcionais

- **RF-SESSAO-01** — O contexto valida a identidade com o Supabase Auth a cada request, sem
  confiar só no conteúdo do cookie.
- **RF-SESSAO-02** — Tenant e papel vêm de `memberships`, nunca do input.
- **RF-SESSAO-03** — `protectedProcedure` recusa com `UNAUTHORIZED` quem não tem sessão.
- **RF-SESSAO-04** — `tenantProcedure` recusa com `FORBIDDEN` sessão sem membership e injeta
  `tenantId` e papel no contexto.
- **RF-SESSAO-05** — `adminProcedure` recusa com `FORBIDDEN` quem não tem papel `operacoes`.
- **RF-SESSAO-06** — `sessao.atual` devolve o papel e o nome de exibição, sem token nem e-mail.
- **RF-SESSAO-07** — O shell autenticado apresenta a sidebar do layout. O grupo Operações só
  aparece para `operacoes`.
- **RF-SESSAO-08** — Sessão sem membership vê a mensagem de acesso não liberado e a ação `Sair`.

## Regras de negócio

- **RN-SESSAO-01** — Papéis: `colaborador` e `operacoes` (Spec 002, D6).
- **RN-SESSAO-02** — Esconder o grupo Operações não substitui a autorização no servidor.

## Segurança e autorização

- **RS-SESSAO-01** — Todo procedimento com dado de tenant usa `tenantProcedure` ou `adminProcedure`.
- **RS-SESSAO-02** — A autorização não depende de RLS: o papel do Prisma a ignora.
- **RS-SESSAO-03** — Claims editáveis pelo usuário não entram em decisão de autorização.

## Contrato afetado

Contexto tRPC, `sessao.atual`, área autenticada e, se D-SESSAO-02 aprovar, `memberships`.

## Critérios de aceitação

- **CA-SESSAO-01** — Procedimento protegido sem sessão responde `UNAUTHORIZED`.
- **CA-SESSAO-02** — Sessão sem membership responde `FORBIDDEN` em `tenantProcedure`.
- **CA-SESSAO-03** — `colaborador` recebe `FORBIDDEN` em `adminProcedure`, e `operacoes` passa.
- **CA-SESSAO-04** — Um `tenantId` enviado no input é ignorado.
- **CA-SESSAO-05** — `sessao.atual` não devolve token nem e-mail.
- **CA-SESSAO-06** — `colaborador` não vê o grupo Operações, e `operacoes` vê.
- **CA-SESSAO-07** — Sessão sem membership vê acesso não liberado e consegue sair.
- **CA-SESSAO-08** — Lint, typecheck, testes, E2E e build passam.

## Dependências

- Spec 002 integrada.
- **Alterar antes a Spec 001** (`rules/spec-flow.md`, passo 7): ela fixa a permanência em `/` após
  o login.

## Riscos

- Validar a identidade a cada request soma latência, com functions nos EUA e banco em São Paulo.
- Middleware esquecido abre dado entre tenants: exige teste por procedimento.

## Decisões pendentes

- **D-SESSAO-01 — Mais de um membership.** O ADR permite. **Recomendação:** recusar com erro nesta
  versão, pois só existe um tenant e não há seletor.
- **D-SESSAO-02 — Nome de exibição.** O layout mostra nomes, mas o produto só conhece `user_id`.
  Opções: coluna em `memberships`, tabela de perfis, e-mail. **Recomendação:** `nome_exibicao`
  opcional em `memberships`, informado no provisionamento. Tem impacto em LGPD, que o ADR não decide.
- **D-SESSAO-03 — Destino após o login.** **Recomendação:** `/catalogo`, rota prevista no layout.
- **D-SESSAO-04 — Conta de Operações.** Só existe a do professor, como `colaborador`. Como
  demonstrar as telas de Operações? **Recomendação:** segunda conta, criada por você, com papel
  `operacoes`, o que exige estender a rotina de vínculo.
