# Spec — sessão autenticada, tenant e autorização

## Estado

**Status:** Implementada — aprovada pelo responsável em 2026-11-11, com `plan.md` e `tasks.md`;
T-SESSAO-01 a T-SESSAO-10 concluídas. Verificação formal V-01 (2026-11-11, commit `cf90302`):
NÃO PRONTA, com CA-SESSAO-14 AMBÍGUO e o check `git status --short` sem registro. V-02
(2026-11-11, commit `9a421a2`): `Veredito: PRONTA` (`verificacao.md`). Aguarda a validação final
do responsável para ser declarada PRONTA. A validação integrada real (DF-14) continua obrigatória
antes da publicação em `main` e na Vercel.

## Objetivo

Resolver no servidor quem é o usuário, a qual tenant pertence e qual seu papel, proteger os
procedimentos e entregar a área autenticada, base de todas as telas da Etapa 4.

## Vínculos

- **PRD:** item 1; atores Colaborador e Operações.
- **ADR-001:** §3 (contexto com sessão, `tenant_id` e `role`), §4 (`errorFormatter`), §6, §7.
- **Spec 001:** revisão de RF-LOGIN-06 e RF-LOGIN-07 (DF-15). **Spec 002:** `memberships`.
- **Layout:** §7, sidebar e navegação.

## Escopo

- Contexto tRPC com identidade, tenant e papel; os três middlewares; `sessao.atual`.
- `errorFormatter` com `error.data.motivo` e `error.data.campos` para erros Zod.
- Coluna `nome_exibicao` em `memberships`, com a migration desta spec.
- Rotina de vínculo passa a aceitar papel e nome.
- Shell autenticado responsivo e destino após o login.

## Fora de escopo

- Catálogo, empréstimos e Operações. Convite, cadastro, recuperação de senha, seletor de tenant.
- CSP, cabeçalhos e rate limit: spec própria, depois da 008, obrigatória antes da entrega (DF-13).

## Requisitos funcionais

- **RF-SESSAO-01** — O contexto valida a identidade com o Supabase Auth a cada request.
- **RF-SESSAO-02** — Tenant e papel vêm de `memberships`, nunca do input.
- **RF-SESSAO-03** — `protectedProcedure` recusa com `UNAUTHORIZED` quem não tem sessão.
- **RF-SESSAO-04** — `tenantProcedure` recusa com `FORBIDDEN` sessão sem membership e injeta
  `tenantId` e papel no contexto.
- **RF-SESSAO-05** — `adminProcedure` recusa com `FORBIDDEN` quem não tem papel `operacoes`.
- **RF-SESSAO-06** — `sessao.atual` usa `tenantProcedure` e devolve `{ nomeExibicao | null, papel }`.
- **RF-SESSAO-07** — O shell apresenta a sidebar do layout. O grupo Operações só aparece para
  `operacoes`. Sem nome de exibição, a interface mostra o papel.
- **RF-SESSAO-08** — Sessão sem membership vê a mensagem de acesso não liberado e a ação `Sair`.
- **RF-SESSAO-09** — Mais de um membership é recusado com `FORBIDDEN`, motivo
  `MULTIPLOS_MEMBERSHIPS`, sem escolher tenant.
- **RF-SESSAO-10** — Sem sessão, ou com sessão expirada, o usuário volta a `/`, limpando o cache
  do cliente.
- **RF-SESSAO-11** — `colaborador` em `/operacoes/*` vê "Acesso restrito a Operações."
- **RF-SESSAO-12** — `Sair` fica no bloco de usuário da sidebar. O sino é omitido.
- **RF-SESSAO-13** — Sidebar fixa a partir de 1024px; abaixo, barra superior simples sem gaveta;
  tabelas completas a partir de 1280px; sem rolagem horizontal em 375px. Vale para as specs 003 a 008.

## Regras de negócio

- **RN-SESSAO-01** — Papéis: `colaborador` e `operacoes` (Spec 002, D6).
- **RN-SESSAO-02** — Esconder o grupo Operações não substitui a autorização no servidor.

## Segurança e autorização

- **RS-SESSAO-01** — Todo procedimento com dado de tenant usa `tenantProcedure` ou `adminProcedure`.
- **RS-SESSAO-02** — A autorização não depende de RLS: o papel do Prisma a ignora.
- **RS-SESSAO-03** — Claims editáveis pelo usuário não entram em decisão de autorização.

## Contrato afetado

Contexto tRPC, `errorFormatter`, `sessao.atual`, `memberships.nome_exibicao`, rotina de vínculo.

**Supera:** CA-DADOS-25 da Spec 002 fixa o `AppRouter` e as rotas, e as provas históricas fixam a
lista de migrations e as colunas de `memberships`. A primeira tarefa desta spec delimita essas
provas ao escopo da Spec 002, sem removê-las.

## Critérios de aceitação

- **CA-SESSAO-01** — Procedimento protegido sem sessão responde `UNAUTHORIZED`.
- **CA-SESSAO-02** — Sessão sem membership responde `FORBIDDEN` em `tenantProcedure`.
- **CA-SESSAO-03** — `colaborador` recebe `FORBIDDEN` em `adminProcedure`, e `operacoes` passa.
- **CA-SESSAO-04** — Um `tenantId` enviado no input é ignorado.
- **CA-SESSAO-05** — `sessao.atual` devolve só `nomeExibicao` e `papel`.
- **CA-SESSAO-06** — `colaborador` não vê o grupo Operações, e `operacoes` vê.
- **CA-SESSAO-07** — Sessão sem membership vê acesso não liberado e consegue sair.
- **CA-SESSAO-08** — Mais de um membership é recusado com `MULTIPLOS_MEMBERSHIPS`.
- **CA-SESSAO-09** — Sessão expirada volta a `/` e limpa o cache do cliente.
- **CA-SESSAO-10** — `colaborador` em `/operacoes/*` vê "Acesso restrito a Operações."
- **CA-SESSAO-11** — Erros Zod chegam com `error.data.campos`, e erros de regra com `error.data.motivo`.
- **CA-SESSAO-12** — A rotina de vínculo aceita papel e nome, mantendo a verificação de identidade.
- **CA-SESSAO-13** — Sem rolagem horizontal em 375px, e sidebar fixa a partir de 1024px.
- **CA-SESSAO-14** — Lint, typecheck, testes, E2E e build passam. E2E com tRPC simulado vale no
  desenvolvimento e basta para declarar esta spec PRONTA; a validação integrada real é obrigatória
  antes da entrega final, isto é, antes da publicação em `main` e na Vercel (DF-14).

## Dependências

Spec 002 integrada. Revisão da Spec 001 aprovada junto. Segunda conta, com papel `operacoes`,
criada manualmente pelo responsável.

## Riscos

- Validar a identidade a cada request soma latência, com functions nos EUA e banco em São Paulo.
- Middleware esquecido abre dado entre tenants: exige teste por procedimento.

## Decisões tomadas

- **D-SESSAO-01 (DF-16):** múltiplos memberships recusados.
- **D-SESSAO-02 (DF-5):** `nome_exibicao` opcional em `memberships`; sem nome, exibe o papel.
- **D-SESSAO-03 (DF-15):** destino após o login é `/catalogo`.
- **D-SESSAO-04 (DF-9):** segunda conta `operacoes`, criada pelo responsável.
- **DF-10:** `@phosphor-icons/react` autorizado, instalado só na primeira tarefa que usar ícone.
- **DF-12:** `Sair` no bloco de usuário; sino omitido. **DF-22:** responsividade.
- **DF-14 (responsável, 2026-11-11):** a validação integrada real é obrigatória antes da entrega
  final (publicação em `main` e na Vercel), mas não é pré-condição para declarar esta spec PRONTA.
  A spec pode ser PRONTA com os critérios comprovados, lint, typecheck, testes e build aprovados, o
  E2E previsto aprovado (tRPC simulado vale no desenvolvimento) e `Veredito: PRONTA` do
  `verificador-spec` no commit exato. Roteiro: `docs/VALIDACAO-INTEGRADA.md`.
