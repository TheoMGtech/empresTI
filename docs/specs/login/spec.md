# Spec — login com Supabase Auth

## Estado

Rascunho para aprovação do responsável.

## Objetivo

Disponibilizar uma tela efetiva do EmpresTI em `/login`, aderente ao design system
Nocturne, que autentique usuários previamente convidados por e-mail e senha no
Supabase Auth. A entrega não libera funcionalidades de catálogo ou operações.

## Escopo

- Tela responsiva de login em PT-BR, baseada na composição aprovada em
  `docs/layout.md`.
- Autenticação real por e-mail e senha no projeto Supabase
  `wdudlqacomnasnrxgbni`.
- Sessão mantida por cookies seguros, `httpOnly`, `sameSite=lax` e `secure` em
  produção.
- Estado de carregamento, erro genérico de credenciais e confirmação de sessão.
- Encerramento da sessão na própria tela.
- Usuário já autenticado vê o estado de sessão ativa em `/login`.
- Permanência em `/login` após a autenticação. O acesso às áreas do produto fica
  fechado até existir uma spec aprovada para o destino autenticado e para
  memberships.

## Fora de escopo

- Cadastro público, criação de usuário ou envio de convite.
- Recuperação ou troca de senha.
- Definição de roles, matriz de permissões ou provisionamento de tenant.
- Catálogo, empréstimos, devoluções ou qualquer outra funcionalidade de produto.
- Credenciais de demonstração, usuários fictícios ou autenticação em
  `localStorage`.
- Alteração de schema PostgreSQL.

## Requisitos funcionais

- **RF-LOGIN-01** — `/login` apresenta campos obrigatórios de e-mail e senha e a
  ação `Entrar`.
- **RF-LOGIN-02** — o formulário valida formato do e-mail e senha não vazia antes
  de chamar o servidor.
- **RF-LOGIN-03** — credenciais válidas criam uma sessão Supabase em cookie
  `httpOnly`; tokens não são devolvidos ao JavaScript do navegador.
- **RF-LOGIN-04** — credenciais inválidas exibem a mensagem genérica
  `Não foi possível entrar. Confira e-mail e senha.` sem revelar qual campo falhou.
- **RF-LOGIN-05** — durante o envio, a ação fica desabilitada e mostra
  `Entrando...`, impedindo envio duplicado.
- **RF-LOGIN-06** — uma sessão válida é representada como `Acesso confirmado` e
  oferece a ação `Sair`.
- **RF-LOGIN-07** — `Sair` invalida a sessão Supabase e retorna ao formulário.
- **RF-LOGIN-08** — falhas inesperadas exibem uma mensagem operacional genérica e
  não expõem tokens, chaves, URL de banco ou detalhes internos.

## Requisitos de interface e acessibilidade

- **RI-LOGIN-01** — modo escuro exclusivo, Open Sans e tokens Nocturne definidos
  em `docs/layout.md`.
- **RI-LOGIN-02** — em desktop, a composição usa painel institucional à esquerda
  e formulário de até 372 px à direita; em telas pequenas, o formulário permanece
  prioritário e o painel institucional é reduzido sem rolagem horizontal.
- **RI-LOGIN-03** — a ação primária é contornada com `#5B7FE0`, nunca preenchida
  por cor sólida.
- **RI-LOGIN-04** — campos possuem rótulos associados, foco visível, autocomplete
  apropriado e mensagem de erro anunciada por tecnologia assistiva.
- **RI-LOGIN-05** — a tela não mostra credenciais de teste nem copy não aprovada.

## Requisitos de segurança

- **RS-LOGIN-01** — apenas a chave pública/publishable do Supabase pode ser usada
  no cliente; `service_role` permanece exclusiva do servidor e não é necessária
  para login.
- **RS-LOGIN-02** — cookies de autenticação são escritos no servidor e não ficam
  legíveis por JavaScript.
- **RS-LOGIN-03** — a aplicação não registra e-mail, senha, token ou conteúdo de
  cookie em logs.
- **RS-LOGIN-04** — não existe cadastro aberto; apenas contas já provisionadas no
  Supabase Auth conseguem autenticar.
- **RS-LOGIN-05** — sessão autenticada sem membership não recebe acesso a dados de
  produto nesta entrega.

## Critérios de aceitação

- **CA-LOGIN-01** — a URL pública `/login` renderiza a tela Nocturne responsiva e
  contém e-mail, senha e `Entrar`.
- **CA-LOGIN-02** — entradas inválidas são bloqueadas no cliente com mensagem em
  PT-BR e sem requisição de autenticação.
- **CA-LOGIN-03** — o servidor rejeita credenciais inválidas com mensagem genérica
  e sem criar cookie de sessão.
- **CA-LOGIN-04** — uma conta previamente criada no Supabase autentica e resulta
  em cookie `httpOnly`, sem token disponível no corpo da resposta.
- **CA-LOGIN-05** — ao recarregar `/login`, uma sessão válida continua reconhecida
  e apresenta `Acesso confirmado`.
- **CA-LOGIN-06** — `Sair` invalida a sessão e volta a apresentar o formulário.
- **CA-LOGIN-07** — testes automatizados cobrem validação, sucesso, falha genérica,
  sessão existente e logout sem usar credenciais reais.
- **CA-LOGIN-08** — lint, typecheck, testes e build passam; a página publicada
  responde HTTP 200.

## Rastreabilidade

- PRD: sistema interno e acesso restrito.
- ADR-001: Supabase Auth, e-mail e senha, cadastro por convite e cookie
  `httpOnly`.
- Layout: seção de login e design system Nocturne.
- Regras: `rules/restrictions.md`, `rules/secrets.md`, `rules/tests.md` e
  `rules/checks.md`.
