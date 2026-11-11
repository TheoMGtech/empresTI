# Tarefas — dados iniciais: tenant, equipamentos e vínculo do professor

## Estado

**Status:** Aprovadas com condições pelo responsável em 2026-11-10. `T-DADOS-01` a `11`
concluídas. `T-DADOS-12` depende de autorização própria.

Regras de execução:

- Uma tarefa por vez. Ao concluir, rodar `rules/checks.md`, mostrar o resultado e parar.
- Migrations de `T-DADOS-03` e `T-DADOS-05` não estão autorizadas: o DDL passa antes por
  revisão específica, e os comandos protegidos são do responsável, com conferência do
  destino antes de cada execução.
- Mudança em `tsconfig.json`, `engines` ou outra opção global exige demonstração prévia.
  Havendo impacto em deploy ou exigência das regras, apresentar e parar.
- Um commit por tarefa, citando a tarefa e os CAs.
- Todo teste cita no nome o CA que evidencia.
- O agente não executa `prisma migrate`, `prisma db` nem rotinas fora de teste.

## Estrutura de dados

- [x] **T-DADOS-01 — Banco real de teste e execução TypeScript**
  - Criar `src/test/banco-real.ts`, seus testes e a sonda de execução TypeScript, todos em
    `src/test/`, sem mudança em configuração global.
  - Atende: CA-DADOS-01 (migration do andar zero), CA-DADOS-26.
  - Testes: a migration existente aplica do zero em container descartável, sem CLI do
    Prisma; o host não local é recusado; sem Docker a suíte falha; um arquivo `.ts` real
    importa `@prisma/client`, `@prisma/adapter-pg` e `zod` executado com `node`, localmente
    e em Node 22 no CI quando houver PR.
  - Não cria nem aplica migrations do domínio.
  - Commit: `chore(testes): subir Postgres isolado e provar execução TypeScript`.

- [x] **T-DADOS-02 — Guarda contra banco remoto**
  - Criar `prisma/rotinas/guarda-banco.ts`.
  - Atende: CA-DADOS-24.
  - Testes: aceita hosts locais; recusa remoto sem confirmação; recusa confirmação com
    host diferente; recusa URL ausente ou malformada; a mensagem não repete a URL.
  - Commit: `feat(banco): recusar banco remoto sem confirmação explícita`.

- [x] **T-DADOS-03 — Migration da estrutura do domínio**
  - Atualizar `prisma/schema.prisma` com tenants, memberships e equipamentos.
  - Gerar a migration, com RLS e policies no SQL gerado.
  - Atende: CA-DADOS-01, CA-DADOS-03, CA-DADOS-04, CA-DADOS-05, CA-DADOS-06, CA-DADOS-07.
  - Testes: migrations do zero; FK de tenant; mesmo patrimônio em outro tenant e no mesmo
    tenant; consulta por tenant A não devolve B; valores inválidos de situação e papel;
    ausência das colunas de D7; ausência de FK para `auth.users`.
  - Parada 1: apresentar o DDL final para revisão específica e parar.
  - Parada 2: com `scripts/banco-local.mjs` autorizado, o responsável confere o destino,
    gera a migration e, depois do SQL de RLS, executa `prisma:reset`.
  - Commit: `feat(banco): criar tenants, memberships e equipamentos com RLS`.

## Segurança e auditoria

- [x] **T-DADOS-04 — Provas de RLS deny by default**
  - Atende: CA-DADOS-02, nas três tabelas da T-DADOS-03.
  - Testes: `relrowsecurity` ligado e policies em `pg_policies`; com `SET ROLE anon` e
    `authenticated`, leitura sem linhas e escrita rejeitada por RLS, com privilégios
    concedidos para não confundir com permissão negada.
  - Commit: `test(banco): provar RLS deny by default nas tabelas de domínio`.

- [x] **T-DADOS-05 — Migration da auditoria append-only**
  - Atualizar `prisma/schema.prisma`, gerar a migration e acrescentar triggers, RLS e
    policies.
  - Atende: CA-DADOS-02 (auditoria), CA-DADOS-03 (auditoria), CA-DADOS-20, CA-DADOS-21.
  - Testes: campos existem; tenant inexistente é rejeitado; `INSERT` funciona como dono;
    `UPDATE`, `DELETE` e `TRUNCATE` são rejeitados como `empresti_dono`, não superusuário;
    `anon` e `authenticated` não acessam.
  - Parada 1: apresentar o DDL final para revisão específica e parar.
  - Parada 2: o responsável confere o destino, gera a migration e executa `prisma:reset`.
  - Commit: `feat(banco): criar auditoria append-only`.

## Carga inicial

- [x] **T-DADOS-06 — Validação do manifesto**
  - Criar `prisma/rotinas/manifesto.ts`, com Zod e sem importar `skills/`.
  - Atende: CA-DADOS-16, CA-DADOS-17.
  - Testes: aceita `aprovado` sem `publicacao`; aceita o manifesto versionado; rejeita
    `final_revisao`, 11 itens, ID repetido, aprovação divergente e destino incoerente; o
    arquivo não é alterado.
  - Commit: `feat(seed): validar manifesto aprovado de fotografias`.

- [x] **T-DADOS-07 — Carga em banco vazio**
  - Criar `prisma/rotinas/carga-inicial.ts` e `prisma/seed.ts`.
  - Atende: CA-DADOS-08, CA-DADOS-09, CA-DADOS-15, CA-DADOS-22 (carga),
    CA-DADOS-23 (carga).
  - Testes: tenant único e 12 patrimônios; TI-0004 e TI-0007 em `em_manutencao`, dez em
    `ativo`, apesar de `item.situacao = selecionada`; ID sem entrada na tabela falha;
    caminho e SHA-256 iguais ao manifesto; nenhuma URL, autor ou licença; `auditoria`
    continua vazia; saída só com contagens.
  - Commit: `feat(seed): carregar tenant e 12 equipamentos do manifesto`.

- [x] **T-DADOS-08 — Reexecução não destrutiva**
  - Completar `prisma/seed.ts` com a comparação de fotografia e a transação única.
  - Atende: CA-DADOS-10, CA-DADOS-11, CA-DADOS-12, CA-DADOS-13, CA-DADOS-14.
  - Testes: duas execuções idênticas; `nome` e `situacao` preservados; equipamentos fora
    dos 12, com e sem foto, intactos; patrimônio apagado é recriado sozinho com a situação
    da tabela; foto ausente ou divergente aborta sem criar nada; o código não chama
    `update`, `upsert` nem `delete` em equipamentos.
  - Commit: `feat(seed): garantir carga idempotente e não destrutiva`.

## Vínculo do professor

- [x] **T-DADOS-09 — Verificação de identidade**
  - Criar `prisma/rotinas/identidade.ts`, com a porta `ConsultaIdentidade` e a consulta a
    `auth.users`.
  - Atende: CA-DADOS-C1 (validação), CA-DADOS-19 (leitura sem escrita).
  - Testes, com `auth.users` mínimo em banco isolado: UUID malformado, inexistente,
    excluído, não confirmado, banido, banimento vencido, válido; coluna ausente e falta de
    permissão resultam em `IDENTIDADE_INDETERMINADA`; a consulta não seleciona e-mail.
  - Commit: `feat(vinculo): verificar identidade do professor sem credenciais`.

- [x] **T-DADOS-10 — Rotina de vínculo**
  - Criar `prisma/vincular-professor.ts`.
  - Atende: CA-DADOS-C1, CA-DADOS-18 (vínculo), CA-DADOS-22 (vínculo),
    CA-DADOS-23 (vínculo).
  - Testes: cria `colaborador` em `suporte_ti`; repetir não muda nada; papel diferente
    aborta; cada recusa não grava; banco remoto é recusado; a saída não repete o UUID;
    `auditoria` continua vazia.
  - Commit: `feat(vinculo): vincular identidade existente ao tenant inicial`.

## Verificações

- [x] **T-DADOS-11 — Provas finais e estado da spec**
  - Adicionar os testes estáticos restantes e atualizar o `## Estado` da spec para
    `Implementada`, marcando estas tarefas.
  - Atende: CA-DADOS-18, CA-DADOS-19, CA-DADOS-22, CA-DADOS-23, CA-DADOS-25, CA-DADOS-26,
    CA-DADOS-27.
  - Testes: migrations sem estrutura de empréstimos; rotinas sem chamadas de cadastro ou
    convite e sem escrita em `auth.users`; `AppRouter` só com `autenticacao` e `tecnico`;
    `package.json` sem dependência nova; busca por CA encontra ao menos um teste.
  - Evidência: lint, typecheck, testes, build e `git status --short`; Gitleaks no CI.
  - Commit: `test(dados): provar critérios finais da spec 002`.

- [ ] **T-DADOS-12 — Verificação formal**
  - Rodar os checks no commit exato, delegar ao `verificador-spec` e registrar em
    `verificacao.md`, conforme `rules/spec-flow.md`.
  - Atende: registro de todos os CAs, incluindo CA-DADOS-C1.
  - Evidência: `Veredito` do relatório, sem edição. Se for `NÃO PRONTA`, volta às tarefas.
  - Commit: `docs(specs): registrar verificação da spec 002`.

## Fora destas tarefas

Operações do responsável, depois da integração: Environment `production`, migrations
remotas, cadastro público, carga e vínculo remotos, criação da identidade do professor.
O manifesto continua em `aprovado`, e IMG-16 continua sem comprovação.

## Rastreabilidade

| Critério | Tarefas |
|---|---|
| CA-DADOS-01 | T-DADOS-01, T-DADOS-03 |
| CA-DADOS-02 | T-DADOS-04, T-DADOS-05 |
| CA-DADOS-03 | T-DADOS-03, T-DADOS-05 |
| CA-DADOS-04 | T-DADOS-03 |
| CA-DADOS-05 | T-DADOS-03 |
| CA-DADOS-06 | T-DADOS-03 |
| CA-DADOS-07 | T-DADOS-03 |
| CA-DADOS-08 | T-DADOS-07 |
| CA-DADOS-09 | T-DADOS-07 |
| CA-DADOS-10 | T-DADOS-08 |
| CA-DADOS-11 | T-DADOS-08 |
| CA-DADOS-12 | T-DADOS-08 |
| CA-DADOS-13 | T-DADOS-08 |
| CA-DADOS-14 | T-DADOS-08 |
| CA-DADOS-15 | T-DADOS-07 |
| CA-DADOS-16 | T-DADOS-06 |
| CA-DADOS-17 | T-DADOS-06 |
| CA-DADOS-18 | T-DADOS-10, T-DADOS-11 |
| CA-DADOS-19 | T-DADOS-09, T-DADOS-11 |
| CA-DADOS-20 | T-DADOS-05 |
| CA-DADOS-21 | T-DADOS-05 |
| CA-DADOS-22 | T-DADOS-07, T-DADOS-10, T-DADOS-11 |
| CA-DADOS-23 | T-DADOS-07, T-DADOS-10, T-DADOS-11 |
| CA-DADOS-24 | T-DADOS-02 |
| CA-DADOS-25 | T-DADOS-11 |
| CA-DADOS-26 | T-DADOS-01, T-DADOS-11 |
| CA-DADOS-27 | T-DADOS-11 |
| CA-DADOS-C1 | T-DADOS-09, T-DADOS-10 |
