# Plano — login com Supabase Auth

## Estado

Rascunho vinculado a `spec.md`; execução condicionada à aprovação do pacote.

## Abordagem

1. Criar a infraestrutura server-side do Supabase SSR para ler e escrever cookies
   no contexto HTTP do tRPC.
2. Adicionar um router `autenticacao` com procedimentos de entrada, consulta de
   sessão e saída, delegando as chamadas a um service de autenticação.
3. Validar entradas com Zod e manter tokens exclusivamente nos cookies definidos
   pelo servidor.
4. Implementar `/login` como Client Component usando React Hook Form e
   `zodResolver`.
5. Aplicar a composição de login e os tokens Nocturne já aprovados, sem reutilizar
   os usuários fictícios ou o armazenamento local presentes no ZIP de referência.
6. Cobrir o contrato com testes unitários/de componente e uma prova de navegador
   sem credenciais reais; validar manualmente a autenticação somente com conta
   oficial fornecida pelo responsável.

## Arquivos previstos

- `src/app/login/page.tsx`: rota e composição da tela.
- `src/components/login/`: formulário e estado de sessão.
- `src/server/api/routers/autenticacao.ts`: procedimentos tRPC.
- `src/server/services/autenticacao.ts`: integração com Supabase Auth.
- `src/server/supabase/`: fábrica server-side e contrato de cookies.
- `src/env.ts`: validação da URL e da chave publishable.
- testes próximos aos componentes, router e service.

## Fluxo técnico

1. O navegador envia e-mail e senha ao procedimento tRPC de entrada.
2. O service chama `signInWithPassword` no Supabase server-side.
3. O adaptador SSR escreve os cookies na resposta HTTP com as flags aprovadas.
4. A resposta informa apenas sucesso ou erro genérico; não retorna tokens.
5. A consulta de sessão usa `getUser`, não confia apenas no conteúdo local do
   cookie.
6. O logout chama o Supabase no servidor e expira os cookies.

## Estratégia de testes

- Zod: e-mail inválido e senha vazia.
- Router/service: sucesso e falha com cliente Supabase substituído por contrato
  controlado, sem segredo.
- Componente: loading, erro, sessão ativa e logout.
- Playwright: renderização e validação do formulário; autenticação real fica fora
  da CI por depender de conta oficial.
- Verificação de segurança: ausência de token no payload e atributos do cookie.

## Riscos e controles

- Manipulação incorreta de cookies: centralizar no adaptador server-side e testar
  atributos.
- Vazamento de detalhe do Supabase: mapear todo erro para copy genérica.
- Divergência visual: usar tokens existentes e comparar a produção com
  `docs/layout.md`.
- Usuário sem tenant/role: permanecer na tela autenticada, sem liberar dados ou
  rotas de produto.

## Implantação

- PR pequeno de `feature/login` para `develop`.
- CI verde antes da integração.
- Promoção para `main` somente com aprovação do responsável.
- Configurar apenas `NEXT_PUBLIC_SUPABASE_URL` e
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` na Vercel; nenhum segredo de banco é
  necessário para autenticar.
