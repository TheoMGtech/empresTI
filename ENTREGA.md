# Entrega — EmpresTI

> Atualizado em 2026-11-13. **Estado: versão 1 (Specs 001–008) publicada e validada em produção;
> entrega final ainda não concluída** — a Spec 009 (segurança HTTP e limite de requisições) está em
> desenvolvimento e há pendências listadas na seção 19. Nada aqui é declarado concluído sem
> evidência.

## 1. Identificação

| Item | Valor |
|---|---|
| Projeto | EmpresTI — empréstimo de equipamentos de TI |
| Repositório | <https://github.com/TheoMGtech/empresTI> |
| Aplicação | <https://empresti-self.vercel.app/> (alternativa, mesmo deploy: <https://empresti-theo-escola.vercel.app/>) |
| Tenant de demonstração | `suporte_ti` |
| Responsável | o responsável único do repositório (aprova specs, planos, PRs e o merge em `main`) |
| Rubrica escolar | não fornecida no repositório; os critérios abaixo vêm do PRD, das specs, do ADR-001 e das regras |

## 2. Objetivo

Substituir a planilha compartilhada de controle de empréstimos por um sistema com catálogo,
regras de empréstimo aplicadas no servidor, devolução registrada e visão de Operações sobre quem
está com cada item ([PRD](docs/PRD.md)).

## 3. Escopo entregue

As cinco capacidades da versão 1 do PRD estão em produção: login com cada pessoa vendo os próprios
empréstimos; catálogo com a situação de cada item; solicitação de item disponível; devolução; tela
de Operações com todos os empréstimos em aberto. Fora da versão 1, conforme o PRD: reserva futura,
notificação por e-mail e importação da planilha.

## 4. Stack

Next.js 16 (App Router) e React 19 com TypeScript `strict`; tRPC 11; Prisma 7 e PostgreSQL no
Supabase; Supabase Auth com cookies `httpOnly`; Tailwind CSS 4, shadcn/ui (Radix), React Hook Form e
Zod; Vitest, Testing Library, PostgreSQL em container e Playwright; GitHub Actions e Vercel.
Decisão vinculante: [ADR-001](docs/adr/001-stack.md).

## 5. Arquitetura

Monólito Next.js na Vercel. O navegador fala só com o Route Handler tRPC; o contexto deriva usuário,
papel e tenant da sessão (nunca do cliente); os routers chamam services, que usam Prisma. O banco tem
RLS deny-by-default para `anon` e `authenticated`, `tenant_id` em toda tabela de domínio e auditoria
de toda mutação. Detalhes no [README](README.md#tecnologias-e-arquitetura).

## 6. Funcionalidades

| Funcionalidade | Spec | Em produção |
|---|---|---|
| Login, sessão, Sair e proteção de rotas | [001](docs/specs/001-login/spec.md), [003](docs/specs/003-sessao-autorizacao/spec.md) | sim |
| Dados iniciais: tenant, 12 equipamentos e fotografias | [002](docs/specs/002-dados-iniciais/spec.md) | sim |
| Catálogo com filtros | [004](docs/specs/004-catalogo/spec.md) | sim |
| Detalhe e solicitação | [005](docs/specs/005-solicitacao-emprestimo/spec.md) | sim |
| Limite de 3 itens e bloqueio por atraso | [006](docs/specs/006-regras-emprestimo/spec.md) | sim |
| Meus empréstimos, devolução e histórico | [007](docs/specs/007-meus-emprestimos-devolucao/spec.md) | sim |
| Painel de Operações, balcão, cadastro e situação | [008](docs/specs/008-operacoes/spec.md) | sim |
| Cabeçalhos HTTP, CSP com nonce e limite de requisições | [009](https://github.com/TheoMGtech/empresTI/blob/develop/docs/specs/009-seguranca-http-rate-limit/spec.md) | não (em `develop`) |

## 7. Regras de negócio

Máximo de 3 itens por pessoa; prazo de 14 dias corridos (data de São Paulo); quem tem item em
atraso não pega outro; equipamento em manutenção não aparece como disponível; solicitações
simultâneas do mesmo item geram um único empréstimo. Todas são verificadas no servidor — a recusa
vale também para chamadas diretas à API.

## 8. Perfis de acesso

- **Colaborador:** catálogo, solicitação, "Meus empréstimos", devolução e histórico próprios. Não vê
  quem está com cada item nem dados internos do equipamento; rotas e procedimentos de Operações são
  recusados (tela "Acesso restrito a Operações." e HTTP 403).
- **Operações:** tudo o que o colaborador vê, mais painel de empréstimos em aberto do tenant,
  indicadores, devolução no balcão, cadastro de equipamento e alteração de situação.

## 9 e 10. Demonstração e contas

| Perfil | Login | Senha |
|---|---|---|
| Colaborador | `colaborador@empresti.test` | entregue em particular |
| Operações | `operacoes@empresti.test` | entregue em particular |

## 11. Senhas

As senhas **não estão no Git**, no README, em issues nem em PRs: o responsável as entrega ao
avaliador por canal privado. Os endereços `.test` são fictícios (não recebem e-mail nem recuperam
senha). As contas ainda não têm nome de exibição; por isso o painel de Operações mostra "Sem nome
cadastrado" na coluna Pessoa.

### Roteiro de avaliação (10 minutos)

1. Abra a aplicação e entre como **Colaborador**. Você cai no Catálogo: 12 equipamentos, "10
   disponíveis agora"; TI-0004 e TI-0007 estão em manutenção, sem ação.
2. Use os chips (Notebooks, Monitores, Cabos, Câmeras) e "Só disponíveis".
3. Abra um item disponível e clique em **Solicitar empréstimo**: o diálogo mostra "Devolver até"
   hoje + 14 dias. Confirme. O catálogo passa a mostrar "Emprestado · devolve …".
4. Solicite mais dois itens. No terceiro, o diálogo avisa "3 de 3"; no quarto, o botão fica
   desabilitado com "Limite de 3 itens atingido.".
5. Vá a **Meus empréstimos**: itens com a barra de prazo. Tente abrir `/operacoes/emprestimos`
   pela barra de endereço: "Acesso restrito a Operações.".
6. Clique em **Sair** e entre como **Operações**. O menu ganha o grupo Operações.
7. Em **Empréstimos em aberto**: os itens do colaborador, os cards (em aberto, vencem em 3 dias, em
   atraso, em manutenção) e os filtros. Registre uma **devolução no balcão**.
8. Abra um item ainda emprestado e tente colocá-lo **Em manutenção**: a alteração é recusada.
9. Em **Cadastrar equipamento**, tente o patrimônio `TI-0001`: "Já existe equipamento com este
   patrimônio.".
10. Volte como Colaborador e devolva os itens restantes: o histórico mostra "No prazo" e o catálogo
    volta a 10 disponíveis.

Os passos 3 a 10 criam empréstimos e auditoria reais em produção; devolver tudo no fim deixa o
catálogo como estava. Cadastrar um equipamento novo cria um item permanente (não há exclusão).

## 12. Evidências funcionais

Pacote completo, com índice por critério: [`docs/evidencias/`](docs/evidencias/README.md) — 32
capturas reais de produção e os resultados dos testes. Registro item a item:
[`docs/VALIDACAO-INTEGRADA.md`](docs/VALIDACAO-INTEGRADA.md).

| Rodada (produção, `main` `8e08040`) | Passou | Falhou | Não executado |
|---|---|---|---|
| Sem login | 6 | 0 | 0 |
| Logado, somente leitura (colaborador e Operações) | 20 | 0 | 0 |
| Ciclo com mutações, autorizado pelo responsável (13/11) | 11 passos | 0 | 0 |

O ciclo criou e encerrou 3 empréstimos (TI-0012, TI-0011 e TI-0010) e 6 registros de auditoria em
13/11/2026. **São registros de prova, não de uso real.** O estado final é igual ao inicial.

## 13. Evidências de segurança

- Cookie de sessão `httpOnly`, `secure`, SameSite=Lax; `document.cookie` não expõe a sessão; a
  resposta de login não traz token.
- Sem sessão: rotas protegidas voltam ao login e 9 procedimentos respondem 401 sem dados.
- Colaborador chamando 6 procedimentos de Operações direto: 403. `tenantId` forjado pelo cliente não
  muda o escopo. Erros sem pilha nem detalhe interno.
- Banco de produção: RLS em todas as tabelas de `public`, policies `USING false` para `anon` e
  `authenticated` (SQL somente leitura).
- Auditoria com o ator em cada solicitação e devolução do ciclo.
- Banco descartável: RLS, bloqueio de `TRUNCATE`, isolamento entre dois tenants e concorrência.
- Segredos: Gitleaks no CI; `.env*` ignorados; nenhuma senha em código, documentos ou prints.
- Pendente: Spec 009 (CSP, cabeçalhos e limite de tentativas) ainda não publicada.

## 14. Resultados de testes

| Onde | Resultado |
|---|---|
| CI de `main` (`8e08040`) | 57 arquivos, 1.356 testes Vitest aprovados; lint, typecheck e build verdes |
| CI de `develop` (com Spec 009 parcial) | verde em cada PR integrado |
| Banco descartável — regras, Operações, RLS e auditoria (13/11) | 253/253 |
| Produção — Playwright | 26 provas e 11 passos de ciclo, todos aprovados |

Cada teste cita no nome o critério de aceitação que prova (`CA-<FEATURE>-xx`).

## 15. Status das specs

| Spec | Estado | Verificação independente |
|---|---|---|
| 001 Login | Implementada | V-03 NÃO PRONTA (2026-11-09): CA-LOGIN-01, 04, 08 e 09 sem teste naquela data. Hoje há testes citando CA-LOGIN-01, 04 e 09, e o login real em produção foi comprovado; falta nova verificação formal |
| 002 Dados iniciais | **PRONTA** | V-03 PRONTA + validação do responsável (2026-11-11) |
| 003 a 008 | Implementadas | `Veredito: PRONTA` registrado em cada `verificacao.md`; falta a validação final do responsável para mudar o estado |
| 009 Segurança HTTP e limite | Em desenvolvimento | T-SEG-01 a 09 integradas em `develop` (PRs #91–#107); faltam T-SEG-11 a 13 e a verificação formal |

## 16. Infraestrutura

| Item | Estado em 2026-11-13 |
|---|---|
| Vercel Production | `main` `8e08040`, status success; as duas URLs respondem 200 |
| Supabase | 7 migrations, checksums iguais aos arquivos; 12 equipamentos e 12 fotos; 2 contas vinculadas |
| GitHub | `main` e `develop` protegidas (PR, histórico linear, check obrigatório); Environment `production` com revisor obrigatório |
| CI | `Architecture checks`: guarda documental, Gitleaks, lint, typecheck, testes e build |

Detalhes e pendências do responsável em [`docs/DEVOPS.md`](docs/DEVOPS.md).

## 17. Histórico de publicação

| Data | PR | Conteúdo |
|---|---|---|
| 2026-10-23 | #7 | Andar zero |
| 2026-10-23 | #14 | Login (Spec 001) |
| 2026-11-03 | #25 | Promoção de `develop` |
| 2026-11-12 | #98 | Specs 003–008, sem a Spec 009 (`8e08040`, árvore `3aa331e`) |

## 18. Commit em produção

`8e08040fb86419783dd373411b8ed63991a2a2b7` — release das Specs 003–008. Esta documentação é promovida separadamente para `main`, sem o código da Spec 009. O release da Spec 009 será um PR posterior para `main`, com merge exclusivo do responsável.

## 19. Pendências

| Pendência | Tipo | Quem |
|---|---|---|
| Concluir a Spec 009 (T-SEG-11 a 13), verificar formalmente e publicar em `main` | obrigatória (exigência de segurança do projeto) | sessão backend + responsável |
| Validação final do responsável nas Specs 003–008; nova verificação formal da Spec 001 | governança | responsável (autoriza) + agente |
| Confirmar `disable_signup` no Supabase Auth e a exposição de `public` na Data API | segurança | responsável |
| Preencher o nome de exibição das contas de demonstração | apresentação | responsável |
| Cadastrar `CHAVE_HMAC_LIMITES` na Vercel antes do release da Spec 009 | infraestrutura | responsável |
| Indicador do PRD: Operações abandonar a planilha após duas semanas de uso | acompanhamento futuro | não verificável antes de duas semanas de uso real |

## 20. Conclusão e aceite

A versão 1 funciona em produção com as regras do PRD comprovadas por testes automatizados, por
validação real com as duas contas e por consultas ao banco. A entrega **não** é declarada 100%
concluída: a Spec 009 é obrigatória e ainda não foi publicada, e as pendências de governança da
seção 19 dependem do responsável.

| Aceite | Data | Responsável |
|---|---|---|
| a registrar após o release da Spec 009 | — | — |
