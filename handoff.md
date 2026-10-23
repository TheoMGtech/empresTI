# Handoff

Artefato efêmero para registrar onde uma sessão terminou e o que ficou pendente.
Não é fonte de verdade sobre requisitos, comportamento ou arquitetura.

## Estado atual (2026-10-23)

- Branch de trabalho: `feature/login`, criada a partir de `origin/develop`.
  A branch ainda não foi enviada ao remoto.
- O pacote SDD de login (`docs/specs/login/`) foi aprovado pelo responsável.
  Progresso por tarefa em `docs/specs/login/tasks.md`: T-LOGIN-01 e T-LOGIN-02
  concluídas; T-LOGIN-03 a T-LOGIN-05 não iniciadas.
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
- `npm test`: 6 arquivos, 15 testes aprovados.
- `npm run build`: concluído sem erros.

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

Implementar T-LOGIN-03 (tela Nocturne de login em `/` e redirecionamento de
`/login`), validando com `rules/checks.md`.
