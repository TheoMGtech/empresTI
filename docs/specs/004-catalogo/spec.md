# Spec — catálogo de equipamentos

## Estado

**Status:** APROVADA — pelo responsável em 2026-11-11, com `plan.md` e `tasks.md`. Ainda não
implementada.

## Objetivo

Mostrar os equipamentos do tenant com fotografia, categoria e situação, com filtros, para o
colaborador saber o que pode pedir.

## Vínculos

- **PRD:** item 2; manutenção não aparece como disponível.
- **ADR-001:** §2, §4 (paginação por cursor), §6.
- **Spec 002:** RN-DADOS-06 e RN-DADOS-08. **Spec 003:** `tenantProcedure` e shell.
- **Layout:** §5.3, §5.4, §5.8 e tela 02. **Desvio aprovado:** sem campo de busca (DF-11).

## Escopo

- Rota `/catalogo` e procedimento `equipamentos.listar`.
- Card com fotografia, nome, metadados e pill de estado.
- Faixa de regras, chips de categoria e filtro "Só disponíveis".

## Fora de escopo

Detalhe e solicitação (Spec 005), limite e contador (Spec 006), cadastro (Spec 008), busca,
publicação ou conferência remota de fotografias.

## Requisitos funcionais

- **RF-CATALOGO-01** — `equipamentos.listar` devolve só equipamentos do tenant da sessão, por cursor.
  Entrada: `{ categoria?, somenteDisponiveis?, cursor?, limite? }`. Saída:
  `{ itens[{ patrimonio, nome, categoria, imagemUrl, disponibilidade }], proximoCursor, resumo{ total, disponiveis } }`.
- **RF-CATALOGO-02** — `imagemUrl` é montada na leitura, a partir de `NEXT_PUBLIC_SUPABASE_URL` e
  do caminho gravado.
- **RF-CATALOGO-03** — A fotografia, de 40×40, ocupa o lugar do ícone. Sem ela, ou se não carregar,
  o card usa o ícone da categoria.
- **RF-CATALOGO-04** — Chips filtram por categoria, e "Só disponíveis" filtra pela disponibilidade.
- **RF-CATALOGO-05** — O cabeçalho mostra o total e quantos estão disponíveis.
- **RF-CATALOGO-06** — Card disponível é clicável, e os demais não têm ação. Exceção: `operacoes`
  abre o detalhe de item indisponível.
- **RF-CATALOGO-07** — Item emprestado mostra "Emprestado · devolve {data}".

## Regras de negócio

- **RN-CATALOGO-01** — `disponibilidade` é a união `disponivel`, `emprestado{ devolverAte }`,
  `manutencao` e `fora_de_uso`. A variante `emprestado` só é retornada a partir da Spec 005.
- **RN-CATALOGO-02** — `em_manutencao` aparece com pill e sem ação, nunca como disponível.
- **RN-CATALOGO-03** — `fora_de_uso` é oculto para colaboradores e visível para Operações.

## Segurança e autorização

- **RS-CATALOGO-01** — `tenantProcedure`, e o tenant nunca vem do input.
- **RS-CATALOGO-02** — Input validado com Zod.
- **RS-CATALOGO-03** — `equipamentos.listar` nunca devolve o nome do tomador, para nenhum papel.

## Contrato afetado

`equipamentos.listar` e rota `/catalogo`. Sem migration.

## Critérios de aceitação

- **CA-CATALOGO-01** — Com a carga inicial, a lista traz os 12 equipamentos.
- **CA-CATALOGO-02** — Usuário do tenant A não recebe equipamento do tenant B.
- **CA-CATALOGO-03** — Sem sessão ou sem membership, o procedimento recusa.
- **CA-CATALOGO-04** — TI-0004 e TI-0007 aparecem em manutenção e sem ação.
- **CA-CATALOGO-05** — A URL da fotografia é montada a partir do caminho gravado.
- **CA-CATALOGO-06** — Fotografia ausente exibe o ícone da categoria.
- **CA-CATALOGO-07** — Cada chip e "Só disponíveis" filtram corretamente.
- **CA-CATALOGO-08** — A paginação por cursor não duplica nem perde itens.
- **CA-CATALOGO-09** — `fora_de_uso` não aparece para `colaborador` e aparece para `operacoes`.
- **CA-CATALOGO-10** — A saída não contém nome do tomador, para nenhum papel.
- **CA-CATALOGO-11** — Lint, typecheck, testes, E2E e build passam. E2E com tRPC simulado vale no
  desenvolvimento e basta para declarar esta spec PRONTA; a validação integrada real é obrigatória
  antes da entrega final, isto é, antes da publicação em `main` e na Vercel (DF-14).

## Dependências

Specs 002 e 003. Fotografias acessíveis no bucket `equipamentos`.

## Riscos

- Fotos remotas não conferidas (IMG-16): RF-CATALOGO-03 cobre a falha.
- A CSP, quando existir, precisa permitir o host do Storage.

## Decisões tomadas

- **D-CATALOGO-01 e 02 (DF-6):** manutenção com pill e sem ação; `fora_de_uso` só para Operações.
- **D-CATALOGO-03 (DF-17):** foto 40×40 no card, ícone como fallback.
- **D-CATALOGO-04 (DF-11):** busca adiada.
- **D-CATALOGO-05 (DF-5):** nome do tomador nunca sai em `equipamentos.listar`.
- **DF-14 (responsável, 2026-11-11):** a validação integrada real é obrigatória antes da entrega
  final (publicação em `main` e na Vercel), mas não é pré-condição para declarar esta spec PRONTA.
  A spec pode ser PRONTA com os critérios comprovados, lint, typecheck, testes e build aprovados, o
  E2E previsto aprovado (tRPC simulado vale no desenvolvimento) e `Veredito: PRONTA` do
  `verificador-spec` no commit exato. Roteiro: `docs/VALIDACAO-INTEGRADA.md`.
