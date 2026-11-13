# Spec — segurança HTTP, CSP e limite de requisições

## Estado

**Status:** APROVADA — pelo responsável em 2026-11-12, sobre o commit `d01f077`, com P1 a P8 e o
ajuste de redação da retenção (RN-SEG-10). `plan.md`, `tasks.md` e o DDL de `limites_requisicao`
foram aprovados em 2026-11-12 (sobre `3841cfc`, com os ajustes de login atômico e ordem de
deploy). Em implementação: T-SEG-01 a 11 integradas em `develop` (2026-11-13); faltam a
T-SEG-12 (documentação) e a T-SEG-13 (provas finais e verificação formal). Não está PRONTA.

## Objetivo

Fechar a última camada de segurança exigida antes da entrega: cabeçalhos HTTP, CSP aplicada com
nonce e limite persistente de tentativas de login e de mutações. Nenhuma funcionalidade das Specs
003 a 008 é refeita.

## Vínculos

- **ADR-001 §10:** cabeçalhos em `next.config`, CSP restritiva sem `unsafe-inline`, rate limit por
  IP e por usuário com contador no Postgres, segredos só no servidor.
- **ADR-001 §6:** "`tenant_id` em toda tabela de domínio" (tabela); a justificativa fala em "toda
  tabela". `limites_requisicao` é tabela técnica, não de domínio, e fica sem `tenant_id` pela
  decisão Q8 (RN-SEG-09), com RLS que nega `anon` e `authenticated`.
- **DF-13 (Spec 003):** CSP, cabeçalhos e rate limit em spec própria, depois da 008, obrigatória
  antes da entrega.
- **Specs afetadas no contrato, sem mudança de CA:** 001 (`autenticacao.entrar`), 005
  (`emprestimos.solicitar`), 007 (`emprestimos.devolver`) e 008 (`operacoes.registrarDevolucao`,
  `equipamentos.cadastrar`, `equipamentos.alterarSituacao`).

## Escopo

- Cabeçalhos fixos em `next.config.ts`.
- CSP com nonce por requisição em `src/proxy.ts`, preservando a atualização de sessão do Supabase.
- Remoção de estilos inline incompatíveis com a CSP, como em `barra-prazo.tsx`.
- Tabela `limites_requisicao`, serviço de contagem atômica e aplicação no login e nas cinco
  mutações cobertas.
- Exibição da mensagem de limite e da mensagem de indisponibilidade nas telas afetadas.
- Variável de ambiente `CHAVE_HMAC_LIMITES` e procedimento de implantação.

## Fora de escopo

- Limite persistente em consultas de leitura e em `autenticacao.sair` (Q2).
- Desabilitar o cadastro público do Supabase Auth: é ação manual do responsável, e continua
  bloqueando a entrega (Q17).
- Exposição de `_prisma_migrations` na Data API: verificação separada de infraestrutura, sem alterar
  a tabela do Prisma (Q18).
- Sentry, CAPTCHA e regras de Vercel Firewall/WAF (Q19).
- Coletor de relatórios de CSP e modo `Report-Only` como estado final (Q14).
- Alterar o ADR-001 (Q1).

## Requisitos funcionais

### Cabeçalhos e CSP

- **RF-SEG-01** — Toda resposta de página traz a CSP em modo aplicado (`Content-Security-Policy`,
  nunca só `Content-Security-Policy-Report-Only`), com nonce novo a cada requisição (Q1, Q14).
- **RF-SEG-02** — Em produção, a CSP tem no mínimo (Q11):
  - `default-src 'self'`;
  - `script-src 'self' 'nonce-<nonce>'`, sem `'unsafe-inline'` e sem `'unsafe-eval'`;
  - `style-src 'self' 'nonce-<nonce>'`, sem `'unsafe-inline'`;
  - `img-src 'self' https://<ref>.supabase.co`, com o host derivado de `NEXT_PUBLIC_SUPABASE_URL`;
  - `font-src 'self'`;
  - `connect-src 'self'`;
  - `object-src 'none'`, `base-uri 'self'`, `form-action 'self'` e `frame-ancestors 'none'`.

  Qualquer origem ou palavra-chave a mais, como `'strict-dynamic'`, `data:` ou `blob:`, só entra
  com a necessidade comprovada no build de produção e registrada no `plan.md`.
- **RF-SEG-03** — Em desenvolvimento (`NODE_ENV=development`), a CSP pode acrescentar só o que o hot
  reload exige, como `'unsafe-eval'` em `script-src`. Essas permissões nunca chegam ao build de
  produção (Q12).
- **RF-SEG-04** — `next.config.ts` define, para todas as rotas (Q15):
  - `X-Content-Type-Options: nosniff`;
  - `Referrer-Policy: strict-origin-when-cross-origin`;
  - `Permissions-Policy: camera=(), microphone=(), geolocation=()`;
  - `X-Frame-Options: DENY`, como complemento de `frame-ancestors 'none'`.
- **RF-SEG-05** — `Strict-Transport-Security: max-age=31536000` só no deploy de produção
  (`VERCEL_ENV=production`), sem `preload` e sem `includeSubDomains` (Q15).
- **RF-SEG-06** — O proxy continua atualizando a sessão do Supabase como hoje, e a resposta leva os
  cookies de sessão e a CSP juntos (Q1).
- **RF-SEG-07** — As telas não renderizam estilo inline que a CSP bloqueie. `barra-prazo.tsx` mostra
  a mesma proporção visual sem atributo `style` (Q13).
- **RF-SEG-08** — A Vercel Toolbar fica bloqueada nos previews; a CSP não é afrouxada por ela (Q16).

### Limite de requisições

- **RF-SEG-09** — `autenticacao.entrar` aplica dois limites antes de chamar o Supabase Auth (Q3):
  - por IP confiável: no máximo 100 tentativas em 15 minutos, contando todas;
  - por e-mail normalizado: no máximo 5 tentativas malsucedidas em 15 minutos.
- **RF-SEG-10** — Mutações cobertas: `emprestimos.solicitar`, `emprestimos.devolver`,
  `operacoes.registrarDevolucao`, `equipamentos.cadastrar` e `equipamentos.alterarSituacao` (Q2).
  Elas compartilham dois limites (Q3):
  - por usuário no tenant: no máximo 30 em 60 segundos;
  - por IP confiável: no máximo 120 em 60 segundos.

  Os mesmos limites valem para `colaborador` e `operacoes` (Q6).
- **RF-SEG-11** — Limite excedido responde `TOO_MANY_REQUESTS` (HTTP 429) com a mensagem "Muitas
  tentativas em pouco tempo. Aguarde alguns minutos e tente novamente." e `Retry-After` em segundos
  até o fim da janela que bloqueou (Q4).
- **RF-SEG-12** — Se o contador não puder ser lido ou atualizado, a operação é recusada com
  `SERVICE_UNAVAILABLE` (HTTP 503) e a mensagem de RN-SEG-12, sem detalhe interno. O login não chama
  o Supabase Auth e a mutação não grava nada. As consultas de leitura não dependem do contador
  (Q7).
- **RF-SEG-13** — O formulário de login e as telas das mutações cobertas mostram as mensagens de
  RF-SEG-11 e RN-SEG-12. Hoje o login converte qualquer erro que não seja `UNAUTHORIZED` em
  "Não foi possível concluir o acesso. Tente novamente.", e isso muda só para esses dois códigos.

## Regras de negócio

- **RN-SEG-01** — Os limites não substituem regras de negócio, autorização ou isolamento por tenant
  (Q3).
- **RN-SEG-02** — Janelas fixas: 15 minutos para o login e 60 segundos para as mutações. A janela
  começa no múltiplo da duração (época Unix) que contém o instante da tentativa.
- **RN-SEG-03** — Limite por IP no login: toda tentativa que passa da validação de entrada conta,
  antes de chamar o Supabase Auth (Q3).
- **RN-SEG-04** — Limite por e-mail no login: conta só a falha de credencial. Para resistir à
  concorrência, cada tentativa reserva uma vaga do contador de forma atômica antes de chamar o
  Supabase Auth. A vaga é devolvida quando o login dá certo ou quando a falha não é de credencial,
  como o Supabase indisponível. Assim, nunca há mais de 5 tentativas em andamento ou falhas na
  mesma janela (Q3).
- **RN-SEG-05** — Normalização do e-mail: remover espaços nas pontas e passar para minúsculas, antes
  de gerar o identificador (Q5).
- **RN-SEG-06** — Mutações: conta toda tentativa que passa da autenticação, da autorização e da
  validação de entrada, antes da regra de negócio, inclusive a que depois é recusada por regra. Os
  contadores por usuário e por IP são atualizados juntos: se um deles bloquear, nenhum dos dois é
  consumido.
- **RN-SEG-07** — Tentativa recusada por limite não consome vaga.
- **RN-SEG-08** — A mesma resposta de limite vale para e-mail cadastrado ou não: nada revela se uma
  conta existe (Q4).
- **RN-SEG-09** — Exceção ao `tenant_id`: `limites_requisicao` não tem `tenant_id` porque o login
  acontece antes de existir tenant na sessão. O escopo vai no identificador: IP; e-mail; e, nas
  mutações, `tenant_id` e `usuario_id` juntos. Essa exceção vale só para esta tabela técnica e não
  autoriza tabela de domínio sem `tenant_id` (Q8).
- **RN-SEG-10** — Contadores expirados e limpeza (Q5, Q9, P5):
  1. Um contador com `expira_em` já passado deixa imediatamente de participar da limitação, mesmo
     que a linha ainda exista.
  2. A remoção física é oportunística: cada escrita seguinte no contador remove, em lote limitado,
     linhas com `expira_em` já passado.
  3. Sem novas escritas, não há garantia de exclusão física em 24 horas nem em prazo algum. As
     linhas restantes contêm só identificadores HMAC (RS-SEG-01).
  4. O responsável aceitou essa limitação para a primeira entrega (2026-11-12).
  5. Esta spec não introduz `pg_cron`, Redis, worker, serviço externo nem outro agendador.
- **RN-SEG-11** — IP confiável (Q10):
  - Em deploy da Vercel (`VERCEL=1`), o IP vem só de `x-forwarded-for`, que a Vercel sobrescreve
    para impedir falsificação (documentação de request headers da Vercel). O valor precisa ser um
    único endereço IPv4 ou IPv6 válido.
  - `x-real-ip`, `x-vercel-forwarded-for`, `x-client-ip` e qualquer outro cabeçalho enviado pelo
    cliente são ignorados.
  - Sem origem confiável (fora da Vercel, cabeçalho ausente ou inválido), a tentativa usa um
    identificador único compartilhado, `ip-indisponivel`, e todas essas tentativas dividem o mesmo
    limite.
  - Os testes injetam o IP pelo contexto do tRPC (`createCaller`), nunca por cabeçalho.
- **RN-SEG-12** — Mensagem de indisponibilidade do contador: "Serviço indisponível no momento.
  Tente novamente em instantes." (ver P1).

## Segurança e autorização

- **RS-SEG-01** — A tabela guarda só identificadores HMAC-SHA-256 (hex, 64 caracteres), gerados com
  `CHAVE_HMAC_LIMITES`. Nunca guarda e-mail, IP ou id de usuário em texto puro (Q5).
- **RS-SEG-02** — `CHAVE_HMAC_LIMITES` é exclusiva do servidor, sem prefixo `NEXT_PUBLIC_`, nunca
  versionada e validada em `src/env.ts`. Sem a chave, login e mutações cobertas falham fechados
  (RF-SEG-12) (Q5, Q7).
- **RS-SEG-03** — Logs não registram e-mail, IP, identificador nem a chave (Q5; RS-LOGIN-03).
- **RS-SEG-04** — `limites_requisicao` tem RLS habilitada, políticas que negam `anon` e
  `authenticated` e `REVOKE ALL` para `PUBLIC`, `anon` e `authenticated`. O acesso é só do servidor
  (Q8).
- **RS-SEG-05** — A contagem é feita num único comando atômico por contador (`INSERT … ON CONFLICT
  … DO UPDATE … WHERE contador < limite RETURNING`), em transação quando há dois contadores (Q3,
  Q8).
- **RS-SEG-06** — O nonce tem pelo menos 128 bits de `crypto.getRandomValues`, em base64, e é
  diferente a cada requisição (Q1).

## Contrato afetado

- `autenticacao.entrar` e as cinco mutações de RF-SEG-10 passam a poder responder
  `TOO_MANY_REQUESTS` (429, com `Retry-After`) e `SERVICE_UNAVAILABLE` (503).
- Contexto do tRPC: ganha o IP confiável da requisição, injetável nos testes.
- Respostas HTTP: novos cabeçalhos (RF-SEG-01 a RF-SEG-05).
- Ambiente: nova variável `CHAVE_HMAC_LIMITES` (exclusiva do servidor); `.env.example` recebe só o
  nome.
- Banco: nova migration (DDL abaixo). **Não será gerada nem aplicada sem a aprovação específica
  deste DDL** (Q8).

### DDL pretendido (não gerado)

```sql
-- CreateTable
CREATE TABLE "limites_requisicao" (
    "escopo"        TEXT        NOT NULL,
    "identificador" TEXT        NOT NULL,
    "janela_inicio" TIMESTAMPTZ NOT NULL,
    "expira_em"     TIMESTAMPTZ NOT NULL,
    "contador"      INTEGER     NOT NULL DEFAULT 0,
    CONSTRAINT "limites_requisicao_pkey"
        PRIMARY KEY ("escopo", "identificador", "janela_inicio"),
    CONSTRAINT "limites_requisicao_escopo_check"
        CHECK ("escopo" IN ('login_ip', 'login_email', 'mutacao_ip', 'mutacao_usuario')),
    CONSTRAINT "limites_requisicao_identificador_check"
        CHECK ("identificador" ~ '^[0-9a-f]{64}$'),
    CONSTRAINT "limites_requisicao_contador_check" CHECK ("contador" >= 0),
    CONSTRAINT "limites_requisicao_janela_check" CHECK ("expira_em" > "janela_inicio")
);

-- CreateIndex
CREATE INDEX "limites_requisicao_expira_em_idx" ON "limites_requisicao" ("expira_em");

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

Segue o padrão de RLS das migrations existentes (`criar_estrutura_dominio`, `criar_auditoria`). Sem
trava de `TRUNCATE`: os contadores são descartáveis e o `REVOKE ALL` já tira esse privilégio de
`anon` e `authenticated`. A precisão dos `TIMESTAMPTZ` segue o padrão do `schema.prisma` no
momento da geração.

## Implantação

Preparação, feita pelo responsável:

1. Gerar a chave localmente, sem colar o valor no chat, em arquivo versionado ou em log:
   `node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"`.
2. Na Vercel (projeto `empresti`), cadastrar `CHAVE_HMAC_LIMITES` como variável sensível, com
   valores diferentes em Production e em Preview.
3. Aplicar a migration de `limites_requisicao` pelo workflow `migrate-production`, junto das
   demais pendentes, **antes** de a versão com o limite chegar a `main`. Sem a tabela, login e
   mutações falham fechados (RF-SEG-12).

Três níveis de validação, distintos e nesta ordem. Nenhum substitui o seguinte, e nenhum é
declarado executado antes de existir o ambiente correspondente:

1. **Local, com build de produção:** `npm run build` e `npm run start`, com o E2E de CSP
   (CA-SEG-01 a 06) e os demais checks (CA-SEG-18). Prova o código, não a Vercel.
2. **Validação integrada real no preview da Vercel** (DF-14, `docs/VALIDACAO-INTEGRADA.md`):
   cabeçalhos e CSP aplicada (`curl -sI <url do preview>`), telas sem `securitypolicyviolation`,
   IP confiável e os limites de login e de mutação contra o Supabase real.
3. **Verificação final na URL de produção:** depois do deploy de `main` autorizado pelo
   responsável e antes de declarar a entrega concluída. Confere os cabeçalhos, a CSP, o HSTS e o
   login real. Só é registrada depois de existir o deploy correspondente.

## Critérios de aceitação

- **CA-SEG-01** — No build de produção (`npm run build` e `npm run start`), toda página responde
  com `Content-Security-Policy` aplicada contendo as diretivas de RF-SEG-02, sem `'unsafe-inline'`
  em `script-src` e em `style-src` e sem `'unsafe-eval'`.
- **CA-SEG-02** — Duas requisições seguidas à mesma página recebem nonces diferentes, e os scripts
  do Next na página carregam o nonce da própria resposta.
- **CA-SEG-03** — No build de produção, login, catálogo, detalhe, Meus empréstimos, painel de
  Operações e cadastro abrem e funcionam sem nenhum evento `securitypolicyviolation`.
- **CA-SEG-04** — Os cabeçalhos de RF-SEG-04 estão em todas as rotas. HSTS aparece só com
  `VERCEL_ENV=production`, sem `preload` e sem `includeSubDomains`.
- **CA-SEG-05** — Com a CSP, o proxy continua renovando a sessão: a resposta leva os cookies do
  Supabase e a CSP, e os testes da Spec 003 continuam passando.
- **CA-SEG-06** — `barra-prazo.tsx` não renderiza atributo `style` e mantém a proporção mostrada
  para as mesmas datas.
- **CA-SEG-07** — A 101ª tentativa de login do mesmo IP em 15 minutos responde 429 com a mensagem,
  `Retry-After` e sem chamar o Supabase Auth.
- **CA-SEG-08** — Depois de 5 falhas de credencial do mesmo e-mail (variando maiúsculas e espaços),
  a 6ª tentativa responde 429 sem chamar o Supabase Auth, mesmo com a senha certa. A resposta é
  igual para e-mail cadastrado ou não. Login bem-sucedido e falha que não é de credencial não
  consomem vaga.
- **CA-SEG-09** — Com tentativas simultâneas, nunca mais de 5 tentativas do mesmo e-mail chegam ao
  Supabase Auth na janela, e nunca mais de 100 do mesmo IP.
- **CA-SEG-10** — Somadas as cinco mutações, a 31ª do mesmo usuário em 60 segundos responde 429, e a
  121ª do mesmo IP, entre usuários diferentes, também. Vale igual para `colaborador` e `operacoes`.
  Tentativa recusada não consome vaga, e com tentativas simultâneas o limite não é ultrapassado.
- **CA-SEG-11** — Consultas de leitura e `autenticacao.sair` não são limitadas. Recusa por
  autorização continua `FORBIDDEN`, e os testes das Specs 001 e 003 a 008 continuam passando.
- **CA-SEG-12** — Com o contador indisponível ou sem `CHAVE_HMAC_LIMITES`, login e mutações
  respondem 503 com a mensagem de RN-SEG-12, sem chamar o Supabase Auth, sem gravar e sem detalhe
  interno. As consultas continuam respondendo.
- **CA-SEG-13** — A tabela contém só identificadores hex de 64 caracteres, iguais ao HMAC com a
  chave e diferentes do SHA-256 sem chave. Nenhum log do fluxo contém e-mail, IP ou identificador.
- **CA-SEG-14** — Em banco real, `anon` e `authenticated` não leem, inserem, alteram nem apagam
  linhas de `limites_requisicao`, e a RLS está habilitada.
- **CA-SEG-15** — Um contador expirado que ainda existe na tabela não bloqueia nem soma à janela
  atual. Uma escrita seguinte remove as linhas expiradas, em lote limitado, e preserva as da janela
  atual.
- **CA-SEG-16** — Com `VERCEL=1`, o IP vem de `x-forwarded-for` válido. `x-real-ip`,
  `x-vercel-forwarded-for` e `x-client-ip` forjados são ignorados. Cabeçalho ausente, inválido ou
  fora da Vercel usa o identificador compartilhado, e o teste comprova o bloqueio coletivo: pessoas
  diferentes sem IP confiável dividem o mesmo limite por IP (P3).
- **CA-SEG-17** — O formulário de login e as telas das mutações mostram exatamente as mensagens de
  RF-SEG-11 e RN-SEG-12.
- **CA-SEG-18** — Lint, typecheck, testes, E2E (servidor de desenvolvimento e build de produção),
  build e `prisma:reset` no banco local descartável passam. Isso basta para declarar esta spec
  PRONTA (DF-14). A validação no preview e a verificação final na URL de produção (Implantação)
  continuam obrigatórias antes da entrega final.

## Dependências

Specs 001, 003, 005, 007 e 008. Aprovação específica do DDL. Chave cadastrada na Vercel antes da
promoção.

## Riscos

- Código publicado antes da migration bloqueia login e mutações (fail-closed). Ver Implantação,
  passo 3.
- Uma janela fixa permite até o dobro do limite em rajada na virada da janela. Foi aceito para não
  trazer janela deslizante.
- Sem origem confiável de IP, todas as tentativas dividem um único limite por IP. Na Vercel isso só
  acontece se o cabeçalho faltar.
- Trocar `CHAVE_HMAC_LIMITES` zera, na prática, os contadores em andamento.
- Componentes de terceiros (shadcn/Radix) que renderizem `style` no servidor podem violar a CSP. O
  CA-SEG-03 detecta isso no build de produção.
- O Supabase Auth também limita por IP, e no servidor ele vê o IP da Vercel. O limite desta spec
  age antes, mas não elimina o limite do Supabase.

## Decisões tomadas (responsável, 2026-11-12)

- **Q1:** opção (a). Cabeçalhos fixos em `next.config.ts`, CSP com nonce em `src/proxy.ts`, sem
  alterar o ADR.
- **Q2:** limitar o login e as cinco mutações; nenhum limite persistente em leituras.
- **Q3:** login com 5 falhas por e-mail e 100 tentativas por IP em 15 minutos; mutações com 30 por
  usuário e 120 por IP em 60 segundos, somadas; contagem atômica.
- **Q4:** 429 com `Retry-After` e a mensagem aprovada; não revelar se o e-mail existe.
- **Q5:** HMAC-SHA-256 com chave do servidor; e-mail normalizado; nada em log. A meta de 24 horas
  para contadores expirados ficou ajustada por P5: limpeza oportunística, sem garantia de exclusão
  física em 24 horas (RN-SEG-10).
- **Q6:** nenhum papel isento.
- **Q7:** fail-closed para login e mutações.
- **Q8:** tabela sem `tenant_id`, com as exigências de RN-SEG-09 e RS-SEG-04; DDL com aprovação
  específica.
- **Q9:** limpeza incremental durante as escritas.
- **Q10:** só o IP da infraestrutura da Vercel; injeção só nos testes.
- **Q11 a Q13:** CSP restritiva; permissões extras só em desenvolvimento; sem estilos inline.
- **Q14:** CSP aplicada antes da entrega; sem coletor de relatórios.
- **Q15:** HSTS sem `preload` nem `includeSubDomains`, mais os cabeçalhos de RF-SEG-04.
- **Q16:** a Vercel Toolbar fica bloqueada nos previews.
- **Q17 a Q19:** cadastro público desabilitado manualmente pelo responsável;
  `_prisma_migrations` e Sentry/CAPTCHA/WAF fora desta spec.
- **ADR-001 §6:** `limites_requisicao` é tabela técnica, não de domínio. A ausência de `tenant_id`
  está aprovada só para ela, mantidos a RLS, o `REVOKE ALL` e o isolamento dos identificadores. O
  ADR não muda.
- **CSP:** nonce por requisição. A implementação é comprovada no build de produção e depois na
  Vercel, sem `unsafe-inline` para contornar falhas.

## Decisões sobre as propostas (responsável, 2026-11-12)

- **P1 (aprovada):** mensagem de indisponibilidade de RN-SEG-12.
- **P2 (aprovada):** reserva atômica de vaga por e-mail, devolvida no sucesso e em falha que não é
  de credencial (RN-SEG-04).
- **P3 (aprovada):** identificador compartilhado `ip-indisponivel` sem origem confiável, com o
  risco de bloqueio coletivo documentado e testado (RN-SEG-11, CA-SEG-16).
- **P4 (aprovada):** HSTS com `max-age=31536000`, sem `preload` nem `includeSubDomains`.
- **P5 (aprovada com ajuste):** limpeza oportunística, sem garantia de exclusão física em 24 horas
  (RN-SEG-10).
- **P6 (aprovada):** janelas fixas (RN-SEG-02).
- **P7 (aprovada):** variável `CHAVE_HMAC_LIMITES`.
- **P8 (aprovada):** as Specs 001, 005, 007 e 008 recebem só uma linha em "Contrato afetado"
  apontando para esta spec (`rules/spec-flow.md`, item 7). Nenhum CA delas muda.
