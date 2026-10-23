# Tarefas — login com Supabase Auth

## Estado

Pacote aprovado pelo responsável junto com `spec.md` e `plan.md` (registro em
2026-10-23). T-LOGIN-01 a T-LOGIN-03 concluídas; T-LOGIN-04 iniciada;
T-LOGIN-05 não iniciada.

## Tarefas

- [x] **T-LOGIN-01 — Ambiente e contrato Supabase**
  - Validar URL e chave publishable em `src/env.ts`.
  - Preparar fábrica SSR e adaptador de cookies.
  - Atende: RF-LOGIN-03, RS-LOGIN-01, RS-LOGIN-02.
  - Evidência: testes de configuração e atributos de cookie.
  - Progresso: código no commit `e7479f1`; testes em `src/env.test.ts`,
    `src/server/supabase/cliente.test.ts` e `src/server/supabase/proxy.test.ts`.

- [x] **T-LOGIN-02 — Service e router de autenticação**
  - Implementar entrada, leitura de usuário autenticado e saída.
  - Validar inputs com Zod e normalizar erros.
  - Atende: RF-LOGIN-02 a RF-LOGIN-08, RS-LOGIN-03 a RS-LOGIN-05.
  - Evidência: testes do service e `createCaller`.
  - Progresso: commit `97a9b7c`; testes em
    `src/server/api/routers/autenticacao.test.ts`.

- [x] **T-LOGIN-03 — Tela Nocturne de login**
  - Substituir a tela técnica em `/` pelo formulário com React Hook Form.
  - Remover os componentes públicos da tela de status substituída.
  - Redirecionar `/login` para `/`.
  - Implementar estados inicial, enviando, erro e sessão ativa.
  - Atende: RF-LOGIN-01, RF-LOGIN-04 a RF-LOGIN-07 e RI-LOGIN-01 a
    RI-LOGIN-05, RF-LOGIN-09.
  - Evidência: testes com Testing Library e inspeção visual responsiva.
  - Progresso: componentes em `src/components/login/`; testes em
    `src/components/login/tela-login.test.tsx` e `src/app/login/page.test.ts`;
    inspeção em 1024 px e 375 px sem rolagem horizontal. Textos do painel
    institucional e do subtítulo do formulário aprovados pelo responsável em
    2026-10-23, sem nota de suporte.

- [ ] **T-LOGIN-04 — Provas de aceitação**
  - Cobrir CA-LOGIN-01 a CA-LOGIN-07 e CA-LOGIN-09.
  - Verificar que respostas não carregam tokens e que cookies são `httpOnly`.
  - Adicionar cenário Playwright sem credenciais reais.
  - Progresso: cenário inicial em `e2e/login.spec.ts` (CA-LOGIN-01 e
    CA-LOGIN-09), executado com sucesso em 2026-10-23 (2 testes aprovados);
    falta o cenário de validação do formulário.

- [ ] **T-LOGIN-05 — Qualidade e publicação**
  - Executar lint, typecheck, testes e build.
  - Publicar preview, validar `/` em desktop e mobile, confirmar o
    redirecionamento de `/login` e registrar HTTP 200.
  - Atende: CA-LOGIN-08.

## Ponto obrigatório de parada

O responsável deve aprovar `spec.md`, `plan.md` e `tasks.md` antes de qualquer
alteração em código, configuração da Vercel ou autenticação no Supabase.

Cumprido: aprovação registrada em 2026-10-23.
