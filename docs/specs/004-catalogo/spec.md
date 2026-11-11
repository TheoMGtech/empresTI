# Spec — catálogo de equipamentos

## Estado

**Status:** RASCUNHO — não aprovado. Nenhum plano, tarefa, migration ou código deriva deste texto
antes da aprovação do responsável.

## Objetivo

Mostrar os equipamentos do tenant com fotografia, categoria e situação, com filtros, para o
colaborador saber o que pode pedir.

## Vínculos

- **PRD:** item 2 (catálogo com a situação de cada um); manutenção não aparece como disponível.
- **ADR-001:** §2 (Client Components, TanStack Query), §4 (paginação por cursor), §6.
- **Spec 002:** RN-DADOS-06 e RN-DADOS-08. **Spec 003:** `tenantProcedure` e shell.
- **Layout:** §5.3, §5.4, §5.8 e tela 02.

## Escopo

- Rota `/catalogo` e procedimento `equipamentos.listar`.
- Card com fotografia, nome, metadados e pill de estado.
- Faixa de regras, chips de categoria e filtro "Só disponíveis".

## Fora de escopo

- Detalhe e solicitação (Spec 005). Limite e contador de itens (Spec 006). Cadastro (Spec 008).
- Publicação ou conferência remota de fotografias.

## Requisitos funcionais

- **RF-CATALOGO-01** — `equipamentos.listar` devolve só equipamentos do tenant da sessão, com
  paginação por cursor.
- **RF-CATALOGO-02** — A URL pública da fotografia é montada na leitura, a partir de
  `NEXT_PUBLIC_SUPABASE_URL` e do caminho gravado.
- **RF-CATALOGO-03** — Sem fotografia, ou se ela não carregar, o card usa o ícone da categoria.
- **RF-CATALOGO-04** — Chips filtram por categoria, e "Só disponíveis" filtra pela situação efetiva.
- **RF-CATALOGO-05** — O cabeçalho mostra o total e quantos estão disponíveis.
- **RF-CATALOGO-06** — Card disponível é clicável, e os demais não têm ação.

## Regras de negócio

- **RN-CATALOGO-01** — Só `ativo` pode ser disponível (RN-DADOS-06). Enquanto a Spec 005 não
  existir, não há estado emprestado.
- **RN-CATALOGO-02** — `em_manutencao` nunca aparece como disponível (PRD).

## Segurança e autorização

- **RS-CATALOGO-01** — O procedimento usa `tenantProcedure`, e o tenant nunca vem do input.
- **RS-CATALOGO-02** — O input é validado com Zod.

## Contrato afetado

`equipamentos.listar` e rota `/catalogo`. Sem migration prevista.

## Critérios de aceitação

- **CA-CATALOGO-01** — Com a carga inicial, a lista traz os 12 equipamentos.
- **CA-CATALOGO-02** — Usuário do tenant A não recebe equipamento do tenant B.
- **CA-CATALOGO-03** — Sem sessão ou sem membership, o procedimento recusa.
- **CA-CATALOGO-04** — TI-0004 e TI-0007 não aparecem como disponíveis nem têm ação.
- **CA-CATALOGO-05** — A URL da fotografia é montada a partir do caminho gravado.
- **CA-CATALOGO-06** — Fotografia ausente exibe o ícone da categoria.
- **CA-CATALOGO-07** — Cada chip e "Só disponíveis" filtram corretamente.
- **CA-CATALOGO-08** — A paginação por cursor não duplica nem perde itens.
- **CA-CATALOGO-09** — Lint, typecheck, testes, E2E e build passam.

## Dependências

Specs 002 e 003. Fotografias acessíveis no bucket `equipamentos`.

## Riscos

- As fotos remotas não foram conferidas (IMG-16). RF-CATALOGO-03 cobre a falha.
- A CSP prevista no ADR, quando existir, precisa permitir o host do Storage.

## Decisões pendentes

- **D-CATALOGO-01 — Item em manutenção no catálogo.** O layout tem o card com pill âmbar e também
  a nota "não aparece no catálogo". O PRD só diz "não aparece como disponível". **Recomendação:**
  mostrar com pill e sem ação, o que também atende Operações.
- **D-CATALOGO-02 — `fora_de_uso`.** **Recomendação:** não mostrar ao colaborador.
- **D-CATALOGO-03 — Fotografia no card.** O layout usa ícone de 40×40 no card. **Recomendação:**
  fotografia no lugar do ícone, que fica como fallback.
- **D-CATALOGO-04 — Busca no cabeçalho.** Está no layout, mas não no PRD. **Recomendação:** adiar.
- **D-CATALOGO-05 — Nome de quem pegou.** O layout mostra "Com {pessoa}" a todos, com impacto em
  LGPD. **Recomendação:** seguir o layout, por ser sistema interno, se você confirmar.
