# Spec — regras de empréstimo

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Aplicar no servidor as regras decididas por Operações: limite de itens, prazo, bloqueio por atraso
e manutenção, e mostrá-las na interface.

## Vínculos

- **PRD:** "Regras que Operações já decidiu". **ADR-001:** §3 (regra no service).
- **Spec 005.** **Layout:** §5.8, §5.10, §9 e o contador do cabeçalho.

## Escopo

- Regras em `emprestimos.solicitar`.
- Procedimento `emprestimos.meuResumo` e contador "N de 3 itens com você".
- Segmentos de limite, nota de atraso e botão desabilitado.

## Fora de escopo

Renovação de prazo, multa, exceção de limite e notificação de atraso.

## Requisitos funcionais

- **RF-REGRAS-01** — `emprestimos.meuResumo` devolve itens em aberto, limite e existência de atraso.
- **RF-REGRAS-02** — Com atraso ou no limite, "Solicitar" fica desabilitado, com a nota do motivo.
- **RF-REGRAS-03** — O diálogo avisa quando a solicitação leva ao terceiro item.
- **RF-REGRAS-04** — Recusa por regra devolve `TRPCError` com código identificável pela tela.

## Regras de negócio

- **RN-REGRAS-01** — Máximo de 3 itens em aberto por pessoa.
- **RN-REGRAS-02** — Prazo padrão de 14 dias.
- **RN-REGRAS-03** — Quem tem item em atraso não pega outro.
- **RN-REGRAS-04** — Equipamento em manutenção não pode ser solicitado.
- **RN-REGRAS-05** — Empréstimo em atraso continua contando no limite.

## Segurança e autorização

- **RS-REGRAS-01** — A interface só informa: toda regra vale no servidor.
- **RS-REGRAS-02** — A contagem é por pessoa dentro do tenant da sessão.

## Contrato afetado

`emprestimos.solicitar` passa a recusar por regra; novo `emprestimos.meuResumo`.

## Critérios de aceitação

- **CA-REGRAS-01** — O terceiro item é aceito, e o quarto é recusado.
- **CA-REGRAS-02** — Solicitações simultâneas não ultrapassam o limite de 3.
- **CA-REGRAS-03** — O prazo é de 14 dias a partir da retirada, com datas fixas no teste.
- **CA-REGRAS-04** — Quem tem item em atraso é recusado, mesmo abaixo do limite.
- **CA-REGRAS-05** — Devolver o item atrasado libera novas solicitações.
- **CA-REGRAS-06** — Item em manutenção é recusado.
- **CA-REGRAS-07** — A interface desabilita a ação e mostra o motivo.
- **CA-REGRAS-08** — A chamada direta ao servidor, sem a interface, também é recusada.
- **CA-REGRAS-09** — Lint, typecheck, testes, E2E e build passam.

## Dependências

Spec 005. CA-REGRAS-05 depende da devolução (Spec 007).

## Riscos

Ler a contagem e inserir sem bloqueio permite ultrapassar o limite: a transação precisa serializar
por pessoa.

## Decisões pendentes

- **D-REGRAS-01 — Dias corridos ou úteis.** O PRD diz "14 dias", e o layout calcula por data.
  **Recomendação:** dias corridos.
- **D-REGRAS-02 — Quando começa o atraso.** **Recomendação:** depois do fim do dia do prazo, no
  fuso de São Paulo.
- **D-REGRAS-03 — Limite.** O PRD diz 3, e sua instrução também. Notas anteriores registram que a
  atividade citaria 5, mas esse enunciado não foi consultado. **Recomendação:** manter 3.
