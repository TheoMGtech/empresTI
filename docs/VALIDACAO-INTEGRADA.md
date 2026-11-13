# Validação integrada real — checklist da entrega final

> leitor: responsável

Exigida pela DF-14 (decisão do responsável em 2026-11-11) antes da publicação final em `main` e na
Vercel. Não é pré-condição para declarar cada spec PRONTA: os testes automatizados, com E2E de tRPC
simulado, provam as specs no desenvolvimento; esta lista prova o sistema montado, com Supabase,
banco e contas reais. **O EmpresTI não é declarado entregue com base apenas em testes simulados.**

Quem executa: o responsável, ou o agente sob autorização explícita para cada passo que toque
produção. Cada item registra data, conta usada, resultado e evidência (captura, resposta HTTP ou
consulta somente leitura). Item que falha bloqueia a entrega até nova execução.

**Execução de 2026-11-12/13** sobre `main` = `8e08040` (Specs 001–008, sem a Spec 009), em
<https://empresti-self.vercel.app/>. Evidências em [`docs/evidencias/`](evidencias/README.md). `[x]`
significa comprovado em produção; item sem `[x]` traz a nota do que falta. "Banco descartável" é o
PostgreSQL 17.6 em container da suíte do projeto, usado para o que não deve rodar em produção
(concorrência, datas, segundo tenant).

## 0. Pré-requisitos (responsável)

- [x] Environment `production` criado e protegido no GitHub, com os segredos necessários.
      — revisor obrigatório, branches `main` e `develop`, segredos `DATABASE_URL` e `DIRECT_URL`.
- [x] Migrations aplicadas no banco de produção pelo workflow `migrate-production`, com a
      confirmação `APPLY`: andar zero, Spec 002, `nome_exibicao` e `criar_emprestimos`.
      — run 43288501845 (2026-11-12), 7 migrations; checksums iguais aos arquivos versionados.
- [x] Carga inicial executada no banco de produção (12 equipamentos do tenant `suporte_ti`).
- [x] Fotografias presentes no bucket público `equipamentos`, com os caminhos do manifesto.
      — 12 objetos; as 12 fotos carregam no catálogo.
- [x] Conta `colaborador` real vinculada com `vincular-professor.ts` (papel confirmado).
      — `nome_exibicao` é opcional na Spec 003 e permanece vazio por decisão do responsável
      em 2026-11-13; as telas usam o fallback existente.
- [x] Conta `operacoes` real criada no Supabase Auth e vinculada ao papel `operacoes`.
      — `nome_exibicao` é opcional e permanece vazio por decisão do responsável
      em 2026-11-13 (o painel mostra "Sem nome cadastrado").
- [x] Variáveis públicas e de servidor configuradas na Vercel para o ambiente de validação.
      — inferido do funcionamento (login, banco e catálogo); o painel não foi lido pelo agente.
- [x] Build da Vercel do commit candidato concluído, com a URL anotada.
      — status `Vercel` = success em `8e08040`.

## 1. Login e sessão (Specs 001 e 003)

- [x] `/` sem sessão mostra o login; e-mail inválido é barrado na tela.
- [x] Senha errada mostra "Não foi possível entrar. Confira e-mail e senha.", sem detalhe técnico.
- [x] Login do colaborador leva a `/catalogo`; o cookie de sessão é `httpOnly`; a resposta de
      `autenticacao.entrar` não traz token.
- [x] O bloco de usuário mostra o nome de exibição (ou o papel, sem nome).
- [x] `Sair` encerra a sessão e volta a `/`; voltar com o navegador não reabre a área.
- [x] Sessão expirada (cookie apagado) leva de volta a `/` ao navegar.
- [x] Colaborador não vê o grupo Operações; Operações vê.
- [x] Colaborador em `/operacoes/*` vê "Acesso restrito a Operações.".

## 2. Catálogo (Spec 004)

- [x] O catálogo mostra os 12 equipamentos, com fotografia (ou ícone se a foto falhar).
- [x] TI-0004 e TI-0007 aparecem em manutenção e sem ação.
- [x] Chips de categoria e "Só disponíveis" filtram; o cabeçalho mostra total e disponíveis.
- [x] Nenhuma tela do colaborador mostra nome de quem está com um item.
- [x] Sem rolagem horizontal em 375px; sidebar fixa a partir de 1024px.
      — 375px em produção; sidebar fixa (`sticky`) provada no E2E simulado (CA-SESSAO-13).

## 3. Detalhe e empréstimo (Spec 005)

- [x] O detalhe mostra os dados do item e o prazo previsto; colaborador não vê número de série,
      observações nem histórico.
- [x] Confirmar a solicitação cria o empréstimo com prazo de 14 dias corridos (data de São Paulo).
      — retirada 13/11, prazo 2026-11-27.
- [x] O item aparece "Emprestado · devolve {data}" no catálogo logo depois.
- [x] Item em manutenção não pode ser solicitado.
- [ ] Duas solicitações do mesmo item em abas diferentes resultam em um único empréstimo.
      — não executado em produção (teste de concorrência); provado por CA-SOLIC-03 no banco
      descartável. Em produção, a solicitação repetida do mesmo item pela API foi recusada (409).

## 4. Limite e atraso (Spec 006)

- [x] O contador mostra "N de 3 itens com você".
- [x] O terceiro item é aceito, e o quarto é recusado com a nota de limite.
- [ ] Item em atraso bloqueia nova solicitação, com a nota de atraso. Como um empréstimo novo só
      vence em 14 dias, o responsável prepara um empréstimo vencido no ambiente de validação, por
      procedimento que ele aprovar, e o desfaz ao final.
      — não executado em produção (exige empréstimo vencido); provado por CA-REGRAS-04/05 no banco
      descartável.
- [x] Uma chamada direta a `emprestimos.solicitar`, fora da interface, também é recusada.
      — 4º item pela API: 409 "Limite de 3 itens atingido.".

## 5. Meus empréstimos, devolução e histórico (Spec 007)

- [x] "Comigo agora" lista só os empréstimos da própria conta, com a barra de prazo.
- [x] Devolver pede confirmação, encerra na hora e libera o item no catálogo.
- [x] O histórico mostra o item devolvido, com "No prazo" ou atraso.
- [ ] Devolver o item atrasado libera novas solicitações.
      — depende do item atrasado (seção 4); provado por CA-REGRAS-01/05 e CA-OPER-03 no banco
      descartável.

## 6. Operações (Spec 008)

- [x] A lista mostra os empréstimos em aberto do tenant, com o nome de quem está com cada item.
      — lista correta; como as contas não têm nome, a coluna Pessoa mostra "Sem nome cadastrado".
- [x] Os cards (em aberto, vencendo em 3 dias, em atraso, em manutenção) batem com a lista.
      — 3 / 0 / 0 / 2 com 3 empréstimos abertos.
- [ ] Chips "Em atraso", "Vencem esta semana" e categoria filtram corretamente.
      — "Em atraso" aplicado em produção (lista vazia); os demais provados por CA-OPER-11 e testes
      de componente.
- [x] Registrar devolução no balcão encerra o empréstimo de outra pessoa e libera o item.
- [ ] Cadastrar equipamento cria o item no catálogo; patrimônio repetido é recusado.
      — recusa do repetido e do formato inválido comprovadas em produção; o cadastro não foi
      executado porque o item ficaria permanente (não há exclusão); provado por CA-OPER-05.
- [ ] Alterar a situação para manutenção tira o item dos disponíveis; com empréstimo em aberto, a
      alteração é recusada.
      — recusa com empréstimo aberto comprovada em produção; a mudança efetiva não foi executada
      para não alterar a carga; provada por CA-OPER-07/09.
- [x] A conta colaborador recebe recusa ao chamar cada procedimento de Operações diretamente.
      — 6 procedimentos: 403 FORBIDDEN.

## 7. Isolamento e segurança

- [x] Nenhum procedimento aceita `tenantId` vindo do cliente (input ignorado).
- [ ] Chamada à API REST do Supabase com a chave pública não lê nem grava tabelas de domínio
      (RLS deny-by-default).
      — a chave pública não foi encontrada nos scripts da página inicial; policies `USING false` para `anon` e
      `authenticated` conferidas por SQL somente leitura em produção; bloqueio provado por
      CA-DADOS-02 no banco descartável. A chamada REST com a chave não foi feita.
- [x] Respostas de erro não trazem pilha nem detalhe interno.
- [ ] Cada devolução, cadastro, alteração de situação e solicitação gerou um registro de auditoria
      com o UUID do ator (consulta somente leitura).
      — solicitações (3) e devoluções (3) com ator comprovadas; cadastro e alteração não foram
      executados em produção (provados por CA-OPER-08).
- [ ] Se houver um segundo tenant de validação: conta de um tenant não vê dado do outro.
      — não há segundo tenant em produção; provado no banco descartável (CA-SOLIC-04, CA-OPER-01/02).

## 8. Publicação

- [x] Todas as specs 003 a 008 com `Veredito: PRONTA` registrado em `verificacao.md`.
- [x] `develop` com CI verde no commit candidato.
- [x] Merge de `develop` em `main` feito pelo responsável, com autorização explícita. — PR #98.
- [x] Deploy de produção da Vercel concluído a partir de `main`; URL de produção anotada.
- [x] Repetição rápida dos itens 1, 2 e 3 na URL de produção.
- [x] `ENTREGA.md` preenchido com as evidências desta lista.

A Spec 009 (segurança HTTP e limite de requisições) ainda não está em `main`; seu roteiro de
validação será acrescentado pela T-SEG-12 e executado depois do release dela.

## 9. Segurança HTTP e limite de requisições (Spec 009)

Roteiro acrescentado pela T-SEG-12 (2026-11-13), **ainda não executado**. Segue os três níveis da
seção "Implantação" da spec, nesta ordem; nenhum substitui o seguinte, e nenhum é marcado antes de
existir o ambiente correspondente. O nível 1 (local, build de produção) é a T-SEG-13 e fica em
`docs/specs/009-seguranca-http-rate-limit/verificacao.md`; aqui ficam os níveis 2 e 3.

### 9.0 Pré-requisitos (responsável)

- [ ] `CHAVE_HMAC_LIMITES` cadastrada na Vercel como variável sensível, com valores diferentes em
      Preview e em Production. O valor nunca é colado no chat, em arquivo versionado ou em log.
      — cadastrada pelo responsável em 2026-11-13 (informado por ele; o agente não lê o painel da
      Vercel). Fica comprovada quando o login funcionar no preview (9.2).
- [x] Migration `criar_limites_requisicao` aplicada pelo workflow `migrate-production`, com a
      confirmação `APPLY`, **antes** de a versão com o limite chegar a `main`. Sem a tabela, login e
      mutações respondem 503 (fail-closed).
      — run 43288501845 (2026-11-12); `_prisma_migrations` conferida por SQL somente leitura em
      2026-11-13: `20261112174149_criar_limites_requisicao` concluída e sem rollback.
- [ ] Decisões do responsável registradas em `docs/DEVOPS.md`: banco do Preview, tenant de
      validação e contas de validação.

### 9.1 Regras de isolamento no preview

Há um único projeto Supabase; salvo outra configuração do responsável, o preview usa o banco de
produção.

- Só este roteiro manual, executado por pessoas com as contas de validação. Nenhuma suíte
  automatizada (Vitest, Testcontainers, Playwright) aponta para o preview ou para o banco remoto.
- Nada de `prisma:reset`, `TRUNCATE`, `DELETE` avulso ou carga que apague dados no banco remoto.
- As escritas são operações normais do produto e ficam na auditoria. Os contadores de limite
  expiram sozinhos (15 min no login, 60 s nas mutações).
- Os testes de limite usam conta de validação, nunca conta real de colaborador.

### 9.2 Nível 2 — preview da Vercel

- [ ] `curl -sI <url do preview>` traz `Content-Security-Policy` com nonce, sem `unsafe-inline`,
      `unsafe-eval` nem `Report-Only`; `X-Content-Type-Options: nosniff`,
      `Referrer-Policy: strict-origin-when-cross-origin`,
      `Permissions-Policy: camera=(), microphone=(), geolocation=()` e `X-Frame-Options: DENY`.
- [ ] Sem `Strict-Transport-Security` no preview (só em `VERCEL_ENV=production`).
- [ ] Duas requisições seguidas trazem nonces diferentes.
- [ ] Login, catálogo, detalhe, Meus empréstimos, painel e cadastro de Operações abrem sem
      `securitypolicyviolation` no console, com as fotos do Storage carregando e os diálogos
      abrindo.
- [ ] Login: com a conta de validação, 5 senhas erradas seguidas e a 6ª tentativa, mesmo com a
      senha certa, responde 429 com "Muitas tentativas em pouco tempo. Aguarde alguns minutos e
      tente novamente." e `Retry-After`. A mesma resposta para um e-mail inexistente.
- [ ] Login bem-sucedido não consome a vaga do e-mail: depois de entrar, sair e errar a senha 4
      vezes, a 5ª tentativa ainda chega ao Supabase.
- [ ] Mutações: com a conta de validação, a 31ª mutação coberta em 60 s responde 429 com a
      mensagem na tela, e nada é gravado por ela (a lista e a auditoria não mudam).
- [ ] Consultas e `sair` continuam respondendo enquanto o limite de mutações está cheio.
- [ ] Banco somente leitura: `limites_requisicao` só tem identificadores hex de 64 caracteres, sem
      e-mail, IP ou id em claro.
- [ ] Os logs da função na Vercel não trazem e-mail, IP nem identificador do fluxo de limite.

### 9.3 Nível 3 — URL de produção

Só depois do merge de `develop` em `main` pelo responsável, com autorização explícita, e do deploy
de produção da Vercel.

- [ ] `curl -sI https://empresti-self.vercel.app/` traz a CSP com nonce, os cabeçalhos fixos e
      `Strict-Transport-Security: max-age=31536000`, sem `preload` nem `includeSubDomains`.
- [ ] Login real com a conta `colaborador` funciona, e as telas abrem sem violação de CSP.
- [ ] `ENTREGA.md` atualizado com o resultado da Spec 009.

## Registro

| Item | Data | Conta | Resultado | Evidência |
|---|---|---|---|---|
| 0 | 2026-11-12 | — (GitHub, SQL somente leitura) | Concluído; nomes de exibição opcionais não definidos (aceito pelo responsável) | [README](evidencias/README.md#banco-de-produção-consultas-somente-leitura) |
| 1 | 2026-11-12/13 | anônimo, colaborador, operacoes | PASSOU | [autenticação](evidencias/README.md#1-autenticação-e-sessão) |
| 2 | 2026-11-13 | colaborador | PASSOU | [catálogo](evidencias/README.md#2-catálogo) |
| 3 | 2026-11-13 | colaborador | PASSOU; concorrência só no banco descartável | [solicitação](evidencias/README.md#3-detalhe-e-solicitação) |
| 4 | 2026-11-13 | colaborador | PASSOU; atraso só no banco descartável | [limite](evidencias/README.md#4-limite-e-atraso) |
| 5 | 2026-11-13 | colaborador | PASSOU; item atrasado só no banco descartável | [devolução](evidencias/README.md#5-meus-empréstimos-e-devolução) |
| 6 | 2026-11-13 | operacoes, colaborador | PASSOU; cadastro e mudança efetiva de situação só no banco descartável | [Operações](evidencias/README.md#6-operações) |
| 7 | 2026-11-13 | colaborador; SQL somente leitura | PASSOU nos itens executados | [permissões](evidencias/README.md#7-permissões-e-isolamento) |
| 8 | 2026-11-13 | — | Release 003–008 publicado; Spec 009 pendente | [ENTREGA.md](../ENTREGA.md) |
