# Spec — detalhe do equipamento e solicitação de empréstimo

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Permitir ver os dados de um equipamento e pegar emprestado um item disponível, criando a estrutura
de empréstimos.

## Vínculos

- **PRD:** item 3. **ADR-001:** §3, §6, §10 (auditoria). **Spec 002:** RN-DADOS-06 e auditoria.
- **Specs 003 e 004.** **Layout:** tela 03, §5.9 e fluxo Catálogo → Detalhe → confirmação.

## Escopo

- Rota `/catalogo/:patrimonio` e procedimento `equipamentos.detalhar`.
- Tabela de empréstimos e procedimento `emprestimos.solicitar`.
- Diálogo de confirmação com o prazo calculado.
- Estado "Emprestado" no catálogo.
- Primeiro produtor de eventos de auditoria.

## Fora de escopo

- Limite de itens e bloqueio por atraso (Spec 006). Devolução (Spec 007). Reserva com data futura e
  notificação por e-mail (PRD).

## Requisitos funcionais

- **RF-SOLIC-01** — `equipamentos.detalhar` busca por tenant e patrimônio.
- **RF-SOLIC-02** — `emprestimos.solicitar` recebe só o identificador do equipamento. Usuário,
  tenant e prazo vêm do servidor.
- **RF-SOLIC-03** — O diálogo mostra a data de devolução antes da confirmação.
- **RF-SOLIC-04** — Após confirmar, o item aparece como emprestado no catálogo.

## Regras de negócio

- **RN-SOLIC-01** — Só equipamento `ativo` e sem empréstimo em aberto pode ser solicitado.
- **RN-SOLIC-02** — Um equipamento tem no máximo um empréstimo em aberto, garantido pelo banco.
- **RN-SOLIC-03** — Prazo padrão de 14 dias (PRD).

## Segurança e autorização

- **RS-SOLIC-01** — `tenantProcedure` em todos os procedimentos.
- **RS-SOLIC-02** — A tabela nasce com RLS deny by default e policies explícitas.
- **RS-SOLIC-03** — Empréstimo e equipamento não podem pertencer a tenants diferentes.
- **RS-SOLIC-04** — Cada solicitação grava evento de auditoria na mesma transação.

## Contrato afetado

Nova tabela de empréstimos, `equipamentos.detalhar` e `emprestimos.solicitar`.

## Critérios de aceitação

- **CA-SOLIC-01** — Solicitar item disponível cria o empréstimo com o prazo correto.
- **CA-SOLIC-02** — Item em manutenção ou fora de uso é recusado.
- **CA-SOLIC-03** — Duas solicitações simultâneas do mesmo item resultam em um único empréstimo.
- **CA-SOLIC-04** — Usuário do tenant A não detalha nem solicita item do tenant B.
- **CA-SOLIC-05** — O banco rejeita empréstimo que cruze tenants.
- **CA-SOLIC-06** — A tabela tem RLS comprovada, como na T-DADOS-04.
- **CA-SOLIC-07** — A solicitação grava auditoria, e falha na auditoria desfaz o empréstimo.
- **CA-SOLIC-08** — Lint, typecheck, testes, E2E e build passam, e a migration aplica do zero.

## Dependências

Specs 002, 003 e 004. **Não liberar sem a Spec 006:** sem ela, o limite do PRD não é aplicado.

## Riscos

Regra checada só na aplicação perde para concorrência: RN-SOLIC-02 precisa de índice único parcial.

## Decisões pendentes

- **D-SOLIC-01 — Aprovação.** O PRD não prevê, e o layout vai direto a Meus empréstimos.
  **Recomendação:** empréstimo imediato, sem estado pendente.
- **D-SOLIC-02 — Campos sem dado.** A tela 03 mostra descrição, Local e Última devolução, ausentes
  na carga (D7). **Recomendação:** ocultar o que não tiver valor.
- **D-SOLIC-03 — Histórico do item.** Mostra dados de outras pessoas. **Recomendação:** só para
  Operações.
- **D-SOLIC-04 — Formato do ator na auditoria.** **Recomendação:** UUID do usuário, nunca e-mail.
