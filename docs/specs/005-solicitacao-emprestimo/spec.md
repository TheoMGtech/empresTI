# Spec — detalhe do equipamento e solicitação de empréstimo

## Estado

**Status:** Implementada — aprovada pelo responsável em 2026-11-11, com `plan.md` e `tasks.md`;
T-SOLIC-01 a T-SOLIC-08 concluídas. Verificação formal V-01 (2026-11-11, commit `9a421a2`):
`Veredito: PRONTA` (`verificacao.md`). Aguarda a validação final do responsável para ser declarada
PRONTA. A validação integrada real (DF-14) continua obrigatória antes da publicação em `main` e na
Vercel.

## Objetivo

Permitir ver os dados de um equipamento e pegar emprestado um item disponível, criando a estrutura
de empréstimos.

## Vínculos

- **PRD:** item 3. **ADR-001:** §3, §6, §10. **Spec 002:** RN-DADOS-06 e auditoria.
- **Specs 003 e 004.** **Layout:** tela 03, §5.9 e fluxo Catálogo → Detalhe → confirmação.

## Escopo

- Rota `/catalogo/:patrimonio` e `equipamentos.detalhar`.
- Tabela de empréstimos e `emprestimos.solicitar`, em uma única migration, que também traz
  `devolvido_em`, o índice único parcial de empréstimo em aberto e as colunas opcionais
  `numero_serie`, `local` e `observacoes` em `equipamentos`.
- Diálogo de confirmação, estado "Emprestado" no catálogo e primeiros eventos de auditoria.

## Fora de escopo

Limite de itens e bloqueio por atraso (Spec 006). Devolução (Spec 007). Reserva e notificação (PRD).

## Requisitos funcionais

- **RF-SOLIC-01** — `equipamentos.detalhar` busca por tenant e patrimônio e devolve
  `{ id, patrimonio, nome, categoria, imagemUrl, disponibilidade, local, ultimaDevolucao, devolverAtePrevisto }`.
  Só para Operações: `numeroSerie`, `observacoes`, `historico`.
- **RF-SOLIC-02** — `emprestimos.solicitar` recebe só o identificador do equipamento e devolve
  `{ id, devolverAte }`. Usuário, tenant e prazo vêm do servidor.
- **RF-SOLIC-03** — O diálogo mostra `devolverAtePrevisto`, calculado no servidor.
- **RF-SOLIC-04** — Após confirmar, o item aparece como emprestado no catálogo.
- **RF-SOLIC-05** — O detalhe usa imagem maior e oculta o que não tiver valor.
- **RF-SOLIC-06** — Recusas usam os motivos `EQUIPAMENTO_NAO_ENCONTRADO`,
  `EQUIPAMENTO_INDISPONIVEL` e `EQUIPAMENTO_EM_MANUTENCAO`.

## Regras de negócio

- **RN-SOLIC-01** — Só equipamento `ativo` e sem empréstimo em aberto pode ser solicitado.
- **RN-SOLIC-02** — Um equipamento tem no máximo um empréstimo em aberto, garantido pelo banco.
- **RN-SOLIC-03** — Prazo padrão de 14 dias corridos. Esta spec é a dona do prazo.
- **RN-SOLIC-04** — Equipamento em manutenção é recusado. Esta spec é a dona dessa recusa.
- **RN-SOLIC-05** — O empréstimo é imediato: a retirada é o momento da confirmação.
- **RN-SOLIC-06** — `colaborador` e `operacoes` podem solicitar.
- **RN-SOLIC-07** — `fora_de_uso` responde `NOT_FOUND` para colaborador.

## Segurança e autorização

- **RS-SOLIC-01** — `tenantProcedure` em todos os procedimentos.
- **RS-SOLIC-02** — A tabela nasce com RLS deny by default, policies e bloqueio de `TRUNCATE`.
- **RS-SOLIC-03** — Empréstimo e equipamento não podem pertencer a tenants diferentes.
- **RS-SOLIC-04** — Cada solicitação grava auditoria na mesma transação, com o UUID como ator.
- **RS-SOLIC-05** — Histórico e nome de terceiros só para Operações.

## Contrato afetado

Tabela de empréstimos, colunas em `equipamentos`, `equipamentos.detalhar`, `emprestimos.solicitar`.

**Supera:** CA-DADOS-01, CA-DADOS-06 e CA-DADOS-18 da Spec 002 fixam a lista de tabelas, as colunas
de equipamento e a ausência de empréstimos. A primeira tarefa desta spec delimita essas provas à
Spec 002, sem removê-las.

## Critérios de aceitação

- **CA-SOLIC-01** — Solicitar item disponível cria o empréstimo com prazo de 14 dias corridos.
- **CA-SOLIC-02** — Item em manutenção é recusado com `EQUIPAMENTO_EM_MANUTENCAO`.
- **CA-SOLIC-03** — Duas solicitações simultâneas do mesmo item resultam em um único empréstimo.
- **CA-SOLIC-04** — Usuário do tenant A não detalha nem solicita item do tenant B.
- **CA-SOLIC-05** — O banco rejeita empréstimo que cruze tenants.
- **CA-SOLIC-06** — A tabela tem RLS e bloqueio de `TRUNCATE` comprovados.
- **CA-SOLIC-07** — A solicitação grava auditoria, e falha na auditoria desfaz o empréstimo.
- **CA-SOLIC-08** — `fora_de_uso` responde `NOT_FOUND` para colaborador.
- **CA-SOLIC-09** — Colaborador não recebe `numeroSerie`, `observacoes` nem `historico`.
- **CA-SOLIC-10** — `devolverAtePrevisto` coincide com o prazo gravado, com datas fixas.
- **CA-SOLIC-11** — Lint, typecheck, testes, E2E e build passam, e a migration aplica do zero. E2E
  com tRPC simulado vale no desenvolvimento e basta para declarar esta spec PRONTA; a validação
  integrada real é obrigatória antes da entrega final, isto é, antes da publicação em `main` e na
  Vercel (DF-14).

## Dependências

Specs 002, 003 e 004. PRs separados em `develop` são permitidos, mas a publicação em `main` leva
as Specs 005 e 006 juntas.

## Riscos

Regra checada só na aplicação perde para concorrência: RN-SOLIC-02 exige índice único parcial.

## Decisões tomadas

- **D-SOLIC-01 (DF-3):** empréstimo imediato. **DF-20:** Operações também pode solicitar.
- **D-SOLIC-02 (DF-8):** ocultar o que não tiver valor; colunas opcionais nesta migration.
- **D-SOLIC-03 (DF-5):** histórico e nomes só para Operações.
- **D-SOLIC-04 (DF-19):** ator é o UUID.
- **DF-17:** imagem maior no detalhe. **DF-10:** Radix Dialog autorizado, só na primeira tarefa
  que precisar.
- **DF-14 (responsável, 2026-11-11):** a validação integrada real é obrigatória antes da entrega
  final (publicação em `main` e na Vercel), mas não é pré-condição para declarar esta spec PRONTA.
  A spec pode ser PRONTA com os critérios comprovados, lint, typecheck, testes e build aprovados, o
  E2E previsto aprovado (tRPC simulado vale no desenvolvimento) e `Veredito: PRONTA` do
  `verificador-spec` no commit exato. Roteiro: `docs/VALIDACAO-INTEGRADA.md`.
