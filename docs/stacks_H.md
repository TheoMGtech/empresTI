# Stack — base para o ADR-001 (turma B)

Documento de trabalho. Serve de insumo para `docs/adr/001-stack.md`.
Cada item tem escolha e uma linha de justificativa, no formato que o ADR espera.

---

## 1. Arquitetura e repositório

| Item | Escolha |
|---|---|
| Arquitetura | Monolito |
| Aplicação | Next.js (App Router), front e servidor no mesmo projeto |
| Repositório | Único |
| Deploy | Um projeto na Vercel |
| Camada de servidor | Route Handlers do Next, sem servidor separado |

- **Monolito** — não há equipe separada para front e back nem necessidade de escalar as partes de forma independente; separar criaria dois deploys, dois CI e uma fronteira HTTP para manter sem ganho.
- **Next.js App Router** — o servidor mora dentro do mesmo projeto do front, então a chamada de dados não atravessa domínio nem exige CORS.
- **Repositório único** — o tipo do procedimento e o tipo consumido na tela são o mesmo símbolo TypeScript; em repositórios separados isso viraria arquivo gerado.
- **"Monolito" é de código, não de processo** — na Vercel cada rota vira uma function; o que é único é o codebase e o deploy, não o runtime.

---

## 2. Camada de apresentação

| Item | Escolha |
|---|---|
| Linguagem | TypeScript em modo `strict` |
| Renderização | Client Components como padrão para telas com dados |
| Estado de servidor | TanStack Query via `@trpc/react-query` |
| Estado de cliente | `useState` e Context; sem biblioteca de store |
| Formulários | React Hook Form + `zodResolver` |
| Estilização | Tailwind CSS |
| Componentes | shadcn/ui |

- **TypeScript `strict`** — sem `strict` o tipo que vem do tRPC não pega os casos de nulo, que são exatamente os que quebram em produção.
- **Client Components como padrão** — misturar Server Components buscando dados direto no Prisma com tRPC buscando pelo cliente cria dois caminhos de acesso a dado, com duas checagens de permissão para manter em sincronia. Um caminho só é mais fácil de auditar.
- **TanStack Query pelo adapter do tRPC** — cache, revalidação e estado de loading já vêm resolvidos e tipados a partir do procedimento; escrever isso por tela é a maior fonte de bug repetido.
- **Sem biblioteca de store** — depois do TanStack Query sobra pouco estado de cliente (filtro, modal, wizard), e isso cabe em `useState`.
- **React Hook Form + zodResolver** — o mesmo schema Zod que valida a entrada do procedimento valida o formulário, então a regra é escrita uma vez.
- **Tailwind** — o design vem do Figma e precisa ser reproduzido de perto; biblioteca com visual próprio brigaria com isso.
- **shadcn/ui** — copia o componente para dentro do repositório em vez de esconder atrás de API de biblioteca, então customizar não vira luta contra a dependência.

---

## 3. Camada de servidor

| Item | Escolha |
|---|---|
| Padrão de API | tRPC |
| Endpoint | Route Handler em `app/api/trpc/[trpc]/route.ts` |
| Organização | `src/server/api/routers/<dominio>.ts`, um router por domínio |
| Camadas | Router (procedimento) → Service → Prisma |
| Validação de entrada | Zod no `.input()` de todo procedimento |
| Serialização | superjson |
| Contexto de request | Sessão, `tenant_id`, `role` e cliente Prisma montados no `createContext` |
| Server Actions | Não usadas |

- **tRPC** — já era a decisão; mantida. Com front e servidor no mesmo TypeScript, o tipo do retorno chega na tela sem geração de código nem contrato escrito à mão.
- **Um router por domínio** — organizar por camada técnica faz cada feature nova espalhar arquivo em pastas distantes; por domínio, a feature inteira fica junta.
- **Service separado do procedimento** — o procedimento cuida de entrada, contexto e permissão; a regra de negócio no service é o que dá para testar sem montar contexto de tRPC.
- **Zod em todo `.input()`** — é o que o tRPC usa para tipar a entrada; sem ele o procedimento aceita `unknown` e a validação vira `if` manual.
- **superjson** — sem transformer, `Date` e `Decimal` chegam como string na tela e cada componente refaz a conversão.
- **Contexto montado uma vez** — resolver sessão e tenant no `createContext` evita que cada procedimento repita a leitura do cookie, que é onde alguém esquece e abre buraco.
- **Sem Server Actions** — seria um segundo caminho de mutação, com outra forma de validar e outra de checar permissão; um caminho só é mais fácil de auditar.

---

## 4. Contrato e tipos

| Item | Escolha |
|---|---|
| Fonte da verdade | O `AppRouter` do tRPC |
| Consumo no cliente | `RouterInputs` e `RouterOutputs` inferidos, sem tipo escrito à mão |
| Versionamento | Nenhum |
| Formato de erro | `TRPCError` com código, tratado por `errorFormatter` |
| Paginação de listas | Cursor, via `useInfiniteQuery` |
| Consumidor externo | Fora de escopo |
| Tempo real | Fora de escopo |

- **`AppRouter` como fonte da verdade** — mudar o retorno de um procedimento quebra o build da tela que o consome, na hora, sem passo de geração.
- **Tipos inferidos** — declarar interface de resposta à mão recria a duplicação que o tRPC existe para eliminar.
- **Sem versionamento** — cliente e servidor sobem no mesmo deploy, então nunca existem duas versões em produção ao mesmo tempo.
- **`TRPCError` com `errorFormatter`** — dá formato único de erro para a tela tratar sem ler string de mensagem.
- **Cursor** — offset fica lento e duplica registro quando a lista recebe escrita concorrente; e o `useInfiniteQuery` já espera cursor.
- **Sem consumidor externo** — se um dia aparecer app mobile ou integração de terceiro, tRPC não serve e será preciso expor REST ao lado.
- **Sem tempo real** — function serverless não mantém conexão aberta; atualização de tela é polling do TanStack Query.

---

## 5. Dados e persistência

| Item | Escolha |
|---|---|
| Banco | PostgreSQL gerenciado pelo Supabase |
| ORM | Prisma |
| Dono do schema | Prisma Migrate (único) |
| RLS, policies e triggers | SQL bruto dentro das migrations do Prisma |
| Instância do Prisma | Singleton global, para sobreviver ao hot reload |
| Conexão de runtime | Supavisor, porta 6543, `?pgbouncer=true&connection_limit=1` |
| Conexão de migration | `directUrl`, porta 5432 |
| Seed | `prisma/seed.ts`, idempotente, cria o tenant `suporte_ti` |

- **Postgres no Supabase** — já era a decisão; mantida. Traz Auth e Storage sem eu operar servidor de banco.
- **Prisma** — já era a decisão; mantida. Tipagem gerada a partir do schema é o que evita divergência entre modelo e código, e alimenta o tipo que o tRPC devolve.
- **Prisma Migrate como dono único** — Prisma Migrate e Supabase CLI gerenciando o mesmo banco se sobrescrevem; ter dois donos de schema é como o ambiente diverge de produção sem ninguém notar.
- **Policies em SQL na migration** — o Prisma não modela RLS, policy nem trigger, então esses objetos precisam entrar na mesma linha do tempo versionada, não como script solto aplicado à mão pelo painel do Supabase.
- **Singleton do Prisma** — em desenvolvimento o Next recarrega o módulo a cada alteração e, sem singleton, cada recarga abre um cliente novo até esgotar a conexão.
- **`connection_limit=1`** — obrigatório em serverless, não recomendação: a Vercel escala instâncias em paralelo e cada uma abrindo pool próprio esgota a conexão do projeto.
- **Seed idempotente** — seed que só funciona em banco vazio não serve para ambiente de teste que roda várias vezes.

---

## 6. Multi-tenancy

| Item | Escolha |
|---|---|
| Modelo | Tenant discriminado por coluna, banco único |
| Coluna | `tenant_id` em toda tabela de domínio |
| Vínculo usuário–tenant | Tabela `memberships (user_id, tenant_id, role)` |
| Primeiro tenant | `suporte_ti`, criado no seed |
| Origem do tenant | Resolvido no `createContext` a partir da sessão, nunca do input |
| Aplicação do filtro | `tenantProcedure` injeta o `tenant_id` no service |

- **Coluna em banco único** — schema por tenant multiplicaria cada migration pelo número de tenants; para o escopo do projeto o isolamento lógico basta.
- **`tenant_id` em toda tabela** — tabela sem a coluna não tem como ser protegida por policy e vira o buraco por onde o dado vaza.
- **Tabela de membership** — a mesma pessoa pode atuar em mais de uma área com papel diferente em cada; papel gravado no usuário não representa isso.
- **Tenant vindo da sessão** — se o cliente manda o tenant no input do procedimento, trocar o valor é toda a exploração necessária.
- **Filtro por middleware, não por chamada** — depender de cada service lembrar do `where: { tenantId }` é depender de ninguém esquecer nunca.
- **Um tenant só no início** — a estrutura existe desde o primeiro schema mesmo com um único tenant, porque adicionar `tenant_id` depois exige backfill e revisão de toda query que toca a tabela.

---

## 7. Autenticação e autorização

| Item | Escolha |
|---|---|
| Provedor de identidade | Supabase Auth, e-mail e senha |
| Cadastro | Fechado, somente por convite de administrador |
| Integração com o Next | `@supabase/ssr` |
| Sessão no navegador | Cookie `httpOnly`, escrito pelo `@supabase/ssr` |
| Renovação de sessão | Middleware do Next em toda rota |
| Autorização | Middlewares do tRPC: `protectedProcedure`, `tenantProcedure`, `adminProcedure` |
| RLS | Habilitado em todas as tabelas, deny by default |
| Papel do RLS | Defesa em profundidade, não autorização primária |

- **Supabase Auth com e-mail e senha** — já era a decisão; mantida. Não há domínio corporativo para federar, então SSO fica fora de escopo.
- **Cadastro fechado por convite** — sem domínio de e-mail para filtrar, cadastro aberto deixa qualquer pessoa que descubra a URL criar conta num sistema que guarda inventário de infraestrutura.
- **`@supabase/ssr` com cookie `httpOnly`** — como front e servidor estão na mesma origem, o cookie funciona mesmo em `*.vercel.app`, e o token nunca fica legível por JavaScript. É a vantagem concreta do monolito nesse projeto.
- **Middleware renovando a sessão** — sem ele o token expira no meio da navegação e o usuário é deslogado sem motivo aparente.
- **Middlewares do tRPC em vez de biblioteca de permissão** — as regras são "está logado", "pertence ao tenant" e "é administrador"; encadear três middlewares resolve isso sem introduzir uma camada de definição de política para aprender.
- **Autorização no servidor, não no RLS** — o Prisma conecta com um role dono das tabelas, que **bypassa RLS por padrão**. Fazer as policies valerem exigiria abrir transação com `SET LOCAL role` e `SET LOCAL request.jwt.claims` a cada request, com custo de transação por chamada e atrito com o pooler.
- **RLS ligado mesmo assim** — se uma credencial vazar ou um procedimento esquecer o middleware, a policy é a última barreira entre tenants. Deny by default garante que tabela nova nasce fechada.

---

## 8. Testes

| Item | Escolha |
|---|---|
| Runner | Vitest, único para servidor e componentes |
| Componentes | Testing Library |
| Integração de banco | Testcontainers com Postgres real |
| Teste de procedimento | `createCaller` do tRPC, chamando o router direto |
| E2E de interface | Playwright |
| Teste obrigatório de isolamento | Um caso por procedimento: tenant A não enxerga dado de tenant B |
| Meta de cobertura | Sem percentual; caminhos críticos obrigatórios |

- **Vitest único** — já era a decisão; mantida. Com um projeto só, um runner só cobre servidor e tela, com a mesma config do build.
- **Testcontainers com Postgres real** — mockar o Prisma testa o mock, não o banco. Constraint, cascade, transação e policy de RLS só falham contra Postgres de verdade.
- **`createCaller`** — testa o procedimento com contexto montado à mão, incluindo middleware de sessão e tenant, sem subir servidor HTTP.
- **Playwright** — os fluxos que travam a operação (login, abertura de chamado, cadastro de ativo) precisam ser testados no navegador.
- **Teste de isolamento por procedimento** — vazamento entre tenants é a falha mais cara desse sistema e a mais fácil de introduzir sem perceber; precisa ser verificada por teste, não por revisão.
- **Sem meta de percentual** — meta de cobertura produz teste escrito para subir número; caminho crítico é critério verificável.

---

## 9. Hospedagem e operação

| Item | Escolha |
|---|---|
| Hospedagem | Vercel, um projeto |
| Plano | Hobby |
| Região das functions | Padrão do Hobby (Estados Unidos) |
| Região do Supabase | `sa-east-1` (São Paulo) |
| Limite de execução | 60s por request |
| Fila e agendamento | Fora de escopo; tudo roda dentro do request |
| Configuração | Variáveis de ambiente validadas com Zod no boot |
| Log | Log estruturado em JSON, com `request_id` e `tenant_id` |
| Rastreamento de erro | Sentry |
| CI | GitHub Actions |
| Migration em deploy | `prisma migrate deploy` em job do GitHub Actions, antes do deploy |

- **Vercel com um projeto** — o Next é o caso nativo da plataforma, então build, preview e roteamento funcionam sem adapter nem configuração extra.
- **Plano Hobby** — o Hobby cobre uso pessoal não-comercial, que é o caso: projeto de disciplina, sem cobrança e sem ninguém sendo pago para escrever o código. Se o sistema sair do contexto acadêmico, o plano precisa mudar antes.
- **Região padrão** — São Paulo é oferecida apenas no Pro; no Hobby as functions rodam nos EUA e cada query paga ida e volta transatlântica. Em contexto de demonstração é aceitável, mas é o primeiro item a mudar se o projeto for usado de verdade.
- **Supabase no plano gratuito** — projeto ocioso pode ser pausado depois de alguns dias sem uso; em semestre com intervalo entre entregas, vale confirmar o comportamento atual antes de uma apresentação.
- **Limite de 60s** — vira o teto de qualquer operação: importação de planilha de ativos e relatório grande precisam ser desenhados em lotes que caibam nesse tempo.
- **Sem fila e sem agendamento** — não há volume assíncrono conhecido; a consequência é que envio de e-mail e integração externa rodam dentro do request e seguram a resposta.
- **Env validado com Zod** — falhar na subida é melhor que `undefined` virando comportamento silencioso em produção. Vale separar as variáveis de servidor das expostas ao cliente, porque `NEXT_PUBLIC_` vai para o bundle.
- **Log com `tenant_id`** — investigar incidente em sistema multi-tenant sem poder filtrar por tenant é procurar no escuro.
- **Migration no CI, não no boot** — em serverless várias instâncias sobem em paralelo e tentariam migrar ao mesmo tempo.

---

## 10. Segurança

| Item | Escolha |
|---|---|
| Cabeçalhos HTTP | Configurados em `next.config.js` |
| CSP | Restritiva, sem `unsafe-inline` |
| Rate limit | Por IP e por usuário, com contador no Postgres |
| Segredos | Environment variables da Vercel; nada com prefixo `NEXT_PUBLIC_` |
| `service_role` key do Supabase | Somente em código de servidor |
| Auditoria | Tabela append-only com ator, tenant, ação e recurso |

- **Cabeçalhos no `next.config.js`** — cabeçalho de segurança ausente é achado previsível e barato de evitar; no Next não é preciso middleware para isso.
- **CSP restritiva** — o cookie é `httpOnly`, mas um XSS ainda faz request autenticado em nome do usuário; a CSP é o que impede.
- **Rate limit em Postgres** — contador em memória não funciona em serverless, porque cada instância tem o seu e o limite nunca é atingido.
- **`service_role` só no servidor** — essa chave ignora RLS; num arquivo que o bundle do cliente alcança, ela dá acesso total ao banco para qualquer visitante. A fronteira entre servidor e cliente no Next é fácil de cruzar por engano com um import.
- **Auditoria desde o início** — sistema de TI precisa responder quem mudou o quê; retrofitar log de auditoria depois não recupera o passado.

---

## 11. Qualidade de código

| Item | Escolha |
|---|---|
| Lint e formatação | ESLint + Prettier |
| Hook de pré-commit | lint-staged + husky, apenas lint e formatação |
| Convenção de commit | Nenhuma automação; mensagem escrita pela pessoa |

- **ESLint + Prettier** — com repositório único, uma config só vale para tudo.
- **Pré-commit só de lint** — barra o erro trivial antes do CI sem interferir na mensagem de commit.
- **Sem commitlint** — a mensagem é responsabilidade de quem commita; validação automática de formato seria cerimônia sem changelog gerado para justificar.

---

## Alternativas descartadas (material para a seção do ADR)

| Alternativa | Motivo do descarte |
|---|---|
| Front e API em projetos separados | Criaria fronteira HTTP, CORS e dois deploys sem equipe separada para justificar |
| REST com OpenAPI gerado | Passo de geração e cliente versionado que o tRPC dispensa dentro de um projeto só |
| GraphQL | Custo de schema, resolver e cache não se paga no volume de telas atual |
| Server Actions para mutação | Segundo caminho de mutação, com outra validação e outra checagem de permissão |
| Server Components buscando dado direto no Prisma | Segundo caminho de leitura, com a checagem de tenant duplicada em outro lugar |
| RLS como autorização primária | O Prisma bypassa RLS por padrão; fazer valer exigiria transação com `SET LOCAL` a cada request |
| Acesso a dado pelo cliente do Supabase em vez do Prisma | Deixaria RLS como autorização, mas espalharia o acesso a dado em dois caminhos e tiraria o tipo do Prisma de dentro do tRPC |
| Cadastro aberto por e-mail | Sem domínio corporativo para filtrar, qualquer pessoa com a URL criaria conta |
| SSO corporativo (OIDC/SAML) | Não há e-mail corporativo para federar |
| Sessão em `localStorage` pelo `supabase-js` | Legível por XSS, e desnecessário: mesma origem permite cookie `httpOnly` |
| Supabase CLI como dono das migrations | Dois donos de schema no mesmo banco se sobrescrevem |
| CASL ou biblioteca de política | As regras cabem em três middlewares de tRPC; a camada extra seria conceito a mais para aprender |
| Zustand ou Redux | O estado de cliente que sobra depois do TanStack Query é pequeno demais |
| Biblioteca de componentes fechada (MUI, Mantine) | O design vem do Figma e precisaria ser imposto por cima do visual da biblioteca |
| Fila (BullMQ, pg-boss) | Sem volume assíncrono conhecido, e worker de vida longa não roda na Vercel |
| Schema ou banco por tenant | Multiplicaria cada migration pelo número de tenants sem exigência que justifique |
| Prisma mockado nos testes | Testa o mock; constraint, transação e policy não são exercitadas |

---

## Consequências (material para a seção do ADR)

**Fica mais fácil**
- Mudar o retorno de um procedimento quebra o build da tela que o consome, na hora, sem passo de geração.
- Sessão segura sem esforço: mesma origem permite cookie `httpOnly` sem domínio próprio e sem CORS.
- Uma feature inteira cabe em um PR, num repositório só.
- Menos infraestrutura para montar: um projeto na Vercel, um CI, um runner de teste.
- Deploy atômico: tela e servidor sobem juntos, então nunca há versão do cliente falando com servidor de outra versão.

**Fica mais difícil**
- Escalar as partes de forma independente: front e servidor sobem sempre juntos.
- Segurar a fronteira servidor/cliente: um import errado leva chave secreta para o bundle, e o compilador não avisa em todos os casos.
- Aproveitar Server Components: a decisão de buscar tudo por tRPC descarta o principal recurso do App Router.
- Latência: com as functions nos EUA e o banco em São Paulo, cada query paga a travessia.
- Cold start: a primeira invocação depois de ociosidade paga a inicialização.
- Qualquer operação precisa caber em 60s, o que obriga a desenhar importação e relatório em lotes.
- Envio de e-mail e integração externa seguram a resposta do request.
- Manter middlewares e RLS coerentes exige disciplina — policy desatualizada dá falsa sensação de proteção.

**O que isso impede de fazer depois sem custo**
- Atender consumidor não-TypeScript (app mobile nativo, integração de terceiro, webhook tipado): tRPC não serve e seria preciso expor REST ao lado.
- Qualquer funcionalidade com conexão aberta (notificação em tempo real, streaming de log): a Vercel não suporta WebSocket.
- Processamento longo (importação grande, varredura de rede): estoura o limite de execução.
- Trabalho agendado ou assíncrono: exige fila e um lugar para o worker rodar, que não é a Vercel.
- Separar o servidor do front depois: o acoplamento de tipo entre tela e router é justamente o que torna a separação trabalhosa.
- Trocar Prisma por outro ORM: as migrations e o SQL de RLS estão dentro do Prisma Migrate.
- Sair do Supabase: Auth, banco e políticas estão acoplados ao projeto.
- Adicionar `tenant_id` a uma tabela criada sem ele: exige backfill e revisão de toda query que a toca.
- Federar com identidade corporativa depois: exige migrar os usuários já cadastrados por e-mail e senha.

**Dependência do contexto acadêmico**
- O plano Hobby só vale enquanto o projeto for didático. Se a empresa passar a usar o sistema, é preciso migrar para Pro antes.

---

## O que este ADR não decide

- Modelagem de domínio, entidades e relacionamentos.
- Design system, tokens e identidade visual.
- Papéis e matriz de permissão dentro de cada tenant.
- Provisionamento de tenant: quem cria, como se convida usuário.
- Provedor de e-mail transacional e demais integrações.
- Estratégia de backup, retenção e plano de recuperação.
- Ambientes (quantos, como são promovidos) e política de branch.
- Feature flags.
- Observabilidade além de log e erro (métrica, tracing distribuído).
- LGPD: base legal, política de retenção e fluxo de exclusão de dados.
- SLO, meta de latência e orçamento de custo.
