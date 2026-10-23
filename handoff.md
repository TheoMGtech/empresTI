# Handoff

Artefato efêmero para registrar onde uma sessão terminou e o que ficou pendente.
Não é fonte de verdade sobre requisitos, comportamento ou arquitetura.

## Estado atual (2026-10-23)

- O login (`docs/specs/login/`, T-LOGIN-01 a T-LOGIN-05 concluídas) está em
  produção: PR #13 integrado em `develop` (`6ea5929`) e promovido para `main`
  pelo PR #14 (`f66e1ae`). `main` e `develop` têm a mesma árvore.
- Produção em `empresti-self.vercel.app` e `empresti-theo-escola.vercel.app`
  (mesmo deploy): `/` responde HTTP 200 com o login, `/login` responde 307 para
  `/`, a consulta de sessão sem cookie responde `autenticado: false`; em
  1024 px e 375 px a página hidrata e não tem rolagem horizontal.
- A autenticação com conta real ainda não foi exercitada.
- O banco de produção continua sem a migration do andar zero: `tecnico.status`
  responde `bancoOperacional: false`. O login não depende do banco. O workflow
  `migrate-production` nunca rodou, e o Environment `production` não existe no
  GitHub (ver `docs/DEVOPS.md`).
- O Supabase Auth do projeto `wdudlqacomnasnrxgbni` está com cadastro público
  habilitado (`disable_signup: false`), em conflito com RS-LOGIN-04.
- PRs abertos do Dependabot para `develop`: #8, #9, #10 e #12 com CI verde em
  2026-10-23; #11 (TypeScript 5.9 → 7.0) com CI falhando. Foram abertos antes
  do login e podem precisar de nova rodada de CI.
- As branches `feature/login` e `feature/promover-login-producao` já foram
  integradas e podem ser apagadas.

## Notas operacionais

- Se `npm run build` falhar com `EPERM` em `.next/server/app/login` depois de
  usar `npm run dev`, apague `.next/` e rode de novo.
- O Playwright usa `localhost`: em `127.0.0.1` o `next dev` bloqueia o HMR e a
  página não hidrata. O Chromium exigido pelo Playwright 1.56 está instalado
  localmente.
- O `npx` falha nesta pasta por causa do `&` no caminho; use os binários em
  `node_modules` (por exemplo, `node ./node_modules/prettier/bin/prettier.cjs`).

## Pendências do responsável

1. Criar e proteger o Environment `production` no GitHub, com `DATABASE_URL` e
   `DIRECT_URL`, e então executar `migrate-production` com `APPLY`
   (`rules/migration.md`). Confirmar também `DATABASE_URL` na Vercel.
2. Decidir se o cadastro público será desabilitado no Supabase Auth, conforme
   RS-LOGIN-04.
3. Fornecer uma conta oficial para validar a autenticação real em produção.
4. Decidir o destino do PR #11 do Dependabot.
5. Alinhar a ordem das paradas do fluxo SDD: `rules/spec-flow.md` pede
   aprovação da spec antes de `plan.md` e `tasks.md`; o `AGENTS.md` pede a
   entrega do pacote completo.

## Próximo passo seguro

Nenhuma feature em andamento. A próxima funcionalidade começa por uma spec nova
em `docs/specs/<feature>/`, conforme `rules/spec-flow.md`.
