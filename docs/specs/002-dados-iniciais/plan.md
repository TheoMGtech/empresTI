# Plano — dados iniciais: tenant, equipamentos e vínculo do professor

## Estado

**Status:** APROVADO COM CONDIÇÕES — pelo responsável, em 2026-11-10. Spec de
referência: `spec.md`, aprovada em 2026-11-10.

O plano aprovado não autoriza executar todas as tarefas. Condições vigentes:

- Só `T-DADOS-01` está autorizada. Cada tarefa seguinte depende de autorização própria.
- As migrations de `T-DADOS-03` e `T-DADOS-05` não estão autorizadas. O DDL de cada uma
  passa por revisão específica antes da execução.
- Geração, reset e aplicação de migrations pela CLI são do responsável, com conferência
  do destino antes de cada execução.
- O workflow de carga em produção não está autorizado.

## Restrições e skills

- **ADR-001:** §5 (Prisma Migrate como dono único, policies e triggers em SQL na
  migration, `prisma/seed.ts`), §6 (`tenant_id`, `memberships`), §7 (RLS deny by default,
  Prisma ignora RLS), §8 (Testcontainers, sem mock do Prisma para banco), §10 (auditoria).
- **Regras:** `rules/migration.md`, `rules/checks.md`, `rules/tests.md`,
  `rules/secrets.md`, `rules/restrictions.md`, `rules/operacao.md`.
- **Skills:** `supabase` e `supabase-postgres-best-practices`, ao escrever SQL, RLS e a
  leitura de `auth.users`.
- **Dependências:** nenhuma nova. `testcontainers`, `pg`, `zod`, `@prisma/client` e
  `@prisma/adapter-pg` já estão instalados. `@testcontainers/postgresql` não está e não é
  necessário: `GenericContainer` basta.

## Ambiente verificado (D11)

| Ambiente | Node | Remoção de tipos |
|---|---|---|
| Local | 24.14.1 | Habilitada por padrão |
| CI (`Application quality`, run 42903819974) | 22.23.4 | Habilitada por padrão desde 22.18.0, conforme a documentação do Node |

O comando previsto é `node prisma/seed.ts`, sem `tsx`. Consequências:

- Importações relativas estáticas com extensão `.ts` exigem
  `allowImportingTsExtensions` no `tsconfig.json`. A necessidade só surge quando
  `prisma/seed.ts` importar outro arquivo `.ts`. Essa mudança será demonstrada e
  autorizada na tarefa que a exigir, e `T-DADOS-01` não a faz.
- Sem `enum` TypeScript, sem aliases `@/` e com `import type` explícito.
- `engines` em `package.json` aceita `>=22.0.0`, abaixo do mínimo real de 22.18.0. Como a
  Vercel usa esse campo para escolher o Node, alterá-lo tem impacto em deploy e depende
  de autorização própria. `T-DADOS-01` não o altera.
- `T-DADOS-01` prova a importação de `@prisma/client` nesse modo com teste que executa um
  arquivo `.ts` real. O teste roda localmente em Node 24 e roda em Node 22 no CI quando
  houver PR, porque o workflow não dispara em push de branch de feature. Se o import
  nomeado falhar, usa-se o import padrão, sem dependência nova.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/test/banco-real.ts` e `.test.ts` | Sobe Postgres descartável e aplica migrations | 01 |
| `src/test/sonda-typescript.ts` e auxiliar | Provam a execução TypeScript com `node` | 01 |
| `scripts/banco-local.mjs` | Roda `prisma:migrate` e `prisma:reset` contra container local, com conferência do destino | Antes da 03, com autorização própria |
| `tsconfig.json`, `vitest.config.ts`, `package.json` | Extensão `.ts`, inclusão de `prisma/`, lint e scripts | Na tarefa que exigir, com demonstração e autorização |
| `prisma/rotinas/guarda-banco.ts` | Recusa banco remoto sem confirmação | 02 |
| `prisma/schema.prisma` | Modelos e enums | 03, 05 |
| `prisma/migrations/<ts>_criar_estrutura_dominio/` | Tenants, memberships, equipamentos, RLS | 03 |
| `prisma/migrations/<ts>_criar_auditoria/` | Auditoria, RLS e triggers | 05 |
| `prisma/rotinas/manifesto.ts` | Valida e extrai o manifesto | 06 |
| `prisma/rotinas/carga-inicial.ts` | Tabela das 12 situações iniciais | 07 |
| `prisma/seed.ts` | Carga | 07, 08 |
| `prisma/rotinas/identidade.ts` | Verifica a identidade | 09 |
| `prisma/vincular-professor.ts` | Rotina de vínculo | 10 |
| `prisma/*.test.ts`, `prisma/rotinas/*.test.ts` | Testes | 01 a 11 |

## Banco real de teste

`src/test/banco-real.ts` usa `GenericContainer` com a imagem oficial de versão fixa
`postgres:17.6-alpine`:

1. Remove `DATABASE_URL` e `DIRECT_URL` de `process.env` antes de tudo.
2. Sobe o container com senha aleatória gerada em execução, nunca versionada.
3. Faz o bootstrap como superusuário:
   - cria `anon` e `authenticated` (NOLOGIN), exigidos pela migration existente;
   - cria o papel dono `empresti_dono` (LOGIN, NOSUPERUSER, CREATEDB), que representa o
     papel do Prisma, dono das tabelas, para o qual RLS não vale;
   - concede `anon` e `authenticated` ao dono, permitindo `SET ROLE` nos testes;
   - concede `USAGE` no schema e privilégios padrão sobre tabelas a `anon` e
     `authenticated`. Sem isso, o teste receberia "permissão negada" antes de chegar à
     RLS e não provaria a policy.
4. Aplica cada `prisma/migrations/*/migration.sql` em ordem, como `empresti_dono`, num
   banco modelo. Cada teste recebe um banco novo copiado do modelo.
5. Recusa qualquer host que não seja local.

Os testes de banco declaram `// @vitest-environment node` e `hookTimeout` próprio, porque
o `testTimeout` de 20 s é curto para subir container. Sem Docker, a suíte **falha** com
mensagem clara: nunca é ignorada, para não gerar falso verde.

Aplicar o SQL diretamente, em vez de chamar a CLI do Prisma, mantém `npm test` sem o
comando barrado pelo hook e funciona igual no CI.

## Estrutura de dados

DDL **proposto**. A tarefa reapresenta o DDL final e para, conforme `rules/migration.md`.

### Migration `criar_estrutura_dominio` (T-DADOS-03)

```sql
CREATE TYPE "categoria_equipamento" AS ENUM ('notebook', 'monitor', 'cabo', 'camera');
CREATE TYPE "situacao_equipamento" AS ENUM ('ativo', 'em_manutencao', 'fora_de_uso');
CREATE TYPE "papel_membership" AS ENUM ('colaborador', 'operacoes');

CREATE TABLE "tenants" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "slug" TEXT NOT NULL UNIQUE CHECK (length(trim("slug")) > 0),
  "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE "memberships" (
  "user_id" UUID NOT NULL,
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "role" "papel_membership" NOT NULL,
  "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY ("user_id", "tenant_id")
);
CREATE INDEX "memberships_tenant_id_idx" ON "memberships"("tenant_id");

CREATE TABLE "equipamentos" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "patrimonio" TEXT NOT NULL CHECK (length(trim("patrimonio")) > 0),
  "nome" TEXT NOT NULL CHECK (length(trim("nome")) > 0),
  "categoria" "categoria_equipamento" NOT NULL,
  "situacao" "situacao_equipamento" NOT NULL DEFAULT 'ativo',
  "imagem_caminho" TEXT,
  "imagem_sha256" TEXT CHECK ("imagem_sha256" ~ '^[0-9a-f]{64}$'),
  "criado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "atualizado_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "equipamentos_tenant_patrimonio_key" UNIQUE ("tenant_id", "patrimonio"),
  CONSTRAINT "equipamentos_imagem_completa"
    CHECK (("imagem_caminho" IS NULL) = ("imagem_sha256" IS NULL))
);
CREATE INDEX "equipamentos_tenant_situacao_idx" ON "equipamentos"("tenant_id", "situacao");

ALTER TABLE "tenants" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "memberships" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "equipamentos" ENABLE ROW LEVEL SECURITY;
-- Em cada tabela, no padrão de saude_sistema:
-- CREATE POLICY "<tabela>_negar_anon" ON "<tabela>" FOR ALL TO anon
--   USING (false) WITH CHECK (false);
-- CREATE POLICY "<tabela>_negar_authenticated" ON "<tabela>" FOR ALL TO authenticated
--   USING (false) WITH CHECK (false);
```

As tabelas são novas, portanto não há linhas existentes a tratar. `saude_sistema` não
muda. Os campos de imagem são opcionais para não impedir equipamentos futuros
(RN-DADOS-08). Não há FK para `auth.users` (D10).

## Segurança e auditoria

### Migration `criar_auditoria` (T-DADOS-05)

```sql
CREATE TABLE "auditoria" (
  "id" UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  "tenant_id" UUID NOT NULL REFERENCES "tenants"("id") ON DELETE RESTRICT,
  "ator" TEXT NOT NULL CHECK (length(trim("ator")) > 0),
  "acao" TEXT NOT NULL CHECK (length(trim("acao")) > 0),
  "recurso" TEXT NOT NULL CHECK (length(trim("recurso")) > 0),
  "ocorrido_em" TIMESTAMPTZ(6) NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE INDEX "auditoria_tenant_ocorrido_idx" ON "auditoria"("tenant_id", "ocorrido_em");

CREATE FUNCTION "auditoria_bloquear_mutacao"() RETURNS trigger
  LANGUAGE plpgsql SECURITY INVOKER SET search_path = ''
AS $$
BEGIN
  RAISE EXCEPTION 'auditoria é append-only';
END;
$$;
REVOKE ALL ON FUNCTION "auditoria_bloquear_mutacao"() FROM PUBLIC, anon, authenticated;

CREATE TRIGGER "auditoria_sem_alteracao" BEFORE UPDATE OR DELETE ON "auditoria"
  FOR EACH ROW EXECUTE FUNCTION "auditoria_bloquear_mutacao"();
CREATE TRIGGER "auditoria_sem_truncate" BEFORE TRUNCATE ON "auditoria"
  FOR EACH STATEMENT EXECUTE FUNCTION "auditoria_bloquear_mutacao"();

ALTER TABLE "auditoria" ENABLE ROW LEVEL SECURITY;
-- Policies de negação para anon e authenticated, como nas demais tabelas.
```

**Por que trigger (D15):** o papel do Prisma é dono da tabela e ignora RLS, e um dono
pode devolver a si mesmo privilégios revogados. Trigger dispara para todos os papéis,
inclusive o dono. O teste conecta como `empresti_dono`, não superusuário.

**Limite aceito:** um dono ainda pode desabilitar o trigger por DDL. Isso só acontece por
migration, que passa por revisão.

**Sem produtores:** nada nesta spec insere em `auditoria`. O teste insere linhas só para
provar o append-only.

## Carga idempotente e não destrutiva

`prisma/seed.ts`, em uma única transação:

1. `garantirBancoPermitido` (seção "Proteção contra produção").
2. Lê e valida o manifesto antes de abrir a transação: estado `aprovado` ou posterior, 12
   itens, IDs únicos, `aprovacao_humana.sha256_aprovado` igual a `arquivo.sha256`,
   `storage.destino_planejado` igual a `equipamentos/<nome_relativo>`. Não usa
   `validarManifesto` da skill, que exige os JPEGs locais e depende de `sharp`.
3. Garante o tenant com criação que ignora conflito em `slug`.
4. Lê os registros existentes **só dos 12 patrimônios** e compara caminho e SHA-256. Se
   algum estiver ausente ou divergir, lança erro e a transação inteira é desfeita.
5. Cria os que faltam com `createMany` e `skipDuplicates`, usando nome e categoria do
   manifesto e situação da tabela de `carga-inicial.ts`.
6. Imprime só contagens: criados e preservados.

**Por que não sobrescreve:** o código não chama `update`, `upsert` nem `delete` em
equipamentos, e `skipDuplicates` traduz para `ON CONFLICT DO NOTHING`. Um teste estático
confirma a ausência dessas chamadas, e os testes de banco provam o comportamento. Outros
equipamentos não são lidos, o que atende CA-DADOS-12.

`item.situacao` do manifesto nunca é lido para definir a situação operacional. A tabela
de `carga-inicial.ts` tem as 12 entradas, e a carga falha se um ID do manifesto não
constar nela. O manifesto é somente leitura e continua em `aprovado`.

## Vínculo do professor

`prisma/vincular-professor.ts --user-id <uuid>`, executado só pelo responsável:

1. `garantirBancoPermitido`.
2. Valida o formato do UUID com Zod.
3. Verifica a identidade pela porta `ConsultaIdentidade`, injetada, no padrão de
   `ClienteSupabaseAutenticacao`.
4. Na mesma transação da verificação, cria o membership `colaborador` no tenant
   `suporte_ti`. O papel é fixo no código, sem argumento.
5. Membership idêntico: sem efeito. Papel diferente: aborta sem alterar.
6. Imprime só o resultado, por código, sem repetir o UUID.

**Consulta real:** leitura em `auth.users` pela mesma conexão, que não pede o e-mail nem
nenhuma coluna de credencial:

```sql
SELECT
  "email_confirmed_at" IS NOT NULL AS confirmado,
  "banned_until" IS NOT NULL AND "banned_until" > now() AS banido
FROM auth.users
WHERE "id" = $1::uuid AND "deleted_at" IS NULL;
```

| Condição (D17) | Comprovação | Falha |
|---|---|---|
| UUID válido | Zod | `UUID_INVALIDO` |
| Identidade existe | Linha retornada, sem exclusão lógica | `IDENTIDADE_INEXISTENTE` |
| E-mail confirmado | `email_confirmed_at` preenchido | `EMAIL_NAO_CONFIRMADO` |
| Não banida | `banned_until` nulo ou no passado | `IDENTIDADE_BANIDA` |

**Falha fechada:** antes da consulta, `information_schema.columns` confirma que as quatro
colunas existem. Coluna ausente ou falta de permissão resultam em
`IDENTIDADE_INDETERMINADA`, sem gravar nada.

**Por que SQL e não a Admin API:** a API exige uma segunda credencial, a chave de serviço,
no mesmo processo. Ela também costuma omitir campos nulos, o que impede distinguir "não
banido" de "campo inexistente".

**Conferência estrutural (D17), em 2026-11-10:** consulta somente leitura a
`information_schema.columns`, autorizada pelo responsável e sem ler linhas, confirmou no
banco real `id` (`uuid`, não nulo) e `email_confirmed_at`, `banned_until` e `deleted_at`
(`timestamp with time zone`, anuláveis).

**Impedimento remanescente (D17):** a permissão de leitura do papel usado por
`DIRECT_URL` não foi conferida, e a documentação do Supabase alerta que colunas geridas
por ele podem mudar. A falha fechada impede vínculo indevido, mas a rotina pode recusar
uma identidade válida se faltar essa permissão.

**Testes:** o banco de teste cria um `auth.users` mínimo só com as quatro colunas, com
UUIDs gerados em execução e datas fixas (`2000-01-01` e `2999-01-01`). Sem e-mail, sem
senha e sem acesso remoto.

## Proteção contra produção

| Camada | Medida |
|---|---|
| Testes | `banco-real.ts` remove as variáveis herdadas, gera a própria URL e recusa host não local |
| Rotinas | `garantirBancoPermitido` só aceita `localhost`, `127.0.0.1` e `::1`. Remoto exige `--confirmar-remoto=<host exato>` |
| Variáveis | Rotinas leem só `process.env`, sem carregar arquivos. O `.env.local` nunca é lido |
| `banco-local.mjs` | Sobrescreve `DATABASE_URL` e `DIRECT_URL` com a URL do container |
| Agente | O hook já barra `prisma migrate`, `prisma db` e a CLI do Supabase. O agente nunca passa `--confirmar-remoto` |
| CI | `Application quality` não recebe segredos de banco |

Nenhuma variável de ambiente nova é criada: a confirmação é argumento, o que evita a
regra dos três lugares de `rules/secrets.md`.

## Cumprimento de `rules/migration.md`

O agente não consegue gerar nem resetar migrations, por três barreiras independentes: o
hook do projeto, a proteção do Prisma contra agentes de IA e a exigência de terminal
interativo. As regras e o hook não mudam, e nenhuma dessas proteções será contornada. O
responsável executa esses comandos no próprio terminal, conferindo o destino antes de
cada execução. A tabela descreve o caminho previsto, que depende da autorização
específica das tarefas 03 e 05:

| Passo da regra | Como será cumprido |
|---|---|
| 1. DDL antes, e parar | A tarefa apresenta o DDL final e para |
| 2. `npm run prisma:migrate -- --name <nome>` | Responsável: `node scripts/banco-local.mjs prisma:migrate -- --name <nome> --create-only` |
| 3. RLS e policy na migration gerada | Agente acrescenta o SQL ao arquivo gerado, antes de qualquer aplicação |
| 4. Linhas existentes | Tabelas novas, sem linhas |
| 5. `npm run prisma:reset` no banco local e `npm test` | Responsável: `node scripts/banco-local.mjs prisma:reset`, e cola a última linha. O agente roda `npm test` |
| Verificação: reset em banco limpo | O container nasce vazio a cada execução |

**Decisão embutida:** isto trata o container descartável como "banco local". As regras
ficam intactas, mas `AGENTS.md` e `docs/DEVOPS.md` item 9 ainda dizem que esse banco não
existe. Atualizá-los fica para pedido separado.

## Cumprimento de `rules/checks.md`

| Passo | Como será cumprido |
|---|---|
| 1. Lint, typecheck, testes | Agente, em toda tarefa; `prisma/` entra no lint |
| 2. `test:e2e` | Não se aplica: nenhuma tela, rota ou fluxo (CA-DADOS-25) |
| 3. `prisma:reset` | Tarefas 03 e 05, pelo responsável, como acima |
| 4. Build antes de push | Agente |
| 5. `git status --short` | Agente; desfaz `next-env.d.ts` |
| 6. CA atendido | Citado na mensagem de commit e na resposta |

Nenhum teste aponta para banco remoto. `rules/tests.md` item 6 não se aplica: não há
procedimento novo. O isolamento é provado no nível de dados (CA-DADOS-04).

## Execução remota

Exclusiva do responsável, depois da integração e nesta ordem: criar e proteger o
Environment `production` → rodar `migrate-production` → desabilitar o cadastro público →
executar a carga → criar a identidade do professor → executar o vínculo.

`migrate-production` só aplica migrations. **Este plano não cria workflow de carga:** o
responsável não o autorizou nesta etapa, e ele fica como atividade futura, com PR e
autorização específicos.

## Autorizações

Concedidas em 2026-11-10:

- Registro de `plan.md` e `tasks.md`.
- Testcontainers com Postgres real e descartável para testes de integração.
- Implementação somente de `T-DADOS-01`, com imagem oficial de versão fixa e sem
  dependências npm.
- Consulta somente leitura dos metadados estruturais de `auth.users`, já realizada.

Ainda necessárias:

1. Autorização de cada tarefa a partir de `T-DADOS-02`.
2. Revisão específica do DDL de `T-DADOS-03` e `T-DADOS-05` antes de criar ou aplicar as
   migrations (`rules/operacao.md`: pedir antes).
3. Autorização de `scripts/banco-local.mjs`, que permite ao responsável rodar os comandos
   protegidos contra o container, com conferência do destino.
4. Demonstração e autorização de cada mudança global: `allowImportingTsExtensions`,
   `engines`, inclusão de `prisma/` no lint e no Vitest, e scripts `seed` e
   `vincular:professor`.
5. Workflow de carga em produção, em PR e autorização específicos.

## Riscos técnicos

| Risco | Tratamento |
|---|---|
| Import de `@prisma/client` em Node com remoção de tipos | Teste de `T-DADOS-01`, local em Node 24 e em Node 22 no CI quando houver PR, com alternativa sem dependência |
| Colunas de `auth.users` mudarem no banco real | Falha fechada; estrutura conferida em 2026-11-10 |
| Stub de `auth.users` divergir do real | Stub restrito às quatro colunas conferidas |
| `migrate dev --create-only` em container vazio se comportar diferente do esperado | Primeira execução em `T-DADOS-03`, com a saída mostrada antes de seguir |
| Major do Postgres do teste diferente do remoto | SQL sem recursos específicos de versão; versão remota não conferida |
| Privilégios padrão do Supabase diferentes da simulação | Teste confere também `pg_policies` e `relrowsecurity` |
| `Application quality` não é check obrigatório | O agente só integra com os dois jobs verdes |
| Tempo da suíte com containers | Um container por arquivo de teste e bancos copiados do modelo |
| Docker indisponível | Suíte falha explicitamente |
