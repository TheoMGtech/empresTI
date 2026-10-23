# DevOps — Passo 0

## Objetivo

Estabelecer controles de repositório e de entrega antes da primeira feature, sem criar infraestrutura de aplicação, banco ou credenciais. A tabela abaixo registra o estado atual desses controles.

## Fluxo de entrega

```text
branch curta → pull request → Architecture checks → develop
                                                    └→ PR autorizado → main → Vercel
                                                           └→ migrate-production (manual e protegido)
```

## Controles configurados

| Controle | Implementação | Estado em 2026-10-23 |
| --- | --- | --- |
| Verificação de arquitetura | `.github/workflows/architecture.yml` | Ativa em PR, `develop` e `main`; jobs `Documentation and secret guard` (obrigatório) e `Application quality` (lint, typecheck, testes e build) |
| Detecção de segredos | Gitleaks no workflow | Ativa |
| Proteção de `.env` | `.gitignore` + validação no CI | Ativa |
| Atualização de dependências | Dependabot semanal | Ativa; PRs para `develop` (npm e GitHub Actions) |
| Banco de dados | Supabase `InovacaoTecnologia` (`wdudlqacomnasnrxgbni`) | Projeto criado e integrado ao GitHub (check `Supabase Preview`) |
| Mudança de banco | workflow manual no Environment `production` | Workflow pronto; Environment não criado; migration `20261023110257_criar_saude_sistema` não aplicada em produção |
| Deploy de aplicação | Vercel, time `theo-escola`, projeto `empresti` | Conectado; produção a partir de `main` em `empresti-self.vercel.app` e `empresti-theo-escola.vercel.app` (mesmo deploy), com o login publicado pelo PR #14; `develop` em `empresti-git-develop-theo-escola.vercel.app`; previews por branch |
| Observabilidade | Sentry | Não conectado; sem DSN |

## Configuração pendente e deliberada

Itens sob responsabilidade do responsável:

1. ~~Conectar o projeto Vercel ao repositório~~ — concluído. Falta confirmar que
   todas as variáveis do `.env.example` necessárias ao runtime, em especial
   `DATABASE_URL`, estão cadastradas por ambiente.
2. ~~Criar o projeto Supabase~~ — concluído (`wdudlqacomnasnrxgbni`), sem
   credenciais versionadas.
3. Criar o Environment `production` no GitHub, restringir aprovação a responsáveis e cadastrar `DATABASE_URL` e `DIRECT_URL` nele. **Pendente**: sem ele, a migration do andar zero não pode ser aplicada e a produção não consulta o banco (`tecnico.status` responde `bancoOperacional: false`). O login não depende do banco.
4. ~~Criar e proteger `develop`~~ — concluído: `main` e `develop` exigem pull
   request, histórico linear e o status check `Documentation and secret guard`.
5. Configurar a integração do Sentry depois da feature que introduzir o runtime.

O workflow de migrations não dispara automaticamente. Ele só é executável manualmente, com confirmação literal `APPLY`, e usa o Environment protegido. Ele ainda não foi executado; o Environment `production` precisa existir com proteção antes da primeira execução, pois o GitHub criaria um Environment sem proteção se o workflow rodasse antes.

## Política operacional

- Não há deploy direto a partir de branches de feature.
- Branches de feature partem de `develop`; Dependabot também propõe atualizações
  para `develop`.
- O agente pode integrar PR próprio em `develop` após CI verde. Somente o
  responsável autoriza e realiza o merge em `main`.
- Como as promoções entram em `main` por squash, `develop` e `main` têm
  históricos diferentes e um PR direto `develop` → `main` gera conflito. A
  promoção do login (PR #14) usou uma branch criada a partir de `main` com a
  árvore exata de `develop` (`git read-tree -u --reset origin/develop`),
  conferida com `git diff origin/develop HEAD` vazio.
- Migrations entram somente após uma spec aprovada e são aplicadas uma vez por execução explícita.
- `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY` e tokens Sentry são secretos e exclusivos de servidor.
- Uma alteração que necessite novas variáveis deve atualizar `.env.example`, a documentação e o ambiente do provedor na mesma entrega.
