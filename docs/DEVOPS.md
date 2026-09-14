# DevOps — Passo 0

## Objetivo

Estabelecer controles de repositório e de entrega antes da primeira feature, sem criar infraestrutura de aplicação, banco ou credenciais.

## Fluxo de entrega

```text
branch curta → pull request → Architecture checks → revisão → main → Vercel
                                              └→ migrate-production (manual e protegido)
```

## Controles configurados

| Controle | Implementação | Estado no passo 0 |
| --- | --- | --- |
| Verificação de arquitetura | `.github/workflows/architecture.yml` | Ativa em PR e `main` |
| Detecção de segredos | Gitleaks no workflow | Ativa |
| Proteção de `.env` | `.gitignore` + validação no CI | Ativa |
| Atualização de dependências | Dependabot semanal | Preparada |
| Mudança de banco | workflow manual no Environment `production` | Preparada; sem banco |
| Deploy de aplicação | Vercel | Não conectado; sem aplicação |
| Observabilidade | Sentry | Não conectado; sem DSN |

## Configuração pendente e deliberada

Antes do primeiro deploy, o responsável deve:

1. Conectar o projeto Vercel ao repositório e cadastrar as variáveis do `.env.example` por ambiente.
2. Criar o projeto Supabase em `sa-east-1`, sem versionar credenciais.
3. Criar o Environment `production` no GitHub, restringir aprovação a responsáveis e cadastrar `DATABASE_URL` e `DIRECT_URL` nele.
4. Habilitar proteção de `main`: pull request obrigatório, uma aprovação, conversas resolvidas e status check `Documentation and secret guard`.
5. Configurar a integração do Sentry depois da feature que introduzir o runtime.

O workflow de migrations não dispara automaticamente. Ele só é executável manualmente, com confirmação literal `APPLY`, e usa o Environment protegido. A primeira configuração não inclui deploy ou migration porque ainda não existe aplicação nem schema.

## Política operacional

- Não há deploy direto a partir de branches de feature.
- Migrations entram somente após uma spec aprovada e são aplicadas uma vez por execução explícita.
- `DATABASE_URL`, `DIRECT_URL`, `SUPABASE_SERVICE_ROLE_KEY` e tokens Sentry são secretos e exclusivos de servidor.
- Uma alteração que necessite novas variáveis deve atualizar `.env.example`, a documentação e o ambiente do provedor na mesma entrega.
