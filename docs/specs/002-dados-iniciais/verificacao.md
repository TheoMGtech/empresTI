# Verificações — 002-dados-iniciais

| Execução | Data | Commit verificado | CAs não ATENDIDOS | Checks `falhou` | Veredito |
|---|---|---|---|---|---|
| V-01 | 2026-11-11 | 2403ef9953946127cba7a4e9c398f7ff32dfa149 | CA-DADOS-23: AMBÍGUO; CA-DADOS-27: SEM TESTE | `npm run prisma:reset` | NÃO PRONTA |
| V-02 | 2026-11-11 | 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825 | CA-DADOS-02: REPROVADO; CA-DADOS-27: SEM TESTE | `npm run lint`; `npm run typecheck` | NÃO PRONTA |

## V-01 — 2026-11-11

- Spec: `docs/specs/002-dados-iniciais/spec.md`
- Commit verificado: 2403ef9953946127cba7a4e9c398f7ff32dfa149
- Veredito: NÃO PRONTA — CA-DADOS-23 está AMBÍGUO, CA-DADOS-27 está SEM TESTE e o check `npm run prisma:reset` consta como falhou, por não ter sido executado no commit verificado e não ter saída registrada para a migration `criar_auditoria`.
- Relatório original: sessão 45bef9d2-07ca-4f5f-90c2-24941286b345, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

```text
Aja conforme agents/verificador-spec.md.

Caminho da spec: docs/specs/002-dados-iniciais/spec.md

Commit verificado: 2403ef9953946127cba7a4e9c398f7ff32dfa149 (estado presente na pasta de trabalho, sem alterações)

O que verificar:
- docs/DEVOPS.md
- docs/specs/002-dados-iniciais/plan.md
- docs/specs/002-dados-iniciais/spec.md
- docs/specs/002-dados-iniciais/tasks.md
- package.json
- prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql
- prisma/migrations/20261111025735_criar_auditoria/migration.sql
- prisma/rotinas/carga-inicial.ts
- prisma/rotinas/carga.test.ts
- prisma/rotinas/carga.ts
- prisma/rotinas/guarda-banco.test.ts
- prisma/rotinas/guarda-banco.ts
- prisma/rotinas/identidade.test.ts
- prisma/rotinas/identidade.ts
- prisma/rotinas/manifesto.test.ts
- prisma/rotinas/manifesto.ts
- prisma/rotinas/vinculo.test.ts
- prisma/rotinas/vinculo.ts
- prisma/schema.prisma
- prisma/seed.ts
- prisma/vincular-professor.ts
- skills/imagens-equipamentos/scripts/preparar.test.mjs
- src/test/auditoria.test.ts
- src/test/banco-real.test.ts
- src/test/banco-real.ts
- src/test/estrutura-dominio.test.ts
- src/test/provas-finais-spec-002.test.ts
- src/test/rls-dominio.test.ts
- src/test/sonda-typescript-auxiliar.ts
- src/test/sonda-typescript.ts
- tsconfig.json
- vitest.config.ts

Evidência dos checks:

CI, GitHub Actions, workflow "Architecture checks", run 42959771474, PR 43, commit 2403ef9953946127cba7a4e9c398f7ff32dfa149, em 2026-11-11, Node v22.23.4, npm 10.9.9:
- `npm run lint`: job concluído com sucesso. Última linha: o próprio comando, sem saída de erro.
- `npm run typecheck`: job concluído com sucesso. Última linha: `> node ./node_modules/typescript/bin/tsc --noEmit`, sem saída de erro.
- `npm test`: passou. Última linha do resumo: `Tests  809 passed (809)`; `Test Files  23 passed (23)`.
- `npm run build`: passou. Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- Gitleaks 8.24.3, job "Documentation and secret guard": `15 commits scanned.`, `no leaks found`.

Pasta local, Windows, Node v24.14.1, commit 2403ef9953946127cba7a4e9c398f7ff32dfa149, em 2026-11-11:
- `npm run lint`: código 0, sem saída de erro.
- `node ./node_modules/eslint/bin/eslint.js prisma/vincular-professor.ts`: código 0, sem saída.
- `npm run typecheck`: código 0, sem saída de erro.
- `npm test`: código 0. Total 809, aprovados 808, falhas 0, ignorados 1.
- `npm run build`: código 0. Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- `git status --short`: vazio antes dos checks; depois do build, só `next-env.d.ts`, desfeito.

`npm run test:e2e`: não executado.

`npm run prisma:reset`: não executado no commit verificado nem pelo agente principal. Foi executado pelo responsável em PostgreSQL local descartável, em 127.0.0.1:55432. Para as migrations 20261023110257_criar_saude_sistema e 20261111020031_criar_estrutura_dominio, em 2026-11-11, antes do commit fc4c92c075a792a465b1b3d7e051f6af8f0e71e0, com a saída registrada: `Database reset successful`, seguida da lista das duas migrations aplicadas. Para a migration 20261111025735_criar_auditoria, em 2026-11-11, o responsável confirmou a execução sem fornecer a saída. Os arquivos dessas migrations não mudaram depois disso até o commit verificado.
```

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/002-dados-iniciais/spec.md
Commit verificado: 2403ef9953946127cba7a4e9c398f7ff32dfa149

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-DADOS-01 | src/test/estrutura-dominio.test.ts:99, src/test/banco-real.test.ts:86 → src/test/banco-real.ts:110 | ATENDIDO | As três migrations são aplicadas automaticamente em container descartável, sem CLI nem passo manual. |
| CA-DADOS-02 | src/test/rls-dominio.test.ts:130, 141, 187, 202, 222, 238; src/test/auditoria.test.ts:347, 377, 389, 409 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:76-92; prisma/migrations/20261111025735_criar_auditoria/migration.sql:45-51 | ATENDIDO | As quatro tabelas novas são cobertas, com experimentos de controle que isolam a RLS da falta de GRANT. |
| CA-DADOS-03 | src/test/estrutura-dominio.test.ts:158, 166; src/test/auditoria.test.ts:247 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:58, 61; prisma/migrations/20261111025735_criar_auditoria/migration.sql:17 | ATENDIDO | As três FKs rejeitam tenant inexistente com o código 23503. |
| CA-DADOS-04 | src/test/estrutura-dominio.test.ts:208, 219, 245 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:55 | ATENDIDO | Unicidade por tenant e consulta filtrada foram exercitadas em banco real. |
| CA-DADOS-05 | src/test/estrutura-dominio.test.ts:307, 319, 331 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:5, 8 | ATENDIDO | A rejeição vem do enum do banco, com o código 22P02. |
| CA-DADOS-06 | src/test/estrutura-dominio.test.ts:409 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:30-43; prisma/schema.prisma:66-82 | ATENDIDO | A lista exata de colunas exclui número de série, local e observações. |
| CA-DADOS-07 | src/test/estrutura-dominio.test.ts:434 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:20-27, 58 | ATENDIDO | A única FK de memberships aponta para tenants. |
| CA-DADOS-08 | prisma/rotinas/carga.test.ts:133, 143 → prisma/rotinas/carga.ts:51, 77 | ATENDIDO | Um tenant `suporte_ti` e exatamente TI-0001 a TI-0012 em banco vazio. |
| CA-DADOS-09 | prisma/rotinas/carga.test.ts:166, 179 → prisma/rotinas/carga.ts:30, 37; prisma/rotinas/carga-inicial.ts:6-19 | ATENDIDO | A situação vem só da tabela, e o teste confirma `selecionada` nos 12 itens do manifesto. |
| CA-DADOS-10 | prisma/rotinas/carga.test.ts:337, 344 → prisma/rotinas/carga.ts:77-80 | ATENDIDO | O retrato completo das linhas, com datas e identificadores, não muda entre execuções. |
| CA-DADOS-11 | prisma/rotinas/carga.test.ts:388, 400, 411 → prisma/rotinas/carga.ts:77-80 | ATENDIDO | `nome` e `situacao` alterados permanecem após nova execução. |
| CA-DADOS-12 | prisma/rotinas/carga.test.ts:431, 455 → prisma/rotinas/carga.ts:59-65 | ATENDIDO | A leitura se restringe aos 12 patrimônios do tenant, e os demais ficam intactos. |
| CA-DADOS-13 | prisma/rotinas/carga.test.ts:479, 497 → prisma/rotinas/carga.ts:30, 77-80 | ATENDIDO | Só o ausente é recriado, com a situação da tabela, inclusive `em_manutencao`. |
| CA-DADOS-14 | prisma/rotinas/carga.test.ts:515, 531 → prisma/rotinas/carga.ts:67-75 | ATENDIDO | Fotografia ausente ou divergente aborta, e o patrimônio que faltava não é criado. |
| CA-DADOS-15 | prisma/rotinas/carga.test.ts:195, 213 → prisma/rotinas/manifesto.ts:121-127; prisma/rotinas/carga.ts:33-40 | ATENDIDO | O teste da linha 213 não compara o valor da licença. A ausência dela decorre da igualdade exata das colunas de texto (linha 195) e da lista de colunas de src/test/estrutura-dominio.test.ts:409. |
| CA-DADOS-16 | prisma/rotinas/manifesto.test.ts:120, 173, 197, 232, 247; prisma/rotinas/carga.test.ts:265, 278, 580 → prisma/rotinas/carga.ts:91; prisma/rotinas/manifesto.ts:107-119 | ATENDIDO | Destino incoerente e aprovação divergente são provados na validação, sem banco. A ausência de escrita decorre de `lerManifesto` lançar antes de `executarCarga`, caminho exercitado com banco nos demais casos. |
| CA-DADOS-17 | prisma/rotinas/manifesto.test.ts:59, 101 → prisma/rotinas/manifesto.ts:12, 131-149 | ATENDIDO | O manifesto versionado não tem `publicacao`, e o hash do arquivo não muda com a leitura. |
| CA-DADOS-18 | src/test/provas-finais-spec-002.test.ts:48, 87; prisma/rotinas/vinculo.test.ts:251 → prisma/rotinas/carga.ts:50-83; prisma/rotinas/vinculo.ts:33-60 | ATENDIDO | Migrations e rotinas não têm estrutura nem escrita de empréstimos. |
| CA-DADOS-19 | src/test/provas-finais-spec-002.test.ts:52, 71, 77; prisma/rotinas/identidade.test.ts:272, 320; prisma/rotinas/vinculo.test.ts:270 → prisma/rotinas/identidade.ts:52-56 | ATENDIDO | Há só leitura de `auth.users`, comprovada também em transação somente leitura. |
| CA-DADOS-20 | src/test/auditoria.test.ts:136 → prisma/migrations/20261111025735_criar_auditoria/migration.sql:2-11 | ATENDIDO | Todos os campos existem e são obrigatórios. |
| CA-DADOS-21 | src/test/auditoria.test.ts:269, 289, 307 → prisma/migrations/20261111025735_criar_auditoria/migration.sql:28-42 | ATENDIDO | UPDATE, DELETE e TRUNCATE são barrados para o papel dono, que não é superusuário. |
| CA-DADOS-22 | prisma/rotinas/carga.test.ts:242; prisma/rotinas/vinculo.test.ts:262; src/test/provas-finais-spec-002.test.ts:91 → prisma/rotinas/carga.ts:50-83; prisma/rotinas/vinculo.ts:33-60 | ATENDIDO | A tabela de auditoria continua vazia após carga e vínculo. |
| CA-DADOS-23 | prisma/rotinas/carga.test.ts:638; prisma/rotinas/vinculo.test.ts:308, 345; src/test/provas-finais-spec-002.test.ts:95; Gitleaks 8.24.3, run 42959771474 → prisma/seed.ts:24, 38; prisma/vincular-professor.ts:51-53, 68 | AMBÍGUO | Gitleaks passou e não há dado pessoal ou credencial nas saídas, mas o vínculo imprime "Vínculo criado." e as recusas imprimem código e mensagem, o que não é contagem. Falta decidir se "só contagens" admite mensagens fixas de resultado e de erro, como o plano prevê para o vínculo. |
| CA-DADOS-24 | prisma/rotinas/guarda-banco.test.ts:73, 137; prisma/rotinas/carga.test.ts:658; prisma/rotinas/vinculo.test.ts:382 → prisma/rotinas/guarda-banco.ts:108-133; prisma/seed.ts:13; prisma/vincular-professor.ts:42 | ATENDIDO | As duas rotinas chamam a guarda antes de abrir conexão. |
| CA-DADOS-25 | src/test/provas-finais-spec-002.test.ts:101, 110 → src/server/api/raiz.ts:5-8 | ATENDIDO | Só os procedimentos de autenticação e técnico e as três rotas existentes. |
| CA-DADOS-26 | src/test/provas-finais-spec-002.test.ts:122; src/test/banco-real.test.ts:189 → package.json:22-64 | ATENDIDO | A lista esperada é fixada no próprio teste. `package-lock.json` não está entre os arquivos verificados, o que é coerente com a ausência de dependência nova. |
| CA-DADOS-27 | src/test/provas-finais-spec-002.test.ts:179, 183; evidência dos checks na delegação → package.json:12-14 | SEM TESTE | `npm run prisma:reset`, aplicável porque há migrations, não rodou no commit verificado, e a execução da migration `criar_auditoria` não tem saída registrada. `npm run test:e2e` não se aplica: o plano e a lista de arquivos não tocam tela, rota ou fluxo de navegador. |
| CA-DADOS-C1 | prisma/rotinas/vinculo.test.ts:112, 126, 164; prisma/rotinas/identidade.test.ts:119, 173, 191, 201 → prisma/rotinas/vinculo.ts:33-60; prisma/rotinas/identidade.ts:64-78 | ATENDIDO | Criação, repetição e as quatro recusas foram provadas sem gravação, com UUIDs gerados e `auth.users` mínimo em banco isolado. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → passou
`node ./node_modules/eslint/bin/eslint.js prisma/vincular-professor.ts` → passou
`npm run typecheck` → passou
`npm test` → passou
`npm run build` → passou
`git status --short` → passou
`npm run prisma:reset` → falhou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-DADOS-23 está AMBÍGUO, CA-DADOS-27 está SEM TESTE e o check `npm run prisma:reset` consta como falhou, por não ter sido executado no commit verificado e não ter saída registrada para a migration `criar_auditoria`.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: primeira execução.
- 2026-11-11: o `npm run prisma:reset` é reservado ao responsável, e o CA-DADOS-23 depende de decisão dele sobre o texto do critério.

## V-02 — 2026-11-11

- Spec: `docs/specs/002-dados-iniciais/spec.md`
- Commit verificado: 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825
- Veredito: NÃO PRONTA — CA-DADOS-02 está REPROVADO (TRUNCATE não bloqueado para `anon` e `authenticated` em `memberships` e `equipamentos`), CA-DADOS-27 está SEM TESTE e os checks `npm run lint` e `npm run typecheck` constam como falhou por não trazerem a última linha da saída.
- Relatório original: sessão 45bef9d2-07ca-4f5f-90c2-24941286b345, subagente `verificador-spec`.

### Evidências entregues ao verificador (delegação, sem edição)

````text
Aja conforme agents/verificador-spec.md.

Caminho da spec: docs/specs/002-dados-iniciais/spec.md

Commit verificado: 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825 (estado presente na pasta de trabalho, sem alterações)

O que verificar:
- docs/DEVOPS.md
- docs/specs/002-dados-iniciais/plan.md
- docs/specs/002-dados-iniciais/spec.md
- docs/specs/002-dados-iniciais/tasks.md
- docs/specs/002-dados-iniciais/verificacao.md
- package.json
- prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql
- prisma/migrations/20261111025735_criar_auditoria/migration.sql
- prisma/rotinas/carga-inicial.ts
- prisma/rotinas/carga.test.ts
- prisma/rotinas/carga.ts
- prisma/rotinas/guarda-banco.test.ts
- prisma/rotinas/guarda-banco.ts
- prisma/rotinas/identidade.test.ts
- prisma/rotinas/identidade.ts
- prisma/rotinas/manifesto.test.ts
- prisma/rotinas/manifesto.ts
- prisma/rotinas/vinculo.test.ts
- prisma/rotinas/vinculo.ts
- prisma/schema.prisma
- prisma/seed.ts
- prisma/vincular-professor.ts
- skills/imagens-equipamentos/scripts/preparar.test.mjs
- src/test/auditoria.test.ts
- src/test/banco-real.test.ts
- src/test/banco-real.ts
- src/test/estrutura-dominio.test.ts
- src/test/provas-finais-spec-002.test.ts
- src/test/rls-dominio.test.ts
- src/test/sonda-typescript-auxiliar.ts
- src/test/sonda-typescript.ts
- tsconfig.json
- vitest.config.ts

Evidência dos checks:

CI, GitHub Actions, workflow "Architecture checks", run 42970248846, PR 43, commit 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825, em 2026-11-11, Node v22.23.4:
- `npm run lint`: job concluído com sucesso, sem saída de erro.
- `npm run typecheck`: job concluído com sucesso, sem saída de erro.
- `npm test`: passou. Última linha do resumo: `Tests  809 passed (809)`; `Test Files  23 passed (23)`.
- `npm run build`: passou. Última linha: `ƒ  (Dynamic)  server-rendered on demand`.
- Gitleaks 8.24.3, job "Documentation and secret guard": `16 commits scanned.`, `no leaks found`.

Pasta local, commit 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825, em 2026-11-11:
- `git status --short`: vazio.

`npm run test:e2e`: não executado.

`npm run prisma:reset`: executado pelo responsável, em PostgreSQL local descartável (imagem postgres:17.6-alpine), em 2026-11-11T03:19:03-03:00, no commit 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825, destino 127.0.0.1:55432, código de saída 0. Saída registrada:
```
Datasource "db": PostgreSQL database "postgres", schema "public" at "127.0.0.1:55432"

Applying migration `20261023110257_criar_saude_sistema`
Applying migration `20261111020031_criar_estrutura_dominio`
Applying migration `20261111025735_criar_auditoria`

Database reset successful
```
Em seguida, `prisma migrate status` no mesmo banco: `3 migrations found in prisma/migrations` e `Database schema is up to date!`. Tabelas em public: `_prisma_migrations`, `auditoria`, `equipamentos`, `memberships`, `saude_sistema`, `tenants`.
````

### Relatório do verificador (sem edição)

```text
Spec: docs/specs/002-dados-iniciais/spec.md
Commit verificado: 71dd1f3ff07bb1ee3ee33f9d72924289cfbbb825

| CA | evidência (teste arquivo:linha → código arquivo:linha) | status | observação |
|---|---|---|---|
| CA-DADOS-01 | src/test/estrutura-dominio.test.ts:99; src/test/banco-real.test.ts:86, 120 → src/test/banco-real.ts:110-115, 146 | ATENDIDO | As três migrations são aplicadas automaticamente em container descartável, sem CLI nem passo manual. |
| CA-DADOS-02 | src/test/rls-dominio.test.ts:130, 141, 187, 202, 222, 238; src/test/auditoria.test.ts:347, 377, 389, 409, 453 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:76-92; prisma/migrations/20261111025735_criar_auditoria/migration.sql:39-51; src/test/banco-real.ts:104-105 | REPROVADO | `memberships` e `equipamentos` só negam por RLS, que não cobre TRUNCATE (src/test/auditoria.test.ts:453), têm GRANT ALL no banco de teste e nenhum trigger (src/test/auditoria.test.ts:117), o que deixa `anon` e `authenticated` truncá-las e contraria "não escrevem". Conclusão por leitura do código, sem execução: as migrations não revogam TRUNCATE e nenhum teste exercita TRUNCATE em `tenants`, `memberships` ou `equipamentos` como esses papéis. |
| CA-DADOS-03 | src/test/estrutura-dominio.test.ts:158, 166; src/test/auditoria.test.ts:247 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:58, 61; prisma/migrations/20261111025735_criar_auditoria/migration.sql:17 | ATENDIDO | As três FKs rejeitam tenant inexistente com o código 23503. |
| CA-DADOS-04 | src/test/estrutura-dominio.test.ts:208, 219, 245 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:55 | ATENDIDO | Unicidade por tenant e consulta filtrada foram exercitadas em banco real. |
| CA-DADOS-05 | src/test/estrutura-dominio.test.ts:307, 319, 331 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:5, 8 | ATENDIDO | A rejeição vem do enum do banco, com o código 22P02. |
| CA-DADOS-06 | src/test/estrutura-dominio.test.ts:409 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:30-43; prisma/schema.prisma:66-82 | ATENDIDO | A lista exata de colunas exclui número de série, local e observações. |
| CA-DADOS-07 | src/test/estrutura-dominio.test.ts:434 → prisma/migrations/20261111020031_criar_estrutura_dominio/migration.sql:20-27, 58 | ATENDIDO | A única FK de memberships aponta para tenants. |
| CA-DADOS-08 | prisma/rotinas/carga.test.ts:133, 143, 154 → prisma/rotinas/carga.ts:51-55, 77-80 | ATENDIDO | Um tenant `suporte_ti` e exatamente TI-0001 a TI-0012 em banco vazio. |
| CA-DADOS-09 | prisma/rotinas/carga.test.ts:166, 179 → prisma/rotinas/carga.ts:30, 37; prisma/rotinas/carga-inicial.ts:6-19 | ATENDIDO | A situação vem só da tabela, e o teste confirma `selecionada` nos 12 itens do manifesto. |
| CA-DADOS-10 | prisma/rotinas/carga.test.ts:337, 344 → prisma/rotinas/carga.ts:77-80 | ATENDIDO | O retrato completo das linhas, com datas e identificadores, não muda entre execuções. |
| CA-DADOS-11 | prisma/rotinas/carga.test.ts:388, 400, 411 → prisma/rotinas/carga.ts:77-80 | ATENDIDO | `nome` e `situacao` alterados permanecem após nova execução. |
| CA-DADOS-12 | prisma/rotinas/carga.test.ts:431, 455 → prisma/rotinas/carga.ts:59-65 | ATENDIDO | A leitura se restringe aos 12 patrimônios do tenant, e os demais ficam intactos. |
| CA-DADOS-13 | prisma/rotinas/carga.test.ts:479, 497 → prisma/rotinas/carga.ts:30, 77-80 | ATENDIDO | Só o ausente é recriado, com a situação da tabela, inclusive `em_manutencao`. |
| CA-DADOS-14 | prisma/rotinas/carga.test.ts:515, 531 → prisma/rotinas/carga.ts:67-75 | ATENDIDO | Fotografia ausente ou divergente aborta, e o patrimônio que faltava não é criado. |
| CA-DADOS-15 | prisma/rotinas/carga.test.ts:195, 213; src/test/estrutura-dominio.test.ts:409 → prisma/rotinas/manifesto.ts:121-127; prisma/rotinas/carga.ts:33-40 | ATENDIDO | O teste da linha 213 não compara o valor da licença. A ausência dela decorre da igualdade exata das colunas de texto (linha 195) e da lista fechada de colunas. |
| CA-DADOS-16 | prisma/rotinas/manifesto.test.ts:120, 173, 197, 232, 247; prisma/rotinas/carga.test.ts:265, 278, 580 → prisma/rotinas/carga.ts:91; prisma/rotinas/manifesto.ts:107-119 | ATENDIDO | Destino incoerente e aprovação divergente são provados na validação, sem banco. A ausência de escrita decorre de `lerManifesto` lançar antes de `executarCarga`, caminho exercitado com banco nos demais casos. |
| CA-DADOS-17 | prisma/rotinas/manifesto.test.ts:51, 59, 101 → prisma/rotinas/manifesto.ts:12, 131-149 | ATENDIDO | O manifesto versionado está `aprovado`, não tem `publicacao`, e o hash do arquivo não muda com a leitura. |
| CA-DADOS-18 | src/test/provas-finais-spec-002.test.ts:48, 87; prisma/rotinas/vinculo.test.ts:251 → prisma/rotinas/carga.ts:50-83; prisma/rotinas/vinculo.ts:33-60 | ATENDIDO | Migrations e rotinas não têm estrutura nem escrita de empréstimos. |
| CA-DADOS-19 | src/test/provas-finais-spec-002.test.ts:52, 71, 77, 81; prisma/rotinas/identidade.test.ts:272, 320; prisma/rotinas/vinculo.test.ts:270, 295 → prisma/rotinas/identidade.ts:52-56 | ATENDIDO | Há só leitura de `auth.users`, comprovada também em transação somente leitura. |
| CA-DADOS-20 | src/test/auditoria.test.ts:136 → prisma/migrations/20261111025735_criar_auditoria/migration.sql:2-11 | ATENDIDO | Todos os campos existem e são obrigatórios. |
| CA-DADOS-21 | src/test/auditoria.test.ts:269, 289, 307 → prisma/migrations/20261111025735_criar_auditoria/migration.sql:28-42 | ATENDIDO | UPDATE, DELETE e TRUNCATE são barrados para o papel dono, que não é superusuário. |
| CA-DADOS-22 | prisma/rotinas/carga.test.ts:242; prisma/rotinas/vinculo.test.ts:262; src/test/provas-finais-spec-002.test.ts:91 → prisma/rotinas/carga.ts:50-83; prisma/rotinas/vinculo.ts:33-60 | ATENDIDO | A tabela de auditoria continua vazia após carga e vínculo. |
| CA-DADOS-23 | prisma/rotinas/carga.test.ts:637; prisma/rotinas/vinculo.test.ts:307, 344, 367; prisma/rotinas/guarda-banco.test.ts:206; src/test/provas-finais-spec-002.test.ts:95; Gitleaks 8.24.3, run 42970248846 → prisma/seed.ts:24, 38, 41; prisma/vincular-professor.ts:51-53, 68, 71 | ATENDIDO | As saídas são contagens ou mensagens fixas, e o Gitleaks do commit verificado não achou vazamentos. O ramo "Falha inesperada" não é exercitado por teste, mas é texto literal no código. |
| CA-DADOS-24 | prisma/rotinas/guarda-banco.test.ts:73, 137; prisma/rotinas/carga.test.ts:658; prisma/rotinas/vinculo.test.ts:382 → prisma/rotinas/guarda-banco.ts:108-133; prisma/seed.ts:13; prisma/vincular-professor.ts:42 | ATENDIDO | As duas rotinas chamam a guarda antes de abrir conexão. |
| CA-DADOS-25 | src/test/provas-finais-spec-002.test.ts:101, 110 → src/server/api/raiz.ts:5-8 | ATENDIDO | Só os procedimentos de autenticação e técnico e as três rotas existentes. |
| CA-DADOS-26 | src/test/provas-finais-spec-002.test.ts:122; src/test/banco-real.test.ts:189 → package.json:22-64 | ATENDIDO | A lista esperada é fixada no próprio teste. O plano registra que `testcontainers`, `pg`, `zod` e os pacotes Prisma já estavam instalados. |
| CA-DADOS-27 | src/test/provas-finais-spec-002.test.ts:179, 183; evidência dos checks na delegação → package.json:12-14 | SEM TESTE | As evidências de lint e typecheck não trazem a última linha, e o script de lint (package.json:12) omite `prisma/vincular-professor.ts`, embora o plano diga que `prisma/` entra no lint, sem registro de lint desse arquivo neste commit. `npm run test:e2e` não se aplica (nenhuma tela, rota ou fluxo tocado), e `npm run prisma:reset` tem registro no commit verificado. |
| CA-DADOS-C1 | prisma/rotinas/vinculo.test.ts:112, 126, 164; prisma/rotinas/identidade.test.ts:119, 173, 191, 201 → prisma/rotinas/vinculo.ts:33-60; prisma/rotinas/identidade.ts:64-78 | ATENDIDO | Criação, repetição e as quatro recusas foram provadas sem gravação, com UUIDs gerados e `auth.users` mínimo em banco isolado. |

status: ATENDIDO · REPROVADO · SEM TESTE · AMBÍGUO

Checks:
`npm run lint` → falhou
`npm run typecheck` → falhou
`npm test` → passou
`npm run build` → passou
`git status --short` → passou
`npm run prisma:reset` → passou

Fora de escopo: nada encontrado
Veredito: NÃO PRONTA — CA-DADOS-02 está REPROVADO (TRUNCATE não bloqueado para `anon` e `authenticated` em `memberships` e `equipamentos`), CA-DADOS-27 está SEM TESTE e os checks `npm run lint` e `npm run typecheck` constam como falhou por não trazerem a última linha da saída.
```

### Observações do agente principal

- Diferenças em relação à execução anterior: CA-DADOS-23 passou de AMBÍGUO a ATENDIDO; CA-DADOS-02 passou de ATENDIDO a REPROVADO; CA-DADOS-27 segue SEM TESTE, agora por lint e typecheck; `npm run prisma:reset` passou de falhou a passou; `npm run lint` e `npm run typecheck` passaram de passou a falhou; veredito mantido em NÃO PRONTA.
- 2026-11-11: a delegação desta execução omitiu a última linha de lint e typecheck, informada na V-01. A correção de CA-DADOS-02 depende de decisão do responsável.
