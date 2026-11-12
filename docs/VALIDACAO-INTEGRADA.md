# Validação integrada real — checklist da entrega final

> leitor: responsável

Exigida pela DF-14 (decisão do responsável em 2026-11-11) antes da publicação final em `main` e na
Vercel. Não é pré-condição para declarar cada spec PRONTA: os testes automatizados, com E2E de tRPC
simulado, provam as specs no desenvolvimento; esta lista prova o sistema montado, com Supabase,
banco e contas reais. **O EmpresTI não é declarado entregue com base apenas em testes simulados.**

Quem executa: o responsável, ou o agente sob autorização explícita para cada passo que toque
produção. Cada item registra data, conta usada, resultado e evidência (captura, resposta HTTP ou
consulta somente leitura). Item que falha bloqueia a entrega até nova execução.

## 0. Pré-requisitos (responsável)

- [ ] Environment `production` criado e protegido no GitHub, com os segredos necessários.
- [ ] Migrations aplicadas no banco de produção pelo workflow `migrate-production`, com a
      confirmação `APPLY`: andar zero, Spec 002, `nome_exibicao` e `criar_emprestimos`.
- [ ] Carga inicial executada no banco de produção (12 equipamentos do tenant `suporte_ti`).
- [ ] Fotografias presentes no bucket público `equipamentos`, com os caminhos do manifesto.
- [ ] Conta `colaborador` real vinculada com `vincular-professor.ts` (papel e nome).
- [ ] Conta `operacoes` real criada no Supabase Auth e vinculada com `--papel operacoes --nome`.
- [ ] Variáveis públicas e de servidor configuradas na Vercel para o ambiente de validação.
- [ ] Build da Vercel do commit candidato concluído, com a URL anotada.

## 1. Login e sessão (Specs 001 e 003)

- [ ] `/` sem sessão mostra o login; e-mail inválido é barrado na tela.
- [ ] Senha errada mostra "Não foi possível entrar. Confira e-mail e senha.", sem detalhe técnico.
- [ ] Login do colaborador leva a `/catalogo`; o cookie de sessão é `httpOnly`; a resposta de
      `autenticacao.entrar` não traz token.
- [ ] O bloco de usuário mostra o nome de exibição (ou o papel, sem nome).
- [ ] `Sair` encerra a sessão e volta a `/`; voltar com o navegador não reabre a área.
- [ ] Sessão expirada (cookie apagado) leva de volta a `/` ao navegar.
- [ ] Colaborador não vê o grupo Operações; Operações vê.
- [ ] Colaborador em `/operacoes/*` vê "Acesso restrito a Operações.".

## 2. Catálogo (Spec 004)

- [ ] O catálogo mostra os 12 equipamentos, com fotografia (ou ícone se a foto falhar).
- [ ] TI-0004 e TI-0007 aparecem em manutenção e sem ação.
- [ ] Chips de categoria e "Só disponíveis" filtram; o cabeçalho mostra total e disponíveis.
- [ ] Nenhuma tela do colaborador mostra nome de quem está com um item.
- [ ] Sem rolagem horizontal em 375px; sidebar fixa a partir de 1024px.

## 3. Detalhe e empréstimo (Spec 005)

- [ ] O detalhe mostra os dados do item e o prazo previsto; colaborador não vê número de série,
      observações nem histórico.
- [ ] Confirmar a solicitação cria o empréstimo com prazo de 14 dias corridos (data de São Paulo).
- [ ] O item aparece "Emprestado · devolve {data}" no catálogo logo depois.
- [ ] Item em manutenção não pode ser solicitado.
- [ ] Duas solicitações do mesmo item em abas diferentes resultam em um único empréstimo.

## 4. Limite e atraso (Spec 006)

- [ ] O contador mostra "N de 3 itens com você".
- [ ] O terceiro item é aceito, e o quarto é recusado com a nota de limite.
- [ ] Item em atraso bloqueia nova solicitação, com a nota de atraso. Como um empréstimo novo só
      vence em 14 dias, o responsável prepara um empréstimo vencido no ambiente de validação, por
      procedimento que ele aprovar, e o desfaz ao final.
- [ ] Uma chamada direta a `emprestimos.solicitar`, fora da interface, também é recusada.

## 5. Meus empréstimos, devolução e histórico (Spec 007)

- [ ] "Comigo agora" lista só os empréstimos da própria conta, com a barra de prazo.
- [ ] Devolver pede confirmação, encerra na hora e libera o item no catálogo.
- [ ] O histórico mostra o item devolvido, com "No prazo" ou atraso.
- [ ] Devolver o item atrasado libera novas solicitações.

## 6. Operações (Spec 008)

- [ ] A lista mostra os empréstimos em aberto do tenant, com o nome de quem está com cada item.
- [ ] Os cards (em aberto, vencendo em 3 dias, em atraso, em manutenção) batem com a lista.
- [ ] Chips "Em atraso", "Vencem esta semana" e categoria filtram corretamente.
- [ ] Registrar devolução no balcão encerra o empréstimo de outra pessoa e libera o item.
- [ ] Cadastrar equipamento cria o item no catálogo; patrimônio repetido é recusado.
- [ ] Alterar a situação para manutenção tira o item dos disponíveis; com empréstimo em aberto, a
      alteração é recusada.
- [ ] A conta colaborador recebe recusa ao chamar cada procedimento de Operações diretamente.

## 7. Isolamento e segurança

- [ ] Nenhum procedimento aceita `tenantId` vindo do cliente (input ignorado).
- [ ] Chamada à API REST do Supabase com a chave pública não lê nem grava tabelas de domínio
      (RLS deny-by-default).
- [ ] Respostas de erro não trazem pilha nem detalhe interno.
- [ ] Cada devolução, cadastro, alteração de situação e solicitação gerou um registro de auditoria
      com o UUID do ator (consulta somente leitura).
- [ ] Se houver um segundo tenant de validação: conta de um tenant não vê dado do outro.

## 8. Publicação

- [ ] Todas as specs 003 a 008 com `Veredito: PRONTA` registrado em `verificacao.md`.
- [ ] `develop` com CI verde no commit candidato.
- [ ] Merge de `develop` em `main` feito pelo responsável, com autorização explícita.
- [ ] Deploy de produção da Vercel concluído a partir de `main`; URL de produção anotada.
- [ ] Repetição rápida dos itens 1, 2 e 3 na URL de produção.
- [ ] `ENTREGA.md` preenchido com as evidências desta lista.

## Registro

| Item | Data | Conta | Resultado | Evidência |
|---|---|---|---|---|
| | | | | |
