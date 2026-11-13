# Resultados dos testes de aceite em produção

Gerado a partir dos relatórios JSON do Playwright, sem caminhos locais. Os passos que não rodaram na parte 1 do ciclo foram executados na parte 2, com novo login.

## Produção — primeira rodada completa (2026-11-12)

As 6 provas sem login passaram. Os logins reais falharam porque a senha do arquivo local não conferia com o Supabase Auth (problema de configuração do teste, corrigido em 2026-11-13); por isso os demais testes não rodaram nesta rodada. As provas sem login foram repetidas em seguida (6/6, com os prints atuais) com saída só no terminal.

| Teste | Resultado | Duração | Evidência registrada |
|---|---|---|---|
| EV-AUT-01 · CA-LOGIN-01 — tela de login em produção | PASSOU | 1.9 s | print: `01-autenticacao/01-tela-login.png` |
| EV-AUT-02 · CA-LOGIN-02 — e-mail inválido barrado na tela, sem chamar a autenticação | PASSOU | 1.1 s | print: `01-autenticacao/02-email-invalido.png`<br>Nenhuma requisição a autenticacao.entrar foi feita. |
| EV-AUT-03 · CA-LOGIN-03 — senha incorreta mostra mensagem genérica | PASSOU | 2.6 s | print: `01-autenticacao/03-senha-incorreta.png`<br>HTTP 401; corpo sem pilha nem detalhe interno. |
| EV-AUT-04 · CA-SESSAO — rotas protegidas sem sessão voltam ao login | PASSOU | 5.1 s | 5 rotas protegidas redirecionaram para /. |
| EV-SEG-01 · CA-SESSAO — procedimentos sem sessão respondem 401 sem dados | PASSOU | 2.0 s | sessao.atual: 401 UNAUTHORIZED | equipamentos.listar: 401 UNAUTHORIZED | equipamentos.detalhar: 401 UNAUTHORIZED | emprestimos.meus: 401 UNAUTHORIZED | emprestimos.meuResumo: 401 UNAUTHORIZED | operacoes.emprestimosEmAberto: 401 UNAUTHORIZED | operacoes.resumo: 401 UNAUTHORIZED | emprestimos.solicitar: 401 UNAUTHORIZED | equipamentos.cadastrar: 401 UNAUTHORIZED |
| EV-PUB-01 — técnico.status: banco operacional em produção | PASSOU | 0.5 s | ambiente=production; bancoOperacional=true; versao=0.1.0 |
| EV-AUT-05 · CA-LOGIN-04/05 — login do colaborador leva ao catálogo, cookie httpOnly e sem token na resposta | FALHOU | 1.1 s |  |
| EV-AUT-06 · CA-SESSAO-06 — colaborador não vê o grupo Operações | NÃO EXECUTADO | 0.0 s |  |
| EV-CAT-01 · CA-CATALOGO-01/04/05/06 — 12 equipamentos com fotografia, manutenção sem ação | NÃO EXECUTADO | 0.0 s |  |
| EV-CAT-02 · CA-CATALOGO-07 — filtros por categoria e Só disponíveis | NÃO EXECUTADO | 0.0 s |  |
| EV-CAT-03 · CA-CATALOGO / CA-SESSAO-13 — 375px sem rolagem horizontal | NÃO EXECUTADO | 0.0 s |  |
| EV-SOL-01 · CA-SOLICITACAO — detalhe sem dados restritos e prazo de 14 dias no diálogo (cancelado) | NÃO EXECUTADO | 0.0 s |  |
| EV-SOL-02 · CA-CATALOGO-05 — item em manutenção não tem ação de solicitar | NÃO EXECUTADO | 0.0 s |  |
| EV-DEV-01 · CA-MEUS — Meus empréstimos do colaborador (estado atual) | NÃO EXECUTADO | 0.0 s |  |
| EV-PERM-01 · CA-SESSAO — colaborador em /operacoes/* vê Acesso restrito | NÃO EXECUTADO | 0.0 s |  |
| EV-PERM-02 · CA-OPERACOES — colaborador chamando procedimentos de Operações direto na API recebe 403 | NÃO EXECUTADO | 0.0 s |  |
| EV-PERM-03 · Isolamento — tenantId enviado pelo cliente não muda o escopo | NÃO EXECUTADO | 0.0 s |  |
| EV-PERM-04 · Erros sem detalhe interno — entrada inválida em procedimento do colaborador | NÃO EXECUTADO | 0.0 s |  |
| EV-AUT-07 · CA-LOGIN-06 — Sair encerra a sessão e Voltar não reabre a área | NÃO EXECUTADO | 0.0 s |  |
| EV-AUT-08 · CA-SESSAO — sessão expirada (cookies apagados) volta ao login | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-01 · CA-SESSAO-06 — login de Operações e grupo Operações no menu | FALHOU | 1.9 s |  |
| EV-OPE-02 · CA-OPERACOES — painel de empréstimos em aberto e indicadores | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-03 · CA-OPERACOES — filtros do painel | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-04 · CA-OPERACOES — Operações vê dados internos no detalhe | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-05 · CA-OPERACOES — formulário de cadastro (sem enviar) | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-06 · Sair de Operações | NÃO EXECUTADO | 0.0 s |  |

Totais: 6 passaram, 2 falharam, 18 não executados.

## Produção — logado, somente leitura (2026-11-13)

| Teste | Resultado | Duração | Evidência registrada |
|---|---|---|---|
| EV-AUT-05 · CA-LOGIN-04/05 — login do colaborador leva ao catálogo, cookie httpOnly e sem token na resposta | PASSOU | 5.8 s | HTTP 200; 1 cookie(s) sb-* todos httpOnly+secure, sameSite=Lax; document.cookie não expõe a sessão; resposta de entrar sem token. |
| EV-AUT-06 · CA-SESSAO-06 — colaborador não vê o grupo Operações | PASSOU | 0.1 s | Bloco de usuário: "EmpresTI COLABORADOR Catálogo Meus empréstimos C Colaborador Sair" |
| EV-CAT-01 · CA-CATALOGO-01/04/05/06 — 12 equipamentos com fotografia, manutenção sem ação | PASSOU | 6.4 s | print: `02-catalogo/01-catalogo-12-itens.png`<br>Cabeçalho: "12 equipamentos · 10 disponíveis agora"; fotos carregadas: 12/12; miniaturas com ícone: 0; TI-0004 e TI-0007 em Manutenção sem link.<br>Fotos com alt vazio (decorativas): 12; nome do item no aria-label do card. |
| EV-CAT-02 · CA-CATALOGO-07 — filtros por categoria e Só disponíveis | PASSOU | 3.4 s | print: `02-catalogo/02-filtro-notebooks.png`<br>print: `02-catalogo/03-filtro-notebooks-so-disponiveis.png`<br>Notebooks=4; Notebooks+Só disponíveis=3 (sem TI-0004); Todos+Só disponíveis=10; com Só disponíveis: Monitores=10, Cabos=10, Câmeras=10 |
| EV-CAT-03 · CA-CATALOGO / CA-SESSAO-13 — 375px sem rolagem horizontal | PASSOU | 2.4 s | print: `02-catalogo/04-catalogo-375px.png`<br>scrollWidth - clientWidth = 0px em 375px; barra superior visível. |
| EV-SOL-01 · CA-SOLICITACAO — detalhe sem dados restritos e prazo de 14 dias no diálogo (cancelado) | PASSOU | 3.6 s | print: `03-solicitacoes/01-detalhe-TI-0001.png`<br>print: `03-solicitacoes/02-dialogo-confirmacao-prazo-14-dias.png`<br>Diálogo mostrou "Devolver até 27/nov" (hoje + 14 dias corridos, São Paulo). Cancelado: nenhuma mutação. |
| EV-SOL-02 · CA-CATALOGO-05 — item em manutenção não tem ação de solicitar | PASSOU | 0.7 s | print: `03-solicitacoes/03-detalhe-TI-0004-manutencao.png`<br>Sem botão Solicitar no detalhe. |
| EV-DEV-01 · CA-MEUS — Meus empréstimos do colaborador (estado atual) | PASSOU | 1.6 s | print: `05-devolucoes/01-meus-emprestimos-estado-atual.png`<br>Texto: "Meus empréstimos Pegar emprestado Comigo agora 0 de 3 itens · nenhum em atraso Nenhum item com você. Ver o catálogo Histórico Nenhuma devolução registrada." |
| EV-PERM-01 · CA-SESSAO — colaborador em /operacoes/* vê Acesso restrito | PASSOU | 2.9 s | print: `07-permissoes/01-colaborador-acesso-restrito.png` |
| EV-PERM-02 · CA-OPERACOES — colaborador chamando procedimentos de Operações direto na API recebe 403 | PASSOU | 3.4 s | operacoes.emprestimosEmAberto: 403 FORBIDDEN | operacoes.resumo: 403 FORBIDDEN | operacoes.ultimosCadastros: 403 FORBIDDEN | operacoes.registrarDevolucao: 403 FORBIDDEN | equipamentos.cadastrar: 403 FORBIDDEN | equipamentos.alterarSituacao: 403 FORBIDDEN |
| EV-PERM-03 · Isolamento — tenantId enviado pelo cliente não muda o escopo | PASSOU | 1.0 s | sem tenantId: 200 (12 itens); com tenantId forjado: 200  (12 itens) |
| EV-PERM-04 · Erros sem detalhe interno — entrada inválida em procedimento do colaborador | PASSOU | 0.6 s | emprestimos.solicitar com entrada inválida: 400 BAD_REQUEST; mensagem="Dados inválidos. Confira os campos." |
| EV-AUT-07 · CA-LOGIN-06 — Sair encerra a sessão e Voltar não reabre a área | PASSOU | 4.7 s | print: `01-autenticacao/04-apos-sair.png`<br>Após Sair: Voltar manteve o login; sessao.atual=401; cookies sb-* restantes com valor: 0. |
| EV-AUT-08 · CA-SESSAO — sessão expirada (cookies apagados) volta ao login | PASSOU | 3.1 s | Com cookies apagados, /meus-emprestimos redirecionou para /. |
| EV-OPE-01 · CA-SESSAO-06 — login de Operações e grupo Operações no menu | PASSOU | 4.5 s | print: `06-operacoes/01-catalogo-visao-operacoes.png` |
| EV-OPE-02 · CA-OPERACOES — painel de empréstimos em aberto e indicadores | PASSOU | 6.0 s | print: `06-operacoes/02-painel-emprestimos-em-aberto.png`<br>operacoes.resumo = {"emAberto":0,"vencendoEm3Dias":0,"emAtraso":0,"emManutencao":2}; texto da tela: "Operações Cadastrar equipamento Empréstimos em aberto 0 itens fora · atualizado às 07:42 Em aberto 0 Vencem em 3 dias 0 Em atraso 0 Em manutenção 2 Todos Em atraso Vencem esta semana Notebooks Nenhum empréstimo em aberto." |
| EV-OPE-03 · CA-OPERACOES — filtros do painel | PASSOU | 0.7 s | print: `06-operacoes/03-filtro-em-atraso.png`<br>Filtro Em atraso aplicado. |
| EV-OPE-04 · CA-OPERACOES — Operações vê dados internos no detalhe | PASSOU | 3.7 s | print: `06-operacoes/04-detalhe-TI-0004-visao-operacoes.png`<br>Texto: "Catálogo Notebooks Notebook 15 polegadas 0 de 3 itens com você Notebook 15 polegadas Manutenção CATEGORIA Notebook PATRIMÔNIO TI-0004 Histórico Nenhum empréstimo registrado. Solicitar empréstimo Retirada Ao confirmar Prazo padrão 14 dias corridos Solicitar empréstimo Em manutenção. Indisponível para" |
| EV-OPE-05 · CA-OPERACOES — formulário de cadastro (sem enviar) | PASSOU | 3.9 s | print: `06-operacoes/05-formulario-cadastro.png`<br>print: `06-operacoes/06-cadastro-formato-invalido.png`<br>Patrimônio fora do formato barrado no cliente; nenhuma chamada a equipamentos.cadastrar. |
| EV-OPE-06 · Sair de Operações | PASSOU | 3.5 s |  |

Totais: 20 passaram, 0 falharam, 0 não executados.

## Produção — ciclo com mutações, parte 1 (2026-11-13)

EV-OPE-08 falhou por seletor do teste (o rádio é `sr-only`; o clique precisa ir no `label`), sem alterar dados. O seletor foi corrigido e os passos restantes rodaram na parte 2.

| Teste | Resultado | Duração | Evidência registrada |
|---|---|---|---|
| EV-CIC-00 — login real dos dois perfis | PASSOU | 8.3 s |  |
| EV-SOL-03 · CA-SOLIC-01 / CA-REGRAS-03 — solicitar item disponível cria o empréstimo com 14 dias | PASSOU | 5.6 s | print: `03-solicitacoes/04-solicitacao-confirmada.png`<br>TI-0012 solicitado; prazo exibido 27/nov. |
| EV-SOL-04 · CA-SOLIC — catálogo mostra o item emprestado e a API recusa nova solicitação do mesmo item | PASSOU | 4.9 s | print: `03-solicitacoes/05-catalogo-item-emprestado.png`<br>Solicitação repetida pela API: 409 CONFLICT "Equipamento indisponível." |
| EV-REG-01 · CA-REGRAS-01 — terceiro item aceito e quarto recusado (interface e API) | PASSOU | 10.8 s | print: `04-regras/01-terceiro-item-3-de-3.png`<br>print: `04-regras/02-quarto-item-recusado.png`<br>Interface do 4º: "Solicitar empréstimo Retirada Ao confirmar Prazo padrão 14 dias corridos Solicitar empréstimo Limite de 3 itens atingido. Devolva um item para solicitar outro. Seus itens 3 de 3 Nenhum item em atraso."; API direta: 409 CONFLICT "Limite de 3 itens atingido." |
| EV-DEV-02 · CA-MEUS — Meus empréstimos lista os 3 itens com barra de prazo | PASSOU | 2.9 s | print: `05-devolucoes/02-meus-emprestimos-3-itens.png` |
| EV-OPE-07 · CA-OPER-01/02 — Operações vê os 3 empréstimos, com o responsável, e os cards | PASSOU | 3.1 s | print: `06-operacoes/07-painel-com-3-emprestimos.png`<br>Resumo: {"emAberto":3,"vencendoEm3Dias":0,"emAtraso":0,"emManutencao":2}; lista: "Câmera compacta Câmera · TI-0012 Sem nome cadastrado 13/nov 27/nov No prazo Devolver Webcam Full HD Câmera · TI-0011 Sem nome cadastrado 13/nov 27/nov No prazo Devolver Cabo de rede 3 m Cabo · TI-0010 Sem nome cadastrado 13/nov 27/nov No prazo Devolver" |
| EV-OPE-08 · CA-OPER-09 — manutenção recusada com empréstimo em aberto | FALHOU | 60.0 s |  |
| EV-OPE-09 · CA-OPER-06 — patrimônio duplicado é recusado sem gravar | NÃO EXECUTADO | 0.0 s |  |
| EV-OPE-10 · CA-OPER-03 — devolução no balcão encerra o empréstimo de outra pessoa | NÃO EXECUTADO | 0.0 s |  |
| EV-DEV-03 · CA-DEV — colaborador devolve com confirmação e o item volta ao catálogo | NÃO EXECUTADO | 0.0 s |  |
| EV-CIC-99 — estado final igual ao inicial: nenhum empréstimo em aberto | NÃO EXECUTADO | 0.0 s |  |

Totais: 6 passaram, 1 falharam, 4 não executados.

## Produção — ciclo com mutações, parte 2 (2026-11-13)

| Teste | Resultado | Duração | Evidência registrada |
|---|---|---|---|
| EV-CIC-00 — login real dos dois perfis | PASSOU | 5.8 s |  |
| EV-OPE-08 · CA-OPER-09 — manutenção recusada com empréstimo em aberto | PASSOU | 5.0 s | print: `06-operacoes/08-manutencao-recusada-emprestimo-aberto.png`<br>Mensagem: "Não é possível alterar: o equipamento tem empréstimo em aberto."; disponibilidade após a recusa: {"estado":"emprestado","devolverAte":"2026-11-27"} |
| EV-OPE-09 · CA-OPER-06 — patrimônio duplicado é recusado sem gravar | PASSOU | 3.6 s | print: `06-operacoes/09-patrimonio-duplicado.png` |
| EV-OPE-10 · CA-OPER-03 — devolução no balcão encerra o empréstimo de outra pessoa | PASSOU | 3.9 s | print: `06-operacoes/10-confirmar-devolucao-balcao.png`<br>print: `06-operacoes/11-apos-devolucao-balcao.png` |
| EV-DEV-03 · CA-DEV — colaborador devolve com confirmação e o item volta ao catálogo | PASSOU | 10.3 s | print: `05-devolucoes/03-confirmar-devolucao.png`<br>print: `05-devolucoes/04-historico-apos-devolucoes.png`<br>Histórico: "Meus empréstimos Pegar emprestado Comigo agora 0 de 3 itens · nenhum em atraso Devolução registrada: Webcam Full HD. Nenhum item com você. Ver o catálogo Histórico ITEM RETIRADA DEVOLUÇÃO SITUAÇÃO Webcam Full HD 13/nov 13/nov No prazo Câmera compacta 13/nov 13/nov No prazo Cabo de rede 3 m 13/nov 13/nov No prazo"<br>print: `05-devolucoes/05-catalogo-restaurado.png` |
| EV-CIC-99 — estado final igual ao inicial: nenhum empréstimo em aberto | PASSOU | 0.9 s | emprestimosEmAberto após o ciclo: {"itens":[],"proximoCursor":null}<br>Resumo final: {"emAberto":0,"vencendoEm3Dias":0,"emAtraso":0,"emManutencao":2} |

Totais: 6 passaram, 0 falharam, 0 não executados.
