# Spec — regras de empréstimo

## Estado

**Status:** Implementada — aprovada pelo responsável em 2026-11-11, com `plan.md` e `tasks.md`;
T-REGRAS-01 a T-REGRAS-05 concluídas. Verificação formal V-01 (2026-11-11, commit `9a421a2`): NÃO
PRONTA, com CA-REGRAS-03 e CA-REGRAS-06 SEM TESTE. V-02 (2026-11-11, commit `854f6c4`):
`Veredito: PRONTA` (`verificacao.md`). Aguarda a validação final do responsável para ser declarada
PRONTA. A validação integrada real (DF-14) continua obrigatória antes da publicação em `main` e na
Vercel.

## Objetivo

Aplicar no servidor o limite de itens e o bloqueio por atraso, e mostrá-los na interface.

## Vínculos

- **PRD:** "Regras que Operações já decidiu". **ADR-001:** §3 (regra no service).
- **Spec 005.** **Layout:** §5.8, §5.10, §9 e o contador do cabeçalho.

## Escopo

- Regras em `emprestimos.solicitar`.
- `emprestimos.meuResumo` e contador "N de 3 itens com você".
- Segmentos de limite, nota de atraso e botão desabilitado.

## Fora de escopo

Renovação de prazo, multa, exceção de limite e notificação de atraso.

## Requisitos funcionais

- **RF-REGRAS-01** — `emprestimos.meuResumo` devolve `{ itensAbertos, limite, emAtraso, prazoDias }`.
- **RF-REGRAS-02** — Com atraso ou no limite, "Solicitar" fica desabilitado, com a nota do motivo.
- **RF-REGRAS-03** — O diálogo avisa quando a solicitação leva ao terceiro item.
- **RF-REGRAS-04** — Recusas usam os motivos `LIMITE_ATINGIDO` e `ITEM_EM_ATRASO`.

## Regras de negócio

- **RN-REGRAS-01** — Máximo de 3 itens em aberto por pessoa.
- **RN-REGRAS-02** — Prazo: ver RN-SOLIC-03.
- **RN-REGRAS-03** — Quem tem item em atraso não pega outro.
- **RN-REGRAS-04** — Manutenção: ver RN-SOLIC-04.
- **RN-REGRAS-05** — Empréstimo em atraso continua contando no limite.
- **RN-REGRAS-06** — O atraso começa depois do fim da data de vencimento, no fuso de São Paulo.

## Segurança e autorização

- **RS-REGRAS-01** — A interface só informa: toda regra vale no servidor.
- **RS-REGRAS-02** — A contagem é por pessoa dentro do tenant da sessão.

## Contrato afetado

`emprestimos.solicitar` passa a recusar por regra; novo `emprestimos.meuResumo`. Sem migration.

## Critérios de aceitação

- **CA-REGRAS-01** — O terceiro item é aceito, e o quarto é recusado com `LIMITE_ATINGIDO`.
- **CA-REGRAS-02** — Solicitações simultâneas não ultrapassam o limite de 3.
- **CA-REGRAS-03** — Prazo: ver CA-SOLIC-01.
- **CA-REGRAS-04** — Quem tem item em atraso é recusado com `ITEM_EM_ATRASO`, mesmo abaixo do limite.
- **CA-REGRAS-05** — Fixture com empréstimo vencido e `devolvido_em` preenchido não bloqueia.
- **CA-REGRAS-06** — Manutenção: ver CA-SOLIC-02.
- **CA-REGRAS-07** — A interface desabilita a ação e mostra o motivo.
- **CA-REGRAS-08** — A chamada direta ao servidor, sem a interface, também é recusada.
- **CA-REGRAS-09** — O vencimento é tratado no fuso de São Paulo, com datas fixas nas bordas do dia.
- **CA-REGRAS-10** — Lint, typecheck, testes, E2E e build passam. E2E com tRPC simulado vale no
  desenvolvimento e basta para declarar esta spec PRONTA; a validação integrada real é obrigatória
  antes da entrega final, isto é, antes da publicação em `main` e na Vercel (DF-14).

## Dependências

Spec 005. Sem dependência da Spec 007.

## Riscos

Ler a contagem e inserir sem bloqueio permite ultrapassar o limite: a transação serializa por pessoa.

## Decisões tomadas

- **D-REGRAS-01 e 02 (DF-2):** 14 dias corridos; atraso após o fim da data de vencimento, em São Paulo.
- **D-REGRAS-03 (DF-1):** limite de 3.
- **DF-14 (responsável, 2026-11-11):** a validação integrada real é obrigatória antes da entrega
  final (publicação em `main` e na Vercel), mas não é pré-condição para declarar esta spec PRONTA.
  A spec pode ser PRONTA com os critérios comprovados, lint, typecheck, testes e build aprovados, o
  E2E previsto aprovado (tRPC simulado vale no desenvolvimento) e `Veredito: PRONTA` do
  `verificador-spec` no commit exato. Roteiro: `docs/VALIDACAO-INTEGRADA.md`.
