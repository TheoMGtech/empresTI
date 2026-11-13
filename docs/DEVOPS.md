# DevOps — ambientes, entrega e pendências

> leitor: responsável e agente. Estado conferido em 2026-11-12 (GitHub, Vercel por status de commit,
> banco por consulta somente leitura). Pendências permanentes do responsável ficam na última seção.

## Fluxo de entrega

```text
feature/<nome> → PR → Architecture checks → squash em develop
                                              └→ branch de release a partir de main com a árvore aprovada
                                                  → PR para main (merge só pelo responsável) → Vercel Production
migrate-production: manual, confirmação APPLY, Environment protegido `production`
```

Como as promoções entram em `main` por squash, `develop` e `main` têm históricos diferentes e um PR
direto `develop` → `main` gera conflito. A promoção usa uma branch criada a partir de `main` com a
árvore aprovada (`git read-tree -u --reset <commit>`), conferida com `git diff <commit> HEAD` vazio.
O release de 2026-11-12 (PR #98) levou as Specs 003 a 008 e excluiu de propósito o código da Spec 009.

## Ambientes

| Ambiente | Origem | Endereço | Estado em 2026-11-12 |
|---|---|---|---|
| Produção | `main` | `empresti-self.vercel.app` e `empresti-theo-escola.vercel.app` (mesmo deploy) | `8e08040` (PR #98, árvore `3aa331e`); status Vercel `success`; as duas URLs respondem 200; `tecnico.status` com `bancoOperacional: true` |
| Integração | `develop` | `empresti-git-develop-theo-escola.vercel.app` | `f02d7ca` em 2026-11-13 (T-SEG-11 da Spec 009); CI verde. Login e as cinco mutações cobertas exigem `CHAVE_HMAC_LIMITES` em Preview (ver "Spec 009") |
| Preview | cada branch e PR | URL gerada pela Vercel | Automático |
| Local | máquina do desenvolvedor | `http://localhost:3000` | `npm run dev`; testes de banco usam PostgreSQL em container (Docker) |

O domínio `empresti.vercel.app` não aponta para este projeto.

## Controles

| Controle | Implementação | Estado |
|---|---|---|
| CI | `.github/workflows/architecture.yml` (`Architecture checks`) | Em PR e push de `develop` e `main`: `Documentation and secret guard` (Gitleaks, `.env` fora do Git) e `Application quality` (lint, typecheck, Vitest com banco em container, build) |
| Proteção de branches | GitHub | `main` e `develop` exigem PR, histórico linear e o check `Documentation and secret guard` |
| Migrations de produção | `.github/workflows/migrate-production.yml` | Só `workflow_dispatch`, confirmação literal `APPLY`, Environment `production` com revisor obrigatório e política de branches |
| Dependências | Dependabot semanal | PRs para `develop` (npm e GitHub Actions) |
| Banco | Supabase `InovacaoTecnologia` (`wdudlqacomnasnrxgbni`) | PostgreSQL com RLS em todas as tabelas de `public` |
| Aplicação | Vercel, time `theo-escola`, projeto `empresti` | Integração GitHub; produção a partir de `main` |
| Observabilidade | Sentry | Não conectado (sem DSN) |

## Banco de produção

- **Migrations:** 7 aplicadas, todas pela execução `43288501845` do `migrate-production`
  (2026-11-12, a partir de `develop` em `d5914ca`, aprovada pelo responsável). Os checksums gravados
  em `_prisma_migrations` conferem com os arquivos versionados. A 7ª
  (`20261112174149_criar_limites_requisicao`) pertence à Spec 009 e já está aplicada, embora o código
  que a usa ainda não esteja em `main`. O próximo release não deve reaplicá-la: `migrate deploy`
  reconhece as já registradas.
- **Dados:** tenant `suporte_ti`; 12 equipamentos (TI-0004 e TI-0007 `em_manutencao`), todos com
  fotografia no bucket público `equipamentos` (12 objetos); 2 vínculos (`colaborador` e
  `operacoes`), ambos com `nome_exibicao` vazio.
- **Acesso:** toda tabela de `public` tem RLS; as tabelas de domínio têm policies que negam `anon` e
  `authenticated` (`USING false`); `_prisma_migrations` tem RLS sem policy (nega por padrão) e
  `limites_requisicao` também revoga os privilégios. A aplicação acessa o banco só pelo servidor.

## Variáveis de ambiente

Os nomes estão em `.env.example`, sem valores. Regra completa em `rules/secrets.md`. O Environment
`production` do GitHub tem só `DATABASE_URL` e `DIRECT_URL` (conferido pelos nomes em 2026-11-12),
com política de branches `main` e `develop`. O cadastro na Vercel é do responsável e não é lido pelo
agente; o funcionamento da produção (login, banco e catálogo) indica que as variáveis de runtime
existem lá.

| Variável | Onde | Observação |
|---|---|---|
| `NEXT_PUBLIC_APP_URL`, `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | Vercel (Preview e Production) | Públicas por definição |
| `SUPABASE_PROJECT_REF` | Vercel | Identificador, não segredo |
| `DATABASE_URL` (pooler, runtime) e `DIRECT_URL` (migrations) | Vercel; `DATABASE_URL` e `DIRECT_URL` no Environment `production` do GitHub | Segredos de servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Vercel | Segredo de servidor; nunca com prefixo público |
| `CHAVE_HMAC_LIMITES` | Vercel, por ambiente | Exigida pelo código da Spec 009; precisa existir antes do release que a publicar |
| `SENTRY_*` | — | Sem uso enquanto o Sentry não for conectado |
| `PIXABAY_API_KEY` | só `.env.pixabay.local` | Ferramenta local, não vai à Vercel |

### Spec 009 — limite de requisições

Desde a T-SEG-09 (PR #107), o código de `develop` limita o login e, desde a T-SEG-10 (PR #108), as
cinco mutações cobertas. Sem `CHAVE_HMAC_LIMITES` no ambiente, ou sem a tabela
`limites_requisicao`, essas operações respondem 503 (fail-closed, decisão Q7); consultas e `sair`
continuam respondendo. A tabela já existe em produção (seção "Banco de produção").

- **`CHAVE_HMAC_LIMITES`:** variável sensível na Vercel, com valores diferentes em Preview e em
  Production, gerada localmente pelo responsável
  (`node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`) e nunca colada
  em chat, arquivo versionado ou log. Mínimo de 32 caracteres. Trocar a chave zera, na prática, os
  contadores em andamento.
- **Desenvolvimento local:** para entrar de verdade em `npm run dev`, o responsável põe a chave no
  próprio `.env.local`. Os testes usam o valor fictício de `src/test/setup.ts` e não precisam dela.
- **Environment `production`:** aceita só `main` e `develop` (ajuste obrigatório 2, opção 1). Ele
  controla só o workflow de migration: `develop` não publica a aplicação em produção, e a Vercel
  continua publicando produção apenas a partir de `main`. Essa política não autoriza o agente a
  alterar o Environment nem a executar o workflow.
- **IP confiável:** só `x-forwarded-for` com `VERCEL=1`. Fora da Vercel, ou sem o cabeçalho, todas
  as tentativas dividem o identificador `ip-indisponivel` (bloqueio coletivo aceito em P3).

Configurações do preview que dependem do responsável (o agente não as decide):

- Para qual banco apontam `DATABASE_URL` e `DIRECT_URL` no ambiente Preview da Vercel. Hoje, salvo
  outra decisão, é o de produção, e o preview grava nele.
- Se a validação integrada usa o tenant `suporte_ti` ou um tenant separado de validação. O
  provisionamento de tenant é decisão pendente no ADR-001.
- As contas de validação (`colaborador` e `operacoes`) usadas nos testes de limite do preview, que
  não são contas reais de colaborador.

Regras de isolamento da validação no preview: `docs/VALIDACAO-INTEGRADA.md`, item 9.1.

## Processo de release

1. Atualizar as referências remotas e identificar o commit aprovado de `develop`.
2. Comparar migrations do commit com `_prisma_migrations` (nome e checksum) por consulta somente
   leitura; migration nova só pelo `migrate-production`, com autorização do responsável.
3. Criar a branch de release a partir de `main` com a árvore aprovada e conferir `git diff` vazio.
4. Abrir o PR para `main`, aguardar os checks e entregar o resultado ao responsável.
5. Depois do merge do responsável: conferir o commit e a árvore de `main`, o status `Vercel` do
   commit, as duas URLs, `tecnico.status` e os smoke tests de `docs/VALIDACAO-INTEGRADA.md`.

## Restrições de produção

- Agente não faz merge em `main`, não roda deploy manual, não altera a Vercel nem o Supabase remoto e
  não executa `migrate-production` (`rules/restrictions.md`).
- O MCP do Supabase é somente leitura (`.mcp.json`).
- Testes de carga, força bruta, concorrência ou manipulação de datas não rodam contra produção:
  rodam no PostgreSQL em container dos testes.

## Pendências do responsável

1. Confirmar no painel do Supabase Auth que o cadastro público está desabilitado
   (`disable_signup`), conforme RS-LOGIN-04 da Spec 001. Não é verificável pelo MCP somente leitura.
2. Confirmar se a Data API expõe o schema `public`. As policies negam o acesso, mas retirar `public`
   dos schemas expostos reduz a superfície.
3. Cadastrar `CHAVE_HMAC_LIMITES` na Vercel (Preview e Production, valores diferentes) antes do
   release da Spec 009. Enquanto faltar em Preview, o login e as cinco mutações do preview de
   `develop` respondem 503. Decidir também o banco do Preview, o tenant e as contas de validação
   (seção "Spec 009 — limite de requisições").
4. Decidir os PRs abertos do Dependabot (#37, #38, #39, #101, #102), todos com CI verde em 2026-11-12.
5. Avaliar tornar `Application quality` um check obrigatório em `main` e `develop`; hoje só
   `Documentation and secret guard` é exigido, e o CI não roda Playwright.
6. Conectar o Sentry quando decidido; até lá não há observabilidade de erros em produção além dos
   logs da Vercel.
7. Preencher `nome_exibicao` das contas de demonstração, se desejado (`prisma/vincular-professor.ts`).
8. Alinhar a ordem das paradas do fluxo SDD entre `rules/spec-flow.md` e `AGENTS.md`.
9. Atualizar o "Estado atual" de `AGENTS.md`, que ainda descreve o projeto na fase do login e diz que
   não há banco local (os testes já usam PostgreSQL em container).

## Credenciais de ferramentas locais

**`PIXABAY_API_KEY`** — autentica as buscas dos scripts locais da skill `imagens-equipamentos`.
Fica em `.env.pixabay.local` (ignorado pelo Git), cadastrada pelo responsável em editor de texto;
o agente não cria, não lê e não revela o arquivo; não vai à Vercel; nunca aparece em comandos,
chats ou arquivos versionados.

**Contas de demonstração para E2E** — as senhas das contas `colaborador@empresti.test` e
`operacoes@empresti.test` ficam só em arquivo local ignorado pelo Git, lido pelo Playwright sem
imprimir valores. O registro desta exceção em `rules/secrets.md` depende de decisão do responsável.
