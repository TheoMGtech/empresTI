# Spec — dados iniciais: tenant, equipamentos e vínculo do professor

## Estado

**Status:** PRONTA — validada pelo responsável em 2026-11-11; spec vigente (descreve o
comportamento atual).

Aprovada pelo responsável em 2026-11-10. T-DADOS-01 a T-DADOS-12 concluídas em
`feature/002-dados-iniciais`, ainda sem integração. Nada foi aplicado em produção.
Verificação formal V-03, no commit `f88259101a15ef1b5bc8a06904eff6319bf01506`: `Veredito: PRONTA`
(`verificacao.md`). Validação final do responsável em 2026-11-11.

## Objetivo

Definir a estrutura de dados mínima do domínio e a carga inicial idempotente e não
destrutiva do EmpresTI: o tenant `suporte_ti`, os 12 equipamentos com metadados de
fotografia vindos do manifesto aprovado, a estrutura de auditoria e o vínculo seguro de
uma conta de professor já existente, sem empréstimos.

## Vínculos

- **PRD:** atores Colaborador e Operações; catálogo com a situação de cada item;
  equipamento em manutenção não aparece como disponível.
- **ADR-001:** §5 (Prisma Migrate, policies na migration, `prisma/seed.ts` idempotente),
  §6 (`tenant_id`, `memberships`, tenant `suporte_ti`), §7 (Supabase Auth, cadastro
  fechado, RLS deny by default), §8 (Testcontainers), §10 (segredos e auditoria).
- **Spec 001:** RS-LOGIN-04 e RS-LOGIN-05.
- **Layout:** `docs/layout.md`, tela 06, situações do equipamento.
- **Manifesto:** `docs/imagens-equipamentos/manifesto.json`, em estado `aprovado`.
- **Regras:** `rules/restrictions.md`, `rules/secrets.md`, `rules/migration.md`,
  `rules/tests.md` e `rules/checks.md`.

## Decisões tomadas

Decisões expressas do responsável:

| ID | Decisão |
|---|---|
| D1 | O professor tem papel `colaborador`. |
| D2 | TI-0004 e TI-0007 começam em manutenção. Os outros dez começam disponíveis, sem empréstimos. |
| D3 | Situações operacionais: `ativo`, `em_manutencao` e `fora_de_uso`. A disponibilidade efetiva considera também empréstimos em aberto, quando essa funcionalidade existir. |
| D4 | Patrimônios `TI-0001` a `TI-0012`, únicos por tenant. O nome não é identificador único. |
| D5 | Esta spec cobre a estrutura necessária, a carga inicial e o vínculo seguro do professor. Sem telas, catálogo ou solicitações de empréstimo. |
| D6 | Papéis iniciais: `colaborador` e `operacoes`, no modelo de memberships do ADR-001. |
| D7 | Número de série, local e observações não entram nesta etapa. Não se inventam dados ausentes do lote. |
| D8 | Testes com Postgres real seguem o Testcontainers do ADR-001. |
| D9 | A identidade do professor é criada manualmente pelo responsável, pelo fluxo seguro do Supabase Auth. O agente não cria usuários remotos, não inventa e-mail e não manipula senhas. A rotina local apenas vincula identidade previamente existente e validada, se essa operação for aprovada no plano. |
| D10 | Sem FK direta de `memberships.user_id` para `auth.users` nesta versão. A identidade é validada antes do vínculo, e o risco de referências órfãs e sua futura reconciliação ficam documentados. |
| D11 | A execução em TypeScript prioriza recursos existentes. Nenhuma dependência nova está autorizada. |
| D12 | A carga é idempotente e não destrutiva: cria registros ausentes, preserva nome e situação alterados depois e interrompe a transação, sem gravação parcial, se a fotografia de um patrimônio existente divergir do manifesto. |
| D13 | Armazenam-se o caminho do objeto no Storage e seu SHA-256. A URL pública é montada na camada de leitura. Autor e licença continuam no manifesto. |
| D14 | Operações remotas são reservadas ao responsável, com workflow manual e as proteções previstas. Nenhuma operação remota nesta fase. |
| D15 | Esta spec inclui a estrutura da tabela de auditoria, para cumprir o ADR-001 §10: append-only, com tenant, ator, ação, recurso e data. Os procedimentos que futuramente produzirão eventos não entram. O ADR não muda. |
| D16 | O cadastro público deve estar desabilitado antes de expor dados de produto. A configuração remota é do responsável. |
| D17 | O vínculo exige UUID válido, identidade existente no Supabase Auth, e-mail confirmado e usuário não banido. A solução precisa ser compatível com os ambientes de teste, sem inventar credenciais nem depender de escrita remota pelo agente. |
| D18 | Mantém-se o Testcontainers. `rules/checks.md` e `rules/migration.md` não mudam automaticamente. |

Determinado por documentos vigentes: tenant inicial `suporte_ti`, `tenant_id` em toda
tabela de domínio, RLS deny by default com policy explícita na migration, cadastro
fechado e nenhum segredo versionado.

## Escopo

- Estrutura lógica de tenants, memberships, equipamentos e auditoria.
- Carga inicial idempotente e não destrutiva do tenant e dos 12 equipamentos.
- Regras do vínculo da conta do professor.
- Testes de banco real, RLS e isolamento entre tenants.

## Fora de escopo

- Telas, catálogo, cadastro de equipamento, solicitação e devolução.
- Procedimentos tRPC novos, contexto de sessão e tenant, e os middlewares
  `protectedProcedure`, `tenantProcedure` e `adminProcedure`.
- Estrutura de empréstimos, limite de itens e prazo de devolução.
- Procedimentos que produzirão eventos de auditoria.
- Criação de usuários, envio de convite, recuperação ou troca de senha.
- Qualquer alteração remota nesta fase: Supabase, Auth, Storage, Vercel, Environment.
- Publicação de fotografias e conferência remota dos arquivos (IMG-16).
- Reconciliação de referências órfãs de `memberships.user_id`.
- Visibilidade de itens em manutenção ou fora de uso no catálogo. O PRD diz "não aparece
  como disponível", enquanto o layout traz tanto o card de manutenção quanto a nota "não
  aparece no catálogo". Fica para a spec do catálogo.

## Regras de negócio

**Tenant e equipamentos**

- **RN-DADOS-01** — Existe um tenant inicial identificado por `suporte_ti`.
- **RN-DADOS-02** — A carga garante os 12 patrimônios iniciais, um por item do manifesto
  e um registro por unidade física. Ela não limita, remove nem altera outros equipamentos
  que Operações venha a cadastrar no tenant.
- **RN-DADOS-03** — O patrimônio de cada equipamento é o `id` do item no manifesto e é
  único dentro do tenant. O nome nunca identifica: TI-0002 e TI-0004 têm o mesmo nome.
- **RN-DADOS-04** — A situação operacional é uma entre `ativo`, `em_manutencao` e
  `fora_de_uso`.
- **RN-DADOS-05** — A situação operacional inicial vem exclusivamente da tabela "Carga
  inicial" e só é aplicada na criação do registro.
- **RN-DADOS-06** — "Disponível" e "Emprestado" não são gravados. Só um equipamento
  `ativo` pode ser disponível e, quando existirem empréstimos, somente se não houver
  empréstimo em aberto para ele. A regra não tem leitura nesta spec e será provada pela
  spec que a implementar.
- **RN-DADOS-07** — Número de série, local e observações não são registrados nesta etapa.

**Fotografias e manifesto**

- **RN-DADOS-08** — Para os 12 patrimônios, a carga grava o caminho do objeto no Storage
  (`storage.destino_planejado`) e o SHA-256 (`arquivo.sha256`), ambos do manifesto. A URL
  pública não é gravada e será montada na camada de leitura. Autor e licença ficam só no
  manifesto. A estrutura não impede equipamentos futuros sem esses metadados.
- **RN-DADOS-09** — A carga recusa manifesto em estado anterior a `aprovado`, incompleto,
  com patrimônio repetido, com destino incoerente com o nome do arquivo ou cuja aprovação
  humana não corresponda ao SHA-256 do arquivo.
- **RN-DADOS-10** — O campo `item.situacao` do manifesto vale `selecionada` e descreve a
  seleção da fotografia. Ele não é a situação operacional do equipamento e nunca é usado
  para defini-la.
- **RN-DADOS-11** — A carga não afirma que uma fotografia foi publicada, não exige nem
  grava registro de publicação e não altera o manifesto.

**Reexecução**

- **RN-DADOS-12** — A carga é idempotente e não destrutiva. Ela cria o que falta e não
  atualiza nem remove registros existentes, preservando `nome` e `situacao` alterados
  depois dela.
- **RN-DADOS-13** — Se a fotografia de um patrimônio existente estiver ausente ou divergir
  do manifesto, a carga interrompe a transação inteira, sem gravação parcial.

**Papéis e conta do professor**

- **RN-DADOS-14** — Os papéis possíveis de um membership são `colaborador` e `operacoes`.
- **RN-DADOS-15** — A conta do professor tem um único membership, no tenant `suporte_ti`,
  com papel `colaborador`. Sua identidade é criada fora desta spec (D9).
- **RN-DADOS-16** — O vínculo só é criado para UUID válido, de identidade existente no
  Supabase Auth, com e-mail confirmado e não banida. Em qualquer outro caso, nada é
  gravado.
- **RN-DADOS-17** — `memberships.user_id` não tem FK para `auth.users` nesta versão.

**Empréstimos e auditoria**

- **RN-DADOS-18** — A carga e o vínculo não criam empréstimos, e esta spec não cria
  estrutura de empréstimos.
- **RN-DADOS-19** — Existe uma tabela de auditoria append-only com tenant, ator, ação,
  recurso e data. Ela nasce sem produtores de eventos: a carga e o vínculo não gravam
  nela.

## Carga inicial

| Patrimônio | Nome | Categoria | Situação inicial |
|---|---|---|---|
| TI-0001 | Notebook 14 polegadas | Notebook | `ativo` |
| TI-0002 | Notebook 15 polegadas | Notebook | `ativo` |
| TI-0003 | Notebook 13 polegadas | Notebook | `ativo` |
| TI-0004 | Notebook 15 polegadas | Notebook | `em_manutencao` |
| TI-0005 | Monitor 24 polegadas | Monitor | `ativo` |
| TI-0006 | Monitor 27 polegadas | Monitor | `ativo` |
| TI-0007 | Monitor 22 polegadas | Monitor | `em_manutencao` |
| TI-0008 | Cabo HDMI 2 m | Cabo | `ativo` |
| TI-0009 | Cabo USB-C 1 m | Cabo | `ativo` |
| TI-0010 | Cabo de rede 3 m | Cabo | `ativo` |
| TI-0011 | Webcam Full HD | Câmera | `ativo` |
| TI-0012 | Câmera compacta | Câmera | `ativo` |

Nome e categoria vêm do manifesto. A situação inicial vem desta tabela, por D2.

## Requisitos de segurança

- **RS-DADOS-01** — Toda tabela nova nasce com RLS habilitada e policy explícita na
  migration. `anon` e `authenticated` não leem nem escrevem nessas tabelas.
- **RS-DADOS-02** — Toda tabela de domínio tem `tenant_id`. A própria tabela de tenants
  é o cadastro deles e não o carrega.
- **RS-DADOS-03** — Nenhuma rotina desta spec cria usuário, abre cadastro ou envia
  convite.
- **RS-DADOS-04** — Nenhum artefato versionado, log ou saída contém senha, chave, token,
  string de conexão, e-mail real ou identificador real de usuário.
- **RS-DADOS-05** — Testes nunca apontam para banco remoto, e as rotinas recusam banco
  remoto sem confirmação explícita.
- **RS-DADOS-06** — Sessão sem membership continua sem acesso a dados de produto
  (RS-LOGIN-05).

## Contratos afetados

**Entrada: manifesto.** No topo: `estado`. Por item: `id`, `equipamento`, `categoria`,
`situacao` (só a seleção da fotografia, RN-DADOS-10), `arquivo.nome_relativo`,
`arquivo.sha256`, `storage.destino_planejado` e `aprovacao_humana.sha256_aprovado`.

**Dados, em nível lógico.** O DDL será apresentado no plano, conforme
`rules/migration.md`.

| Entidade | Campos | Unicidade |
|---|---|---|
| Tenant | identificador, `slug` | `slug` |
| Membership | `user_id`, `tenant_id`, `role` | `user_id` + `tenant_id` |
| Equipamento | identificador, `tenant_id`, `patrimonio`, `nome`, `categoria`, `situacao`, caminho do objeto, SHA-256 | `tenant_id` + `patrimonio` |
| Auditoria | identificador, `tenant_id`, ator, ação, recurso, data | identificador |

**Rotinas.** A carga fica em `prisma/seed.ts` (ADR-001), com o comando definido no plano.
A rotina de vínculo depende de aprovação no plano (D9).

**API e telas.** Nenhum procedimento tRPC, rota ou tela é criado ou alterado.

## Critérios de aceitação

**Estrutura e isolamento**

- **CA-DADOS-01** — As migrations aplicam do zero em Postgres real isolado com
  Testcontainers, sem passo manual.
- **CA-DADOS-02** — As tabelas novas têm RLS habilitada e policy explícita, e `anon` e
  `authenticated` não leem nem escrevem nelas.
- **CA-DADOS-03** — Equipamento, membership e auditoria não podem referenciar tenant
  inexistente.
- **CA-DADOS-04** — O mesmo patrimônio é aceito em outro tenant e rejeitado no mesmo
  tenant. Consulta filtrada pelo tenant A não devolve dado do tenant B.
- **CA-DADOS-05** — Situação ou papel fora dos valores definidos é rejeitado pelo banco.
- **CA-DADOS-06** — Equipamento não tem campos de número de série, local ou observações.
- **CA-DADOS-07** — `memberships.user_id` não tem FK para `auth.users`.

**Carga**

- **CA-DADOS-08** — Em banco vazio, a carga cria o tenant `suporte_ti` uma vez e
  exatamente os 12 patrimônios de TI-0001 a TI-0012.
- **CA-DADOS-09** — Após a carga, TI-0004 e TI-0007 estão em `em_manutencao`, os outros
  dez em `ativo` e nenhum em `fora_de_uso`, embora os 12 itens tenham
  `item.situacao = selecionada` no manifesto.
- **CA-DADOS-10** — Executar a carga duas vezes mantém as mesmas quantidades e os mesmos
  valores.
- **CA-DADOS-11** — `nome` e `situacao` alterados depois da carga permanecem após nova
  execução.
- **CA-DADOS-12** — Equipamentos fora dos 12, com ou sem fotografia, não impedem a carga
  e permanecem intactos.
- **CA-DADOS-13** — Se um dos 12 patrimônios faltar, nova execução cria só esse registro,
  com a situação da tabela "Carga inicial".
- **CA-DADOS-14** — Fotografia ausente ou divergente em patrimônio existente aborta a
  carga, e nenhum outro registro é criado nessa execução.

**Fotografias e manifesto**

- **CA-DADOS-15** — Nos 12 equipamentos, o caminho e o SHA-256 são iguais aos do
  manifesto. Nenhuma URL completa, autor ou licença é gravado.
- **CA-DADOS-16** — A carga recusa, sem gravar nada, manifesto em estado anterior a
  `aprovado`, com item faltando, com patrimônio repetido, com destino incoerente ou com
  aprovação divergente.
- **CA-DADOS-17** — A carga aceita o manifesto `aprovado` sem registro de publicação e
  não o altera.

**Empréstimos, identidade e auditoria**

- **CA-DADOS-18** — Carga e vínculo não criam empréstimos, e as migrations desta spec não
  criam estrutura de empréstimos.
- **CA-DADOS-19** — Nenhuma rotina desta spec chama cadastro ou convite de usuário, nem
  escreve em `auth.users`. Dados fictícios em banco de teste isolado não contam.
- **CA-DADOS-20** — A tabela de auditoria tem tenant, ator, ação, recurso e data.
- **CA-DADOS-21** — Alteração e exclusão de linhas de auditoria são rejeitadas, inclusive
  para o papel usado pelo Prisma, que ignora RLS.
- **CA-DADOS-22** — Carga e vínculo não gravam eventos de auditoria.

**Segurança e qualidade**

- **CA-DADOS-23** — Gitleaks não encontra vazamentos, e as saídas das rotinas apresentam somente
  contagens ou mensagens fixas de resultado e erro, sem expor dados pessoais, credenciais ou
  informações sensíveis de conexão.
- **CA-DADOS-24** — As rotinas recusam banco remoto sem confirmação explícita.
- **CA-DADOS-25** — O `AppRouter` e as rotas de tela permanecem sem procedimentos ou
  páginas novas.
- **CA-DADOS-26** — Nenhuma dependência nova entra em `package.json`.
- **CA-DADOS-27** — Lint, typecheck, testes e build passam, as verificações de
  `rules/checks.md` são cumpridas conforme o plano aprovado e cada CA tem teste ou
  evidência verificável.

### Critério condicionado à aprovação no plano

- **CA-DADOS-C1** (D9, D17) — A rotina de vínculo cria o membership `colaborador` para
  identidade válida e, repetida, não muda nada. UUID malformado, identidade inexistente,
  e-mail não confirmado e usuário banido são recusados sem gravar nada. Os testes usam
  dados fictícios em ambiente isolado.

## A demonstrar no plano

Não são decisões em aberto: o plano precisa resolver como cumpri-las.

- **D11** — Verificar a versão exata do Node no ambiente local e no CI antes de definir
  o comando da carga.
- **D14** — Definir como a carga chega à produção. O workflow `migrate-production` só
  aplica migrations, e criar outro workflow é mudança de configuração que depende de
  autorização própria (`rules/operacao.md`).
- **D15** — Definir o mecanismo que torna a auditoria append-only também para o papel que
  ignora RLS.
- **D17** — Definir como comprovar cada condição da identidade em produção e em teste. Se
  houver impedimento técnico, registrá-lo no plano.
- **D18** — Demonstrar como cumprir as verificações atuais de `rules/checks.md` e
  `rules/migration.md`, ou apresentar à parte uma proposta de mudança de processo.
- **Banco de teste** — A migration existente usa `TO anon` e `TO authenticated`, papéis
  ausentes em Postgres puro. O plano precisa criá-los antes das migrations.

## Dependências operacionais do responsável

Nenhuma é executada pelo agente, e nenhuma ocorre nesta fase.

- Desabilitar o cadastro público no Supabase Auth antes de expor dados de produto (D16).
  `docs/DEVOPS.md` registra `disable_signup: false`.
- Criar a identidade do professor pelo fluxo seguro do Supabase Auth (D9).
- Criar e proteger o Environment `production` e aplicar as migrations, inclusive a do
  andar zero.
- Executar a carga e o vínculo no ambiente remoto (D14).

## Riscos

| Risco | Consequência | Tratamento |
|---|---|---|
| Referência órfã: identidade apagada no Auth mantém o membership (D10) | Vínculo sem usuário | Validação antes do vínculo; reconciliação futura, fora desta spec |
| Arquivos remotos não conferidos (IMG-16 sem comprovação) | Item aponta para foto ausente ou diferente | RN-DADOS-11; a spec do catálogo trata imagem ausente |
| Cadastro público ligado | Qualquer pessoa obtém sessão válida | D16 e RS-DADOS-06 |
| Prisma ignora RLS | RLS não protege consultas do servidor nem impede alterar a auditoria | Middleware na spec que ler dados; CA-DADOS-21 |
| Rotina apontada para banco remoto | Escrita indevida | RS-DADOS-05 |
| Produção sem Environment e sem a migration do andar zero | Dados não chegam à produção | Dependência do responsável |
| Sem recuperação de senha na v1 | Conta do professor inutilizada | Canal seguro definido pelo responsável |

## Rastreabilidade

| Requisito | Critérios |
|---|---|
| RN-DADOS-01 | CA-DADOS-08 |
| RN-DADOS-02 | CA-DADOS-08, CA-DADOS-12 |
| RN-DADOS-03 | CA-DADOS-04, CA-DADOS-08 |
| RN-DADOS-04 | CA-DADOS-05 |
| RN-DADOS-05 | CA-DADOS-09, CA-DADOS-13 |
| RN-DADOS-06 | Spec que implementar a leitura |
| RN-DADOS-07 | CA-DADOS-06 |
| RN-DADOS-08 | CA-DADOS-12, CA-DADOS-15 |
| RN-DADOS-09 | CA-DADOS-16 |
| RN-DADOS-10 | CA-DADOS-09 |
| RN-DADOS-11 | CA-DADOS-17 |
| RN-DADOS-12 | CA-DADOS-10, CA-DADOS-11, CA-DADOS-13 |
| RN-DADOS-13 | CA-DADOS-14 |
| RN-DADOS-14 | CA-DADOS-05 |
| RN-DADOS-15, RN-DADOS-16 | CA-DADOS-C1 |
| RN-DADOS-17 | CA-DADOS-07 |
| RN-DADOS-18 | CA-DADOS-18 |
| RN-DADOS-19 | CA-DADOS-20, CA-DADOS-21, CA-DADOS-22 |
| RS-DADOS-01 | CA-DADOS-02 |
| RS-DADOS-02 | CA-DADOS-03, CA-DADOS-04 |
| RS-DADOS-03 | CA-DADOS-19 |
| RS-DADOS-04 | CA-DADOS-23 |
| RS-DADOS-05 | CA-DADOS-01, CA-DADOS-24 |
| RS-DADOS-06 | CA-DADOS-25 |
| D11 (sem dependência nova) | CA-DADOS-26 |
| Qualidade (`rules/checks.md`) | CA-DADOS-27 |
