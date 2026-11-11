# Spec — operações: empréstimos em aberto, devolução e cadastro

## Estado

**Status:** PROPOSTA — aguardando aprovação conjunta. Decisões funcionais aprovadas pelo
responsável em 2026-11-11. Nenhum código ou migration antes da aprovação de spec, plano e tarefas.

## Objetivo

Dar a Operações a visão de quem está com o quê, o registro de devolução no balcão e o cadastro de
equipamentos, permitindo abandonar a planilha.

## Vínculos

- **PRD:** item 5; ator Operações; critério de sucesso. **ADR-001:** §4, §7, §10.
- **Specs 003, 005 e 007.** **Layout:** telas 05 e 06, §5.7. **Desvio aprovado:** sem busca (DF-11).

## Escopo

- Rotas `/operacoes/emprestimos` e `/operacoes/equipamentos/novo`.
- `operacoes.emprestimosEmAberto`, `operacoes.resumo`, `operacoes.registrarDevolucao`,
  `operacoes.ultimosCadastros`, `equipamentos.cadastrar` e `equipamentos.alterarSituacao`.
- Cards de estatística, chips, tabela paginada, formulário e controle de situação no detalhe.

## Fora de escopo

Importação da planilha (PRD), relatórios, exportação e upload de fotografia.

## Requisitos funcionais

- **RF-OPER-01** — A tela lista todos os empréstimos em aberto do tenant, por cursor, com
  `pessoa{ nomeExibicao | null }`.
- **RF-OPER-02** — Cards mostram em aberto, vencendo em 3 dias, em atraso e em manutenção.
- **RF-OPER-03** — Chips filtram a lista, e "Vencem esta semana" significa os próximos 7 dias
  (filtro `vencem_7_dias`). Linhas em atraso ficam destacadas.
- **RF-OPER-04** — `operacoes.registrarDevolucao` usa o serviço de encerramento da Spec 007, com
  diálogo de confirmação.
- **RF-OPER-05** — `equipamentos.cadastrar` valida com o mesmo esquema Zod do formulário.
- **RF-OPER-06** — O formulário oferece "Cadastrar" e "Cadastrar e adicionar outro", com prévia.
- **RF-OPER-07** — `equipamentos.alterarSituacao` recebe `{ equipamentoId, situacao }` e recusa com
  `EMPRESTIMO_EM_ABERTO` se houver empréstimo em aberto.
- **RF-OPER-08** — `operacoes.ultimosCadastros` devolve 3 itens `{ patrimonio, nome, criadoEm }`.

## Regras de negócio

- **RN-OPER-01** — Um registro por unidade física.
- **RN-OPER-02** — Patrimônio no formato `^TI-\d{4}$`, único no tenant; repetido responde
  `PATRIMONIO_DUPLICADO`.
- **RN-OPER-03** — Situação inicial: Disponível (`ativo`), Em manutenção ou Fora de uso.
- **RN-OPER-04** — Categorias: as quatro existentes.

## Segurança e autorização

- **RS-OPER-01** — Todos os procedimentos usam `adminProcedure`.
- **RS-OPER-02** — `colaborador` recebe `FORBIDDEN`, mesmo chamando direto.
- **RS-OPER-03** — Devolução, cadastro e alteração de situação gravam auditoria com o ator.

## Contrato afetado

Seis procedimentos e duas rotas. Sem migration: as colunas opcionais vêm da Spec 005.

## Critérios de aceitação

- **CA-OPER-01** — A lista traz todos os empréstimos em aberto do tenant, e nenhum de outro.
- **CA-OPER-02** — Os cards batem com os dados, com datas fixas no teste.
- **CA-OPER-03** — Operações registra a devolução de empréstimo de outra pessoa, e o item é liberado.
- **CA-OPER-04** — `colaborador` é recusado em cada procedimento.
- **CA-OPER-05** — Cadastrar cria o equipamento no tenant da sessão.
- **CA-OPER-06** — Patrimônio repetido responde `PATRIMONIO_DUPLICADO`, e formato inválido é recusado.
- **CA-OPER-07** — Equipamento em manutenção não aparece como disponível.
- **CA-OPER-08** — Devolução, cadastro e alteração gravam auditoria, e falha nela desfaz a operação.
- **CA-OPER-09** — Alterar a situação com empréstimo em aberto responde `EMPRESTIMO_EM_ABERTO`.
- **CA-OPER-10** — `operacoes.ultimosCadastros` traz os 3 mais recentes do tenant.
- **CA-OPER-11** — "Vencem esta semana" inclui exatamente os próximos 7 dias, com datas fixas.
- **CA-OPER-12** — Lint, typecheck, testes, E2E e build passam, com a validação integrada real
  obrigatória antes da entrega.

## Dependências

Specs 003, 005 e 007. Conta `operacoes` (DF-9).

## Riscos

- A carga inicial aborta se um patrimônio `TI-00xx` for cadastrado aqui com outra fotografia.
- Conta real sem nome de exibição aparece só com o papel para Operações.

## Decisões tomadas

- **D-OPER-01 (DF-8):** colunas opcionais na migration da Spec 005.
- **D-OPER-02 (DF-7):** incluir `equipamentos.alterarSituacao`.
- **D-OPER-03 (DF-18):** quatro categorias. **D-OPER-04 (DF-17):** sem upload.
- **DF-11:** sem busca. **DF-20:** "Vencem esta semana" = 7 dias. **DF-21:** formato de patrimônio.
- **DF-23:** últimos cadastros. **DF-4:** diálogo na devolução. **DF-5:** nome só para Operações.
