# EmpresTI

Sistema interno para controlar o empréstimo de equipamentos de TI — notebooks, monitores, cabos e
câmeras —, substituindo a planilha compartilhada por um fluxo com regras, prazos e auditoria.

> **Estado em 2026-11-12:** a versão 1 do produto (Specs 001 a 008) está publicada em produção a
> partir de `main` (commit `8e08040`, PR #98). A Spec 009 (cabeçalhos de segurança, CSP e limite de
> requisições) está em desenvolvimento em `develop` e ainda não foi publicada. O estado detalhado,
> com evidências e pendências, está em [ENTREGA.md](ENTREGA.md) e em
> [docs/VALIDACAO-INTEGRADA.md](docs/VALIDACAO-INTEGRADA.md).

## Problema

O controle de quem pegou qual equipamento era feito numa planilha: ninguém sabia o que estava
disponível, itens sumiam e a devolução só era registrada se alguém lembrasse de atualizar a linha
([PRD](docs/PRD.md)).

## Objetivo

Dar ao colaborador um catálogo com a situação real de cada item e um pedido de empréstimo com prazo
claro, e dar a Operações uma visão de quem está com o quê, com devolução no balcão e cadastro de
equipamentos. O indicador de sucesso do PRD — Operações abandonar a planilha depois de duas semanas
de uso — depende de uso real e é acompanhado à parte (ver [ENTREGA.md](ENTREGA.md)).

## Funcionalidades

| Funcionalidade | Perfil | Spec |
|---|---|---|
| Login com Supabase Auth, sessão em cookie `httpOnly` e Sair | todos | [001](docs/specs/001-login/spec.md), [003](docs/specs/003-sessao-autorizacao/spec.md) |
| Navegação por papel e bloqueio de rotas de Operações | todos | [003](docs/specs/003-sessao-autorizacao/spec.md) |
| Catálogo com fotografias, situação, filtros por categoria e "Só disponíveis" | todos | [004](docs/specs/004-catalogo/spec.md) |
| Detalhe do equipamento e solicitação com prazo de 14 dias | colaborador | [005](docs/specs/005-solicitacao-emprestimo/spec.md) |
| Limite de 3 itens e bloqueio por atraso, também na API | colaborador | [006](docs/specs/006-regras-emprestimo/spec.md) |
| Meus empréstimos, barra de prazo, devolução e histórico | colaborador | [007](docs/specs/007-meus-emprestimos-devolucao/spec.md) |
| Painel de empréstimos em aberto, indicadores, filtros, devolução no balcão, cadastro e situação | Operações | [008](docs/specs/008-operacoes/spec.md) |
| Cabeçalhos HTTP, CSP com nonce e limite de requisições | todos | [009](docs/specs/009-seguranca-http-rate-limit/spec.md) — em desenvolvimento |

Os dados iniciais (tenant `suporte_ti`, 12 equipamentos com fotografia, TI-0004 e TI-0007 em
manutenção) são da [Spec 002](docs/specs/002-dados-iniciais/spec.md).

## Regras de negócio

Definidas por Operações no [PRD](docs/PRD.md) e aplicadas no servidor:

- no máximo **3 itens** com a mesma pessoa ao mesmo tempo;
- prazo padrão de devolução de **14 dias corridos**, contados na data de São Paulo;
- quem tem **item em atraso** não pode pegar outro emprestado;
- equipamento **em manutenção** não aparece como disponível e não pode ser solicitado;
- duas solicitações simultâneas do mesmo item resultam em um único empréstimo.

Fora da versão 1: reserva com data futura, notificação por e-mail e importação da planilha.

## Perfis

- **Colaborador:** vê o catálogo, solicita itens disponíveis, acompanha e devolve os próprios
  empréstimos. Não vê quem está com cada item nem dados internos do equipamento.
- **Operações:** tudo o que o colaborador vê, mais o painel de empréstimos em aberto do tenant,
  devolução no balcão, cadastro de equipamentos e alteração de situação.

## Demonstração

- Aplicação: <https://empresti-self.vercel.app/> (alternativa:
  <https://empresti-theo-escola.vercel.app/>, mesmo deploy).
- Contas de demonstração: `colaborador@empresti.test` (Colaborador) e `operacoes@empresti.test`
  (Operações). As senhas **não estão no repositório**: o responsável as entrega ao avaliador por
  canal privado.
- Roteiro de avaliação: [ENTREGA.md](ENTREGA.md).

## Tecnologias e arquitetura

Decididas no [ADR-001](docs/adr/001-stack.md) (vinculante):

| Área | Decisão |
|---|---|
| Aplicação | Monólito Next.js 16 (App Router) + TypeScript `strict` |
| Interface | React 19, Tailwind CSS 4, componentes shadcn/ui (Radix), React Hook Form + Zod |
| API | tRPC 11 em `app/api/trpc/[trpc]/route.ts`; camadas Router → Service → Prisma |
| Dados | PostgreSQL no Supabase, Prisma 7 e Prisma Migrate |
| Identidade | Supabase Auth, sessão em cookies `httpOnly` lidos no servidor |
| Isolamento | `tenant_id` em toda tabela de domínio, tenant derivado da sessão; RLS deny-by-default |
| Qualidade | Vitest, Testing Library, PostgreSQL real em container e Playwright |
| Entrega | GitHub Actions, Vercel e workflow manual e protegido de migrations |

```text
Navegador ──tRPC/HTTP──▶ Route Handler (Next.js na Vercel)
                           ├─ contexto: sessão Supabase (cookie httpOnly) → usuário, papel, tenant
                           ├─ routers por domínio: equipamentos, emprestimos, operacoes, sessao
                           └─ services ──Prisma──▶ PostgreSQL (Supabase)   [RLS nega anon/authenticated]
Fotografias ◀── bucket público `equipamentos` do Supabase Storage
```

O navegador nunca fala direto com as tabelas: todo acesso passa pelo servidor, e as policies do
banco negam `anon` e `authenticated`. Solicitação, devolução, cadastro e alteração de situação gravam
auditoria com o ator.

## Execução local

Requisitos: Node.js 22 ou superior e npm; Docker para os testes com banco real.

```bash
npm ci
```

```bash
npm run dev
```

Copie `.env.example` para `.env.local` e preencha com valores de desenvolvimento fornecidos pelo
responsável; nunca use valores de produção nem versione `.env*`. Variáveis `NEXT_PUBLIC_*` podem
chegar ao navegador; as demais são exclusivas do servidor ([rules/secrets.md](rules/secrets.md)).

Nesta pasta, não use `npx` (o `&` do caminho quebra o comando): use os scripts `npm run …`.

## Testes

| Comando | O que roda |
|---|---|
| `npm run lint` · `npm run typecheck` | ESLint e TypeScript |
| `npm test` | Vitest: unidades, componentes, procedimentos tRPC e testes com PostgreSQL real em container (exigem Docker) |
| `npm run test:e2e` | Playwright contra `npm run dev`, com tRPC simulado |
| `npm run test:e2e:producao` | Playwright contra `next build` + `next start` (CSP de produção) |
| `npm run build` | Build de produção |

Todo teste cita no nome o critério de aceitação que prova (`CA-<FEATURE>-xx`), conforme
[rules/tests.md](rules/tests.md). O CI (`Architecture checks`) roda guarda documental, Gitleaks,
lint, typecheck, testes e build em todo PR e push em `develop` e `main`.

## Processo

SDD repo-native: `SPEC → aprovação → PLAN → TASKS → aprovação → CODE`, uma tarefa por commit, PRs
pequenos para `develop` e promoção para `main` só pelo responsável. Cada spec é conferida por um
subagente verificador independente antes de ser declarada `PRONTA` (`verificacao.md` de cada spec).
Regras para agentes em [AGENTS.md](AGENTS.md) e [rules/](rules/).

## Documentação

- [ENTREGA.md](ENTREGA.md) — documento de entrega, evidências e roteiro de avaliação.
- [PRD](docs/PRD.md) — problema, público, escopo e regras.
- [ADRs](docs/adr/README.md) — decisões técnicas ([ADR-001](docs/adr/001-stack.md)).
- [Specs](docs/specs/) — uma pasta por funcionalidade, com spec, plano, tarefas e verificação.
- [Validação integrada](docs/VALIDACAO-INTEGRADA.md) — roteiro e registro da validação real.
- [DevOps](docs/DEVOPS.md) — ambientes, CI/CD, migrations e pendências do responsável.
- [Layout](docs/layout.md) — design system Nocturne.
- [SECURITY.md](SECURITY.md) e [rules/restrictions.md](rules/restrictions.md) — segurança e limites.

## Licença

Ainda não definida. Nenhum uso, redistribuição ou publicação além do contexto autorizado deve ser
presumido.
