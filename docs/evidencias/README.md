# Evidências de aceite — EmpresTI

> leitor: avaliador e responsável. Evidências reais da validação integrada (`docs/VALIDACAO-INTEGRADA.md`),
> coletadas em produção e em banco descartável. Publicadas com autorização do responsável em 2026-11-13.

## Contexto

| Item | Valor |
|---|---|
| Aplicação | <https://empresti-self.vercel.app/> |
| Versão testada | `main` = `8e08040fb86419783dd373411b8ed63991a2a2b7` (árvore `3aa331e38f8b53b28176e7c72ce2d444890da80f`), Specs 001–008, sem a Spec 009 |
| Navegador | Chromium (Playwright 1.56.1), 1440×900 e 375×812, fuso America/Sao_Paulo |
| Rodadas | sem login em 2026-11-12 (~21h BRT); logado e ciclo com mutações em 2026-11-13 (07:40–07:50 BRT) |
| Contas | `colaborador@empresti.test` e `operacoes@empresti.test`, tenant `suporte_ti` |
| Autorização | o ciclo com mutações em produção foi autorizado pelo responsável antes de rodar |

As senhas ficaram em arquivo local ignorado pelo Git e foram preenchidas sem aparecer em passos,
logs ou prints. Nenhum print mostra senha, token ou cookie. Testes de concorrência, atraso e
isolamento entre tenants não rodam em produção: rodam em PostgreSQL 17.6 descartável, em container,
pela suíte versionada do projeto.

## Totais

| Conjunto | Passou | Falhou | Não executado |
|---|---|---|---|
| Produção — sem login | 6 | 0 | 0 |
| Produção — logado, somente leitura (colaborador e Operações) | 20 | 0 | 0 |
| Produção — ciclo com mutações | 11 passos | 0 | 0 |
| PostgreSQL descartável — regras, concorrência, Operações, RLS, auditoria | 253 | 0 | 0 |
| Atraso com conta real em produção | — | — | 1 (exige empréstimo vencido; coberto por CA-REGRAS-04/05 no banco descartável) |

Detalhe de cada execução, incluindo as falhas de configuração e de seletor do próprio teste que
foram corrigidas: [resultados-producao.md](resultados-producao.md). Saída da suíte com banco real:
[04-regras/resultados-banco-real.txt](04-regras/resultados-banco-real.txt).

## Índice por critério

### 1. Autenticação e sessão

| Evidência | Critério | Resultado |
|---|---|---|
| [Tela de login](01-autenticacao/01-tela-login.png) | CA-LOGIN-01 | PASSOU |
| [E-mail inválido barrado sem chamar a API](01-autenticacao/02-email-invalido.png) | CA-LOGIN-02 | PASSOU |
| [Senha incorreta: mensagem genérica, HTTP 401 sem detalhe](01-autenticacao/03-senha-incorreta.png) | CA-LOGIN-03 | PASSOU |
| Login real → `/catalogo`; cookie `sb-*` `httpOnly` + `secure`, SameSite=Lax; `document.cookie` sem sessão; resposta de login sem token | CA-LOGIN-04/05 | PASSOU ([resultados](resultados-producao.md)) |
| [Sair volta a `/`; Voltar não reabre; `sessao.atual` = 401](01-autenticacao/04-apos-sair.png) | CA-LOGIN-06 | PASSOU |
| Sessão expirada (cookies apagados) volta a `/`; 5 rotas protegidas sem sessão voltam a `/`; 9 procedimentos sem sessão → 401 | Spec 003 | PASSOU |

### 2. Catálogo

| Evidência | Critério | Resultado |
|---|---|---|
| [12 itens, 12/12 fotos carregadas, "12 equipamentos · 10 disponíveis agora", TI-0004/TI-0007 em manutenção sem ação](02-catalogo/01-catalogo-12-itens.png) | CA-CATALOGO-01/04/05/06 | PASSOU |
| [Filtro Notebooks (4)](02-catalogo/02-filtro-notebooks.png) e [Notebooks + Só disponíveis (3)](02-catalogo/03-filtro-notebooks-so-disponiveis.png) | CA-CATALOGO-07 | PASSOU |
| [375px sem rolagem horizontal](02-catalogo/04-catalogo-375px.png) | CA-SESSAO-13 | PASSOU |

### 3. Detalhe e solicitação

| Evidência | Critério | Resultado |
|---|---|---|
| [Detalhe sem dados restritos para o colaborador](03-solicitacoes/01-detalhe-TI-0001.png) | Spec 005 | PASSOU |
| [Diálogo com prazo de 14 dias corridos](03-solicitacoes/02-dialogo-confirmacao-prazo-14-dias.png) | CA-SOLIC-01 / CA-REGRAS-03 | PASSOU |
| [Item em manutenção sem solicitação](03-solicitacoes/03-detalhe-TI-0004-manutencao.png) | CA-SOLIC-02 | PASSOU |
| [Empréstimo registrado, "Devolva até 27/nov"](03-solicitacoes/04-solicitacao-confirmada.png) | CA-SOLIC-01 | PASSOU |
| [Catálogo mostra "Emprestado · devolve"](03-solicitacoes/05-catalogo-item-emprestado.png); a mesma solicitação pela API → 409 | Spec 005 | PASSOU |
| Duas solicitações simultâneas do mesmo item → um único empréstimo | CA-SOLIC-03 | PASSOU no banco descartável |

### 4. Limite e atraso

| Evidência | Critério | Resultado |
|---|---|---|
| [Terceiro item: "Com este item você chega a 3 de 3"](04-regras/01-terceiro-item-3-de-3.png) | CA-REGRAS-01 | PASSOU |
| [Quarto item recusado na tela](04-regras/02-quarto-item-recusado.png); pela API → 409 "Limite de 3 itens atingido." | CA-REGRAS-01/08 | PASSOU |
| Atraso bloqueia nova solicitação; devolução libera; ordem das recusas; concorrência no limite | CA-REGRAS-02/04/05/09 | PASSOU no banco descartável |

### 5. Meus empréstimos e devolução

| Evidência | Critério | Resultado |
|---|---|---|
| [Estado antes do ciclo (nenhum item)](05-devolucoes/01-meus-emprestimos-estado-atual.png) | Spec 007 | PASSOU |
| [3 itens com barra de prazo](05-devolucoes/02-meus-emprestimos-3-itens.png) | Spec 007 | PASSOU |
| [Confirmação de devolução](05-devolucoes/03-confirmar-devolucao.png) | Spec 007 | PASSOU |
| [Histórico com "No prazo"](05-devolucoes/04-historico-apos-devolucoes.png) | Spec 007 | PASSOU |
| [Catálogo de volta a 10 disponíveis](05-devolucoes/05-catalogo-restaurado.png) | Spec 007 | PASSOU |

### 6. Operações

| Evidência | Critério | Resultado |
|---|---|---|
| [Menu com o grupo Operações](06-operacoes/01-catalogo-visao-operacoes.png) | CA-SESSAO-06 | PASSOU |
| [Painel sem empréstimos](06-operacoes/02-painel-emprestimos-em-aberto.png) e [filtro Em atraso](06-operacoes/03-filtro-em-atraso.png) | CA-OPER-01/02/11 | PASSOU |
| [Detalhe com dados internos](06-operacoes/04-detalhe-TI-0004-visao-operacoes.png) | Spec 008 | PASSOU |
| [Formulário de cadastro](06-operacoes/05-formulario-cadastro.png) e [formato inválido barrado](06-operacoes/06-cadastro-formato-invalido.png) | CA-OPER-05/06 | PASSOU |
| [Painel com 3 empréstimos e cards](06-operacoes/07-painel-com-3-emprestimos.png) | CA-OPER-01/02 | PASSOU |
| [Manutenção recusada com empréstimo aberto](06-operacoes/08-manutencao-recusada-emprestimo-aberto.png) | CA-OPER-09 | PASSOU |
| [Patrimônio duplicado recusado](06-operacoes/09-patrimonio-duplicado.png) | CA-OPER-06 | PASSOU |
| [Confirmação](06-operacoes/10-confirmar-devolucao-balcao.png) e [resultado](06-operacoes/11-apos-devolucao-balcao.png) da devolução no balcão | CA-OPER-03 | PASSOU |

### 7. Permissões e isolamento

| Evidência | Critério | Resultado |
|---|---|---|
| [Colaborador em `/operacoes/*` vê "Acesso restrito a Operações."](07-permissoes/01-colaborador-acesso-restrito.png) | CA-SESSAO | PASSOU |
| Colaborador chamando 6 procedimentos de Operações direto na API → 403 FORBIDDEN | CA-OPER-04 | PASSOU |
| `tenantId` forjado pelo cliente não muda o escopo; erro de entrada sem pilha | Spec 003 | PASSOU |
| Tenant A não lê nem altera dados do tenant B; RLS nega `anon` e `authenticated` | CA-DADOS-02, CA-SOLIC-04, CA-OPER-01/02 | PASSOU no banco descartável |

## Banco de produção (consultas somente leitura)

Antes do ciclo: 0 empréstimos e 0 registros de auditoria. Depois:

| Item | Retirada (BRT) | Prazo | Devolução (BRT) | Devolvido por |
|---|---|---|---|---|
| TI-0012 | 13/11 07:43 | 2026-11-27 | 13/11 07:46 | colaborador |
| TI-0011 | 13/11 07:43 | 2026-11-27 | 13/11 07:46 | colaborador |
| TI-0010 | 13/11 07:43 | 2026-11-27 | 13/11 07:45 | Operações (balcão) |

- Auditoria: 6 registros — 3 `emprestimo.solicitar` (ator colaborador), 1 `emprestimo.devolver`
  (ator Operações) e 2 `emprestimo.devolver` (ator colaborador). As recusas não gravaram nada.
- Estado final: 0 empréstimos em aberto, 12 equipamentos, só TI-0004 e TI-0007 em manutenção,
  nenhum equipamento criado. **Esses 3 empréstimos são registros desta prova, não uso real.**
- Migrations: 7 aplicadas, com checksum igual ao SHA-256 dos `migration.sql` versionados. RLS em
  todas as tabelas de `public`, com policies `USING false` para `anon` e `authenticated`.

## Observações

- No painel de Operações, a coluna Pessoa mostra "Sem nome cadastrado" porque o `nome_exibicao` das
  contas de demonstração está vazio. É o fallback do componente, coberto por teste; a seção Riscos
  da Spec 008 diz que essa conta "aparece só com o papel" — divergência de redação, não de RF ou CA,
  a decidir pelo responsável. Preencher os nomes das contas é ação do responsável.
- As fotografias usam `alt=""`: o card já tem `aria-label` com o nome do item, então a imagem é
  decorativa.
- Não verificado pelo agente: se o cadastro público está desabilitado no Supabase Auth
  (`docs/DEVOPS.md`, pendência 1).
