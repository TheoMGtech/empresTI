# Spec — operações: empréstimos em aberto, devolução e cadastro

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Dar a Operações a visão de quem está com o quê, o registro de devolução no balcão e o cadastro de
equipamentos, permitindo abandonar a planilha.

## Vínculos

- **PRD:** item 5; ator Operações; critério de sucesso. **ADR-001:** §4, §7 (`adminProcedure`), §10.
- **Specs 003, 005 e 007.** **Layout:** telas 05 e 06, §5.7.

## Escopo

- Rotas `/operacoes/emprestimos` e `/operacoes/equipamentos/novo`.
- Procedimentos `operacoes.emprestimosEmAberto`, `operacoes.resumo`, `operacoes.registrarDevolucao`
  e `equipamentos.cadastrar`.
- Cards de estatística, chips, tabela paginada e formulário.

## Fora de escopo

Importação da planilha (PRD), relatórios, exportação e upload de fotografia.

## Requisitos funcionais

- **RF-OPER-01** — A tela lista todos os empréstimos em aberto do tenant, por cursor.
- **RF-OPER-02** — Cards mostram em aberto, vencendo em 3 dias, em atraso e em manutenção.
- **RF-OPER-03** — Chips filtram a lista, e linhas em atraso ficam destacadas.
- **RF-OPER-04** — `operacoes.registrarDevolucao` encerra qualquer empréstimo em aberto do tenant.
- **RF-OPER-05** — `equipamentos.cadastrar` valida o formulário com o mesmo esquema Zod do servidor.
- **RF-OPER-06** — O formulário oferece "Cadastrar" e "Cadastrar e adicionar outro", com prévia.

## Regras de negócio

- **RN-OPER-01** — Um registro por unidade física.
- **RN-OPER-02** — Patrimônio único no tenant.
- **RN-OPER-03** — Situação inicial: Disponível (`ativo`), Em manutenção ou Fora de uso.

## Segurança e autorização

- **RS-OPER-01** — Todos os procedimentos usam `adminProcedure`.
- **RS-OPER-02** — `colaborador` recebe `FORBIDDEN`, mesmo chamando direto.
- **RS-OPER-03** — Devolução e cadastro gravam auditoria com o ator de Operações.

## Contrato afetado

Quatro procedimentos e duas rotas. Migration condicionada a D-OPER-01.

## Critérios de aceitação

- **CA-OPER-01** — A lista traz todos os empréstimos em aberto do tenant, e nenhum de outro.
- **CA-OPER-02** — Os cards batem com os dados, com datas fixas no teste.
- **CA-OPER-03** — Operações registra a devolução de empréstimo de outra pessoa, e o item é liberado.
- **CA-OPER-04** — `colaborador` é recusado em cada procedimento.
- **CA-OPER-05** — Cadastrar cria o equipamento no tenant da sessão.
- **CA-OPER-06** — Patrimônio repetido no tenant é recusado com mensagem clara.
- **CA-OPER-07** — Equipamento em manutenção não aparece como disponível.
- **CA-OPER-08** — Devolução e cadastro gravam auditoria, e falha nela desfaz a operação.
- **CA-OPER-09** — Lint, typecheck, testes, E2E e build passam.

## Dependências

Specs 003, 005 e 007. Conta com papel `operacoes` (D-SESSAO-04). Nome de exibição (D-SESSAO-02).

## Riscos

A carga inicial não sobrescreve equipamentos cadastrados, mas um patrimônio `TI-00xx` criado aqui
com outra fotografia fará a carga abortar.

## Decisões pendentes

- **D-OPER-01 — Número de série, Local e Observações.** Estão na tela 06 e foram excluídos da
  Spec 002 (D7). **Recomendação:** colunas opcionais, em migration desta spec.
- **D-OPER-02 — Tirar item da manutenção.** O layout só tem "Situação inicial", e sem edição um
  item nunca sai da manutenção. **Recomendação:** incluir `equipamentos.alterarSituacao`.
- **D-OPER-03 — Categorias.** O layout cita projetor e dock, e o banco tem quatro. **Recomendação:**
  manter as quatro.
- **D-OPER-04 — Fotografia no cadastro.** Não há campo no layout. **Recomendação:** sem foto, com
  ícone da categoria.
