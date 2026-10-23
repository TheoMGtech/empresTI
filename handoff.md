# Handoff

Artefato efêmero para registrar onde uma sessão terminou e o que ficou pendente.
Não é fonte de verdade sobre requisitos, comportamento ou arquitetura.

## Estado atual (2026-10-23)

- Branch de trabalho: `feature/login`, criada a partir de `origin/develop`.
  Publicada em `origin/feature/login`; sem PR aberto, por decisão do
  responsável.
- O pacote SDD de login (`docs/specs/login/`) foi aprovado pelo responsável.
  Progresso por tarefa em `docs/specs/login/tasks.md`: T-LOGIN-01 a T-LOGIN-03
  concluídas, assim como T-LOGIN-04; T-LOGIN-05 não iniciada.
- Nesta branch, `/` já exibe o login Nocturne e `/login` redireciona para `/`;
  a tela técnica foi removida da interface. O procedimento `tecnico.status`
  continua disponível na API.
- O andar zero está em produção (PR #7 em `main`) em
  `empresti-theo-escola.vercel.app`, ainda com a tela técnica. O procedimento
  `tecnico.status` responde `bancoOperacional: false`: a tabela `saude_sistema`
  não existe no banco de produção, porque a migration nunca foi aplicada.
- O workflow `migrate-production` nunca rodou, e o Environment `production`
  não existe no GitHub (ver `docs/DEVOPS.md`).
- O Supabase Auth do projeto `wdudlqacomnasnrxgbni` está com cadastro público
  habilitado (`disable_signup: false`), em conflito com RS-LOGIN-04.
- PRs abertos do Dependabot para `develop`: #8, #9, #10 e #12 com CI verde;
  #11 (TypeScript 5.9 → 7.0) com CI falhando.

## Verificação executada nesta branch

- `npm run lint`: sem erros.
- `npm run typecheck`: sem erros.
- `npm test`: 8 arquivos, 28 testes aprovados.
- `npm run build`: concluído sem erros. Se falhar com `EPERM` em
  `.next/server/app/login` depois de usar `npm run dev`, apague `.next/` e
  rode de novo.
- `npm run test:e2e`: 3 testes aprovados (CA-LOGIN-01, CA-LOGIN-02 e
  CA-LOGIN-09), com o Chromium do Playwright 1.56 instalado localmente. O
  Playwright usa `localhost`: em `127.0.0.1` o `next dev` bloqueia o HMR e a
  página não hidrata.
- Inspeção visual em 1024 px e 375 px: sem rolagem horizontal; estados inicial e
  de erro de validação conferidos.

## Pendências do responsável

1. Criar e proteger o Environment `production` no GitHub, com `DATABASE_URL` e
   `DIRECT_URL`, e então executar `migrate-production` com `APPLY`
   (`rules/migration.md`). Confirmar também `DATABASE_URL` na Vercel.
2. Decidir se o cadastro público será desabilitado no Supabase Auth, conforme
   RS-LOGIN-04.
3. Decidir o destino do PR #11 do Dependabot.
4. Alinhar a ordem das paradas do fluxo SDD: `rules/spec-flow.md` pede
   aprovação da spec antes de `plan.md` e `tasks.md`; o `AGENTS.md` pede a
   entrega do pacote completo.

## Próximo passo seguro

T-LOGIN-05: abrir o PR de `feature/login` para `develop` (com autorização do
responsável), validar o preview da Vercel em desktop e mobile, confirmar o
redirecionamento de `/login` e registrar HTTP 200 (CA-LOGIN-08).
