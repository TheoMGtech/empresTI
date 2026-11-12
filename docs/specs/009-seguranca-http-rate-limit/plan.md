# Plano — segurança HTTP, CSP e limite de requisições

## Estado

**Status:** EM APROVAÇÃO — aguarda o responsável. Spec de referência: `spec.md` (APROVADA em
2026-11-12). O DDL da seção "Migration" exige aprovação específica, separada deste plano.

## Restrições e skills

- **ADR-001:** §3 (Router → Service → Prisma), §4 (formato de erro), §5 (Prisma Migrate), §6
  (exceção aprovada de `tenant_id` só para `limites_requisicao`), §7, §8 (Vitest, Testcontainers,
  Playwright), §10 (cabeçalhos em `next.config`, CSP sem `unsafe-inline`, rate limit no Postgres).
- **Regras:** `rules/checks.md`, `rules/tests.md`, `rules/migration.md`, `rules/secrets.md`.
- **Skills:** `supabase-postgres-best-practices` (upsert atômico, índice de expiração, RLS);
  `supabase` (privilégios de `anon` e `authenticated` na Data API).
- **Dependências:** nenhuma biblioteca nova. HMAC e nonce usam `node:crypto` e a Web Crypto do
  runtime. Novo script `test:e2e:producao` em `package.json`, sem pacote novo.

## Arquivos previstos

| Arquivo | Função | Tarefa |
|---|---|---|
| `src/server/seguranca/cabecalhos.ts`, `next.config.ts` | Cabeçalhos fixos e HSTS | 01 |
| `src/server/seguranca/csp.ts`, `src/server/supabase/proxy.ts`, `src/proxy.ts` | Nonce e CSP | 02 |
| `src/components/emprestimos/barra-prazo.tsx` | Barra sem `style` | 03 |
| `playwright.producao.config.ts`, `e2e/producao/*.spec.ts`, `package.json` | E2E no build de produção | 04 |
| `prisma/schema.prisma`, `prisma/migrations/<data>_criar_limites_requisicao/` | Tabela | 05 |
| `src/env.ts`, `.env.example`, `src/test/setup.ts`, `src/server/services/ip-confiavel.ts`, `src/server/services/identificadores-limite.ts` | Chave, IP e HMAC | 06 |
| `src/server/services/limites.ts` | Contador atômico e limpeza | 07 |
| `src/lib/mensagens-limite.ts`, `src/server/api/trpc.ts`, `src/app/api/trpc/[trpc]/route.ts`, `src/test/limitador.ts` | Contexto, erros 429/503 e `Retry-After` | 08 |
| `src/server/api/routers/autenticacao.ts` | Limite do login | 09 |
| `src/server/api/routers/emprestimos.ts`, `operacoes.ts`, `equipamentos.ts` | Limite das mutações | 10 |
| `formulario-login.tsx`, `card-solicitacao.tsx`, `devolucao.tsx` (também usado pelo painel de Operações), `controle-situacao.tsx`, `tela-cadastro.tsx` | Mensagens na interface | 11 |
| Specs 001, 005, 007, 008; `docs/VALIDACAO-INTEGRADA.md`; `docs/DEVOPS.md` | Referências e roteiro | 12 |

A pasta `src/server/seguranca/` é nova: guarda o que é cabeçalho e CSP, que não é Service de
domínio nem cliente Supabase. Os nomes finais dos arquivos podem mudar sem mudar a função.

## Desenho — cabeçalhos e CSP

### Cabeçalhos fixos (T-SEG-01)

- `cabecalhosFixos(ambiente)` devolve a lista de RF-SEG-04 e acrescenta o HSTS
  (`max-age=31536000`) só quando `VERCEL_ENV === "production"`.
- `next.config.ts` usa essa lista em `headers()` com `source: "/:path*"`. Na Vercel,
  `VERCEL_ENV` existe no build, que é quando `headers()` é avaliado.

### Como o nonce chega ao Next.js e à resposta (T-SEG-02)

A cada requisição que passa pelo matcher de `src/proxy.ts` (páginas e `/api/trpc`; os estáticos
de `_next/static` ficam de fora e não precisam de CSP):

1. `proxy()` gera o nonce: 16 bytes de `crypto.getRandomValues`, em base64 (RS-SEG-06).
2. `montarCsp({ nonce, desenvolvimento, hostStorage })` monta a política de RF-SEG-02. O host do
   Storage vem de `NEXT_PUBLIC_SUPABASE_URL`. Em desenvolvimento, acrescenta só `'unsafe-eval'` em
   `script-src` e `'unsafe-inline'` em `style-src`, que o hot reload exige (RF-SEG-03).
3. `atualizarSessao(requisicao, { nonce, csp })` passa a montar os cabeçalhos da requisição que
   segue para o Next por uma função `cabecalhosParaONext()`. Ela copia `requisicao.headers` **no
   momento da chamada** e acrescenta `x-nonce` e `Content-Security-Policy`. A função é usada nas
   duas chamadas a `NextResponse.next({ request: { headers } })`: a inicial e a de dentro de
   `setAll`. Assim, os cookies renovados que o `setAll` grava em `requisicao.cookies` continuam
   chegando à renderização, como hoje.
4. Na renderização, o Next lê a CSP do cabeçalho da requisição, extrai o nonce e o aplica aos
   próprios scripts. Nenhum componente nosso precisa ler `x-nonce` hoje. Se algum precisar, lê com
   `headers()`.
5. Depois de `supabase.auth.getUser()`, `atualizarSessao` grava a mesma CSP no cabeçalho da
   **resposta**, ao lado dos cookies de sessão e do `Cache-Control: private, no-store` atuais.

Requisitos para isso funcionar, conferidos na T-SEG-02:

- Toda página precisa ser renderizada por requisição: página pré-renderizada no build não recebe
  nonce. O build atual mostra as rotas como `ƒ (Dynamic)`. A T-SEG-02 confere a saída do build
  e, se aparecer rota estática (`○`), torna o layout raiz dinâmico com `await connection()`.
- Sem `unsafe-inline` para contornar falhas (decisão do responsável). Uma violação que só se
  resolve com origem ou palavra-chave nova volta ao responsável com a evidência.

### Estilos inline (T-SEG-03)

- `barra-prazo.tsx` troca a `div` com `style={{ width }}` por um `svg` com `rect` cujo `width` é um
  **atributo SVG** em porcentagem. Atributo de apresentação SVG não é `style` e não é bloqueado por
  `style-src`. Mantém altura, cantos, cores, `role="progressbar"`, os atributos ARIA e a transição.
- Os demais estilos aplicados por React e Radix depois da hidratação usam a CSSOM, que a CSP não
  bloqueia. O E2E de produção (T-SEG-04) é o que comprova a ausência de violação em cada tela.

### E2E no build de produção (T-SEG-04)

- `playwright.producao.config.ts`: `webServer` roda `npm run build` e depois `npm run start -- -p
  3100`, com `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` de teste; `baseURL` `http://localhost:3100`;
  `testDir: ./e2e/producao`. O `playwright.config.ts` atual passa a ignorar `e2e/producao`.
- Novo script: `"test:e2e:producao": "node ./node_modules/@playwright/test/cli.js test --config
  playwright.producao.config.ts"`.
- Os testes usam o tRPC simulado de `e2e/apoio/trpc.ts`, registram `securitypolicyviolation` em
  cada página e conferem cabeçalhos, nonce e as seis telas de CA-SEG-03.

## Desenho — limite de requisições

### Chave, IP e identificadores (T-SEG-06)

- `src/env.ts`: `lerChaveHmacLimites()` lê `CHAVE_HMAC_LIMITES` (mínimo de 32 caracteres). Se
  ausente ou curta, lança `ErroLimiteIndisponivel`, que vira 503 (fail-closed). Nunca no build e
  nunca no cliente.
- `.env.example` ganha só o nome. `src/test/setup.ts` define um valor fixo de teste, sem valor
  real, como já faz com a chave publicável.
- `lerIpConfiavel(cabecalhos, ambiente)`: só com `VERCEL === "1"` lê `x-forwarded-for` e aceita
  um único endereço válido por `net.isIP`. Qualquer outro caso devolve `null`. Nenhum outro
  cabeçalho é lido.
- `identificador(escopo, valor)`: HMAC-SHA-256, em hex, de `<escopo>:<valor>`.
  - `login_email` usa o e-mail normalizado (RN-SEG-05).
  - `login_ip` e `mutacao_ip` usam o IP, ou `ip-indisponivel` quando ele é `null` (P3).
  - `mutacao_usuario` usa `<tenant_id>:<usuario_id>`.

### Contador atômico (T-SEG-07)

`src/server/services/limites.ts`, com SQL parametrizado (`$queryRaw` com template, sem
concatenação):

- **`consumir`** faz um único comando:
  `INSERT … VALUES (…, 1) ON CONFLICT (escopo, identificador, janela_inicio) DO UPDATE SET
  contador = limites_requisicao.contador + 1 WHERE limites_requisicao.contador < $limite RETURNING
  contador, expira_em`.
  Sem linha devolvida, o limite estourou. `Retry-After` = segundos até `expira_em`, arredondados
  para cima.
- **Janela fixa:** `janela_inicio = floor(agora / duração) × duração`. O relógio é injetado nos
  testes.
- **Expirado não participa** (RN-SEG-10, item 1): a chave primária inclui `janela_inicio`, então
  uma janela nova cria outra linha e a antiga nunca é lida.
- **`devolver`** (P2): `UPDATE … SET contador = contador - 1 WHERE … AND contador > 0`, na mesma
  janela da reserva.
- **`consumirJuntos`** (mutações, RN-SEG-06): uma transação com os dois `consumir`. Se o segundo
  falhar, lança e desfaz o primeiro.
- **Limpeza** (RN-SEG-10, item 2): depois de cada escrita, `DELETE FROM limites_requisicao WHERE
  ctid IN (SELECT ctid FROM limites_requisicao WHERE expira_em < now() LIMIT 200)`.
- **Erros:** qualquer erro do banco vira `ErroLimiteIndisponivel`, sem detalhe (RF-SEG-12). Nada é
  registrado em log com identificador, e-mail ou IP (RS-SEG-03).

### Contexto e formato de erro (T-SEG-08)

- `criarContextoTRPC({ req })` passa a receber a requisição (`FetchCreateContextFnOptions`) e
  devolve também:
  - `ipConfiavel`, calculado só por `lerIpConfiavel`;
  - `obterLimitador`, que monta o limitador real com `obterClientePrisma()` e a chave.
- Nos testes, `createCaller` recebe `ipConfiavel` diretamente (Q10). O tipo do contexto deixa os
  dois campos opcionais. Sem `obterLimitador`, o middleware usa o limitador real sobre
  `ctx.obterClientePrisma()`: o padrão é o seguro, nunca a ausência de limite.
- Testes com Prisma simulado que chamam mutação com entrada válida recebem um limitador de teste
  explícito (`src/test/limitador.ts`). Um teste prova que `criarContextoTRPC` sempre usa o real.
- `src/lib/mensagens-limite.ts` tem as duas mensagens, usadas pelo servidor e pela interface.
- Erros:
  - `ErroLimiteExcedido(segundos)` vira `TRPCError` `TOO_MANY_REQUESTS` com a mensagem de
    RF-SEG-11;
  - `ErroLimiteIndisponivel` vira `SERVICE_UNAVAILABLE` com a mensagem de RN-SEG-12.

  O `errorFormatter` atual já mantém a mensagem do `TRPCError` (não é `INTERNAL_SERVER_ERROR`) e
  remove a pilha.
- `route.ts`: `responseMeta` grava `Retry-After` com o maior número de segundos entre os erros
  `TOO_MANY_REQUESTS` da resposta.

### Login (T-SEG-09)

Em `autenticacao.entrar`, depois da validação de entrada, nesta ordem:

1. `consumir(login_ip, 100, 15 min)`.
2. `consumir(login_email, 5, 15 min)`, que é a reserva (P2).
3. `entrar()` no Supabase Auth.
4. Se der certo ou lançar `ErroAutenticacaoIndisponivel`, `devolver(login_email)`. Se lançar
   `ErroCredenciaisInvalidas`, a vaga fica consumida.

Se 1 ou 2 recusarem, nada chega ao Supabase. A resposta é a mesma para e-mail cadastrado ou não
(RN-SEG-08).

### Mutações (T-SEG-10)

- Middleware `limitarMutacao`, encaixado **depois** de `.input()` em cada uma das cinco mutações:
  `tenantProcedure.input(…).use(limitarMutacao)` ou `adminProcedure.input(…).use(…)`.
  - Na cadeia do tRPC v11, a validação de entrada roda na posição do `.input()`. Por isso o
    middleware roda depois da autenticação, da autorização e da validação, como pede RN-SEG-06.
  - Ele chama `consumirJuntos(mutacao_usuario 30/60 s, mutacao_ip 120/60 s)`.
- Uma prova lê o AppRouter, como em `provas-finais-spec-008.test.ts`: exatamente as cinco
  mutações usam o limite; leituras e `autenticacao.sair` não usam.

### Interface (T-SEG-11)

`mensagemDeLimite(erro)` devolve a mensagem para `TOO_MANY_REQUESTS` e `SERVICE_UNAVAILABLE`, ou
`null`. Os cinco componentes que tratam erro nesses fluxos (o diálogo de devolução serve a
Meus empréstimos e ao painel de Operações) consultam essa função antes do tratamento atual. Os
demais casos ficam como estão.

## Migration (T-SEG-05) — DDL exato para aprovação específica

Gerada pelo Prisma a partir do modelo abaixo; as `CHECK`, a RLS, as policies e o `REVOKE` são
acrescentados no mesmo arquivo, como nas migrations anteriores.

```prisma
model LimiteRequisicao {
  escopo        String
  identificador String
  janelaInicio  DateTime @map("janela_inicio") @db.Timestamptz(6)
  expiraEm      DateTime @map("expira_em") @db.Timestamptz(6)
  contador      Int      @default(0)

  @@id([escopo, identificador, janelaInicio])
  @@index([expiraEm])
  @@map("limites_requisicao")
}
```

```sql
-- CreateTable
CREATE TABLE "limites_requisicao" (
    "escopo" TEXT NOT NULL,
    "identificador" TEXT NOT NULL,
    "janela_inicio" TIMESTAMPTZ(6) NOT NULL,
    "expira_em" TIMESTAMPTZ(6) NOT NULL,
    "contador" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "limites_requisicao_pkey" PRIMARY KEY ("escopo","identificador","janela_inicio")
);

-- CreateIndex
CREATE INDEX "limites_requisicao_expira_em_idx" ON "limites_requisicao"("expira_em");

-- AddCheck
ALTER TABLE "limites_requisicao"
    ADD CONSTRAINT "limites_requisicao_escopo_check"
        CHECK ("escopo" IN ('login_ip', 'login_email', 'mutacao_ip', 'mutacao_usuario')),
    ADD CONSTRAINT "limites_requisicao_identificador_check"
        CHECK ("identificador" ~ '^[0-9a-f]{64}$'),
    ADD CONSTRAINT "limites_requisicao_contador_check" CHECK ("contador" >= 0),
    ADD CONSTRAINT "limites_requisicao_janela_check" CHECK ("expira_em" > "janela_inicio");

-- EnableRLS
ALTER TABLE "limites_requisicao" ENABLE ROW LEVEL SECURITY;

-- CreatePolicy
CREATE POLICY "limites_requisicao_negar_anon" ON "limites_requisicao"
    FOR ALL TO anon USING (false) WITH CHECK (false);
CREATE POLICY "limites_requisicao_negar_authenticated" ON "limites_requisicao"
    FOR ALL TO authenticated USING (false) WITH CHECK (false);

-- RevokePrivileges
REVOKE ALL ON "limites_requisicao" FROM PUBLIC, anon, authenticated;
```

- **Linhas existentes:** a tabela é nova, sem dado a migrar.
- **Diferença em relação ao esboço da spec:** só a precisão `TIMESTAMPTZ(6)`, o padrão das
  migrations existentes.
- **Geração:** `rules/migration.md` exige banco local para `npm run prisma:migrate`. O responsável
  roda, no PostgreSQL local descartável do procedimento usado nas verificações:
  `npm run prisma:migrate -- --name criar_limites_requisicao --create-only`.
  O agente acrescenta as linhas manuais ao arquivo gerado. Depois o responsável roda
  `npm run prisma:reset`, que deve aplicar as sete migrations. Os comandos exatos são entregues na
  hora da tarefa.

## Estratégia de teste

| CA | Prova |
|---|---|
| 01, 02, 04 | Unitário de `montarCsp` e `cabecalhosFixos`; E2E de produção nos cabeçalhos e nonces de duas respostas. |
| 03, 06 | E2E de produção com `securitypolicyviolation` nas seis telas; unitário da barra (sem `style`, proporção). |
| 05 | Unitário do proxy com `setAll` simulado: cookies e CSP na resposta e na requisição repassada; testes da Spec 003. |
| 07–10, 15 | Banco real (Testcontainers) com relógio fixo; concorrência com `Promise.all`; tentativa recusada sem consumo. |
| 11 | Prova pelo AppRouter; suíte inteira verde. |
| 12 | Banco derrubado ou sem tabela, e chave ausente: 503, Supabase simulado não chamado, nada gravado. |
| 13 | Banco real: só hex de 64; HMAC ≠ SHA-256 sem chave; espião de `console` sem e-mail nem IP. |
| 14 | Banco real com os papéis `anon` e `authenticated`: as quatro operações recusadas; `relrowsecurity`. |
| 16 | Unitário de `lerIpConfiavel` com cabeçalhos forjados; banco real com duas pessoas sem IP dividindo o limite. |
| 17 | Testing Library nos cinco componentes; E2E de desenvolvimento com 429 simulado no login. |
| 18 | `rules/checks.md`, mais `npm run test:e2e:producao` e `prisma:reset` pelo responsável. |

## Implantação e validação

Os três níveis seguem a seção "Implantação" da spec:

1. local, com build de produção;
2. validação integrada real no preview;
3. verificação final na URL de produção, depois do deploy.

Nenhum é declarado antes de existir o ambiente correspondente.

**Efeito em `develop`.** Depois do merge da T-SEG-09, o login no preview de `develop` exige a
tabela no banco que o preview usa e `CHAVE_HMAC_LIMITES` em Preview. Sem isso, o login falha
fechado (503), como decidido em Q7. A validação integrada no preview já depende das migrations das
Specs 002 a 008 aplicadas, então a ordem é a mesma.

**Desenvolvimento local.** Para entrar de verdade em `npm run dev`, o responsável põe
`CHAVE_HMAC_LIMITES` no próprio `.env.local`. O agente não lê nem escreve esse arquivo. Os testes
e o E2E não precisam dele.

## Ponto que depende do responsável (ordem da migration)

A spec manda aplicar a migration **antes** de a versão chegar a `main` (Implantação, passo 3). O
workflow `migrate-production` usa as migrations da branch de onde é disparado. Se o Environment
`production` aceitar só `main`, como sugerido antes, essa ordem fica impossível.

- **(1) Recomendado:** acrescentar `develop` às branches permitidas do Environment `production`.
  `develop` exige PR e CI verde. O workflow roda a partir de `develop` logo antes da validação no
  preview, que já precisa do banco migrado. A spec fica como está.
- **(2)** Manter só `main` e aceitar alguns minutos de login e mutações em 503 em produção entre a
  promoção e o fim do workflow. Isso exige ajustar o passo 3 da spec.

## Fora deste plano

Cadastro público (Q17), `_prisma_migrations` (Q18), Sentry, CAPTCHA e WAF (Q19), e qualquer
alteração no ADR.
