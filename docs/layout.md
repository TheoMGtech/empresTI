# EmpresTI — Especificação de Layout (para reprodução por agente de IA)

Documento de referência do front-end do EmpresTI (empréstimo de equipamentos internos).
Base visual: design system **Nocturne** adaptado à primária `#001449`.
**Somente modo escuro.** Não existe modo claro, nem alternador de tema.

---

## 1. Princípios visuais

1. Fundo quase preto azulado; superfícies elevadas por *borda + escurecimento ambiente*, nunca por sombra pesada.
2. Ações primárias são **contornadas** (borda de 1px + fundo transparente), nunca preenchidas com cor sólida.
3. A primária `#001449` é usada como **fundo profundo** (marca, hero do login, avatares, chips ativos), não como cor de texto ou de botão — em fundo escuro ela não tem contraste suficiente.
4. A cor de ação visível é `#5B7FE0` (mesma família, mais clara).
5. Baixa saturação fora do azul de ação; cinzas azulados carregam superfícies, bordas e texto secundário.
6. Alinhamento à esquerda, layouts densos, títulos flush-left.
7. Nada de gradiente agressivo, emoji ou preto/branco puros.

---

## 2. Cores

### 2.1 Base

| Token | Hex | Uso |
|---|---|---|
| `--page` | `#05070F` | Fundo da moldura/documento (fora do app) |
| `--color-bg` | `#080C1A` | Fundo da aplicação |
| `--sidebar-bg` | `#060A16` | Fundo da sidebar (mais escuro que o app) |
| `--color-surface` | `#0E1530` | Cards, painéis, linhas de destaque |
| `--surface-sunken` | `#0B1128` | Inputs, cabeçalho de tabela, cards internos, blocos de apoio |
| `--color-text` | `#E6EAF6` | Texto principal |
| `--text-muted` | `#8A93B2` | Texto secundário / descrições |
| `--text-dim` | `#7C86A2` | Metadados (categoria, patrimônio) |
| `--text-faint` | `#5E6884` | Rótulos uppercase, datas, textos de apoio |
| `--text-ghost` | `#454E68` | Rótulos de grupo na sidebar, "(opcional)" |

### 2.2 Bordas e divisores

| Token | Hex | Uso |
|---|---|---|
| `--border-frame` | `#222C4A` | Contorno externo da tela, inputs, chips inativos |
| `--border-card` | `#1F2949` | Borda de cards |
| `--border-soft` | `#1A2340` | Divisor de sidebar/header, blocos de apoio |
| `--border-row` | `#161D33` | Linhas internas de tabelas e listas |
| `--border-strong` | `#2B3450` | Inputs de formulário, botão secundário |

### 2.3 Rampa da primária (derivada de #001449)

| Token | Hex | Uso |
|---|---|---|
| `--accent-100` | `#EEF2FE` | Texto em hover de botão primário |
| `--accent-200` | `#D6E0FB` | Texto de chip ativo / botão de confirmação |
| `--accent-300` | `#B4C6F6` | Texto de botão primário, valores destacados |
| `--accent-400` | `#8AA6EE` | Ícones, links, ícone ativo da sidebar |
| `--accent-500` | `#5B7FE0` | **Cor de ação**: bordas de botão primário, barras de progresso, marca ativa |
| `--accent-600` | `#3C5DBE` | Hover de borda de card, ícone grande de hero |
| `--accent-700` | `#25408F` | Borda de aviso, borda do logo, borda de chip ativo |
| `--accent-800` | `#132663` | Fundo de chip ativo, avatar, badge de contagem |
| `--accent-900` | `#001449` | **Primária** — fundo do logo e do painel do login |

### 2.4 Estados semânticos

| Estado | Texto | Fundo | Borda |
|---|---|---|---|
| Disponível | `#5FD3AA` | `rgba(63,185,140,0.12)` | `rgba(63,185,140,0.35)` |
| Emprestado | `#9AA3BC` | `#1A2340` | `#2B3450` |
| Manutenção | `#E8B961` | `rgba(224,163,63,0.12)` | `rgba(224,163,63,0.35)` |
| Atraso | `#F0A0A5` (rótulo `#E08A90`) | linha: `rgba(224,91,98,0.05)` | `rgba(224,91,98,0.4)` |

### 2.5 Cinzas de interface (rampa neutra)

`#F2F4FA` · `#DFE3EE` · `#C4CADB` · `#9AA3BC` · `#7C86A2` · `#5E6884` · `#454E68` · `#2B3450` · `#161D33`
(100 → 900; o passo 400 `#9AA3BC` é o texto de item inativo da sidebar.)

### 2.6 Elevação

```
--shadow-sm: 0 0 0 1px #222C4A;
--shadow-md: 0 0 0 1px #2B3450, 0 6px 18px rgba(0,0,0,0.55);
--shadow-lg: 0 0 0 1px #454E68, 0 18px 44px rgba(0,0,0,0.7);
```
Moldura de tela usa `0 0 0 1px #222C4A, 0 18px 44px rgba(0,0,0,0.6)`. Diálogo usa `--shadow-lg`. Nunca empilhar sombras.

### 2.7 Gradientes permitidos (apenas três)

- Hero do login: `linear-gradient(160deg,#001449 0%,#00102F 60%,#080C1A 100%)`
- Faixa de aviso de regras: `linear-gradient(90deg,#0E1530,#0B1128)`
- Área de imagem do item: `radial-gradient(120% 120% at 20% 0%,#132663 0%,#0B1128 60%)`

### 2.8 Divisores com esmaecimento (assinatura do Nocturne)

Réguas horizontais desaparecem nas pontas em vez de terminarem retas:

```css
/* régua de largura total */
background: linear-gradient(to right,
  rgba(230,234,246,0), #222C4A 48px,
  #222C4A calc(100% - 48px), rgba(230,234,246,0));
height: 1px;

/* régua-marca (só à direita) */
background: linear-gradient(to right, #3C5DBE, rgba(60,93,190,0));
```
Divisores curtos internos (linhas de tabela, borda de sidebar) são sólidos.

### 2.9 Links

```css
a { color:#8AA6EE; text-decoration:none }
a:hover { color:#B4C6F6 }
```

---

## 3. Tipografia

- Família única: **Open Sans** (`400, 500, 600, 700`), fallback `system-ui, sans-serif`. Títulos e corpo usam a mesma família.
- Pesos usados: **400** (corpo) e **600** (títulos, rótulos, valores). Nunca 700 em títulos.
- `letter-spacing: -0.01em` em títulos; `0.02em` em nomes de marca; `0.08em`–`0.12em` em rótulos uppercase.
- `text-wrap: pretty` em parágrafos longos.

### Escala

| Papel | Tamanho | Peso | Cor |
|---|---|---|---|
| Título do documento | 40px / 1.1 | 600 | `#E6EAF6` |
| Título do hero (login) | 34px / 1.15 | 600 | `#E6EAF6` |
| Título de item (detalhe) | 28px | 600 | `#E6EAF6` |
| Título de página (H1 interno) | 24px | 600 | `#E6EAF6` |
| Métrica de card de estatística | 26px | 600 | `#E6EAF6` |
| Número de destaque (hero) | 24px | 600 | `#E6EAF6` |
| Título de seção (H2 do doc) | 17px | 600 | `#E6EAF6` |
| Título de diálogo | 19px | 600 | `#E6EAF6` |
| Título de subseção | 15px | 600 | `#E6EAF6` |
| Nome de item em lista | 15px | 600 | `#E6EAF6` |
| Nome de item em card | 14.5px | 600 | `#E6EAF6` |
| Corpo / input / célula | 13–14px | 400 | `#E6EAF6` |
| Descrição | 13–13.5px | 400 | `#8A93B2` |
| Metadados | 12–12.5px | 400 | `#7C86A2` |
| Rótulo de campo | 12px | 400 | `#9AA3BC` |
| Item de navegação | 13px | 400 | `#9AA3BC` (ativo: `#E6EAF6`) |
| Badge / pill de estado | 11px | 600 | conforme estado |
| Rótulo uppercase | 11px, `letter-spacing:.08–.1em` | 400 | `#5E6884` |
| Rótulo de grupo (sidebar) | 10px, `letter-spacing:.12em` | 400 | `#454E68` |
| Nota de apoio | 11.5px | 400 | `#5E6884` |

Mínimo absoluto: 10px, e somente para rótulos uppercase de agrupamento.

---

## 4. Espaçamento, raios e proporções

### 4.1 Escala de espaçamento (densidade 0.7×)

Valores em uso: `3 · 5 · 6 · 7 · 8 · 9 · 10 · 12 · 14 · 16 · 18 · 20 · 22 · 26 · 28 · 32 · 40 · 56 · 64`px.
Sempre `display:flex` / `grid` + `gap` — nunca margens por elemento nem espaço por whitespace.

### 4.2 Raios

| Raio | Uso |
|---|---|
| `14px` | Moldura de tela, diálogo |
| `12px` | Cards, contêiner de tabela, blocos laterais |
| `11px` | Cards de estatística, card interno de prévia |
| `10px` | Bloco de usuário na sidebar, ícone de item em lista (44px) |
| `9px` | Ícone de item em card (40px), blocos internos |
| `8px` | Botões, inputs, itens de navegação, logo |
| `7px` | Botão de tabela (30px), paginação, logo pequeno |
| `99px` | Pills, avatares, barras de progresso |

### 4.3 Molduras de tela

| Tela | Dimensão |
|---|---|
| 01 Login | 1440 × 820 |
| 02 Catálogo | 1440 × 900 |
| 03 Detalhe do item | 1440 × 900 |
| 04 Meus empréstimos | 1440 × 820 |
| 05 Operações | 1440 × 900 |
| 06 Cadastrar equipamento | 1440 × 820 |

### 4.4 Estrutura do app (telas 02–06)

```
grid-template-columns: 236px 1fr    /* sidebar | main */
```

- **Sidebar** 236px: fundo `#060A16`, `border-right:1px solid #1A2340`, padding `22px 14px`, `gap:26px`.
  - Marca: ícone 28×28 (raio 7px, fundo `#001449`, `box-shadow:0 0 0 1px #25408F`), texto 14px/600, `gap:10px`, padding lateral 8px.
  - Nav: `flex-direction:column; gap:3px`. Item: padding `9px 10px`, raio 8px, ícone 16px, `gap:10px`.
  - Rótulo de grupo: padding `0 8px 6px` (primeiro) / `18px 8px 6px` (seguintes).
  - Bloco de usuário: `margin-top:auto`, padding 12px, raio 10px, fundo `#0B1128`, borda `#1A2340`; avatar 28px circular fundo `#132663` com iniciais 11px/600 em `#B4C6F6`.
- **Header do main**: altura fixa **64px**, `border-bottom:1px solid #1A2340`, padding lateral 28px, `align-items:center`.
  - Busca: altura 36px, `max-width:400–420px`, raio 8px, fundo `#0B1128`, borda `#222C4A`, ícone + placeholder em `#5E6884`, `gap:8px`.
  - Ação do header: altura 34px, padding lateral 14px.
- **Conteúdo**: padding `26–32px 28px`, `flex-direction:column; gap:20–22px`.

### 4.5 Alturas de controles

| Controle | Altura |
|---|---|
| Botão principal de formulário/login | 44px (padding lateral 20px) |
| Input / select / campo | 42px (padding lateral 12px) |
| Botão de diálogo | 38px (padding lateral 16px) |
| Botão em linha de lista | 36px (padding lateral 16px) |
| Busca e ação de header | 34–36px |
| Botão em linha de tabela | 30px |
| Textarea | 88px, `resize:none`, padding `10px 12px` |
| Barra de progresso | 4px (linha) / 5px (segmentos) |

### 4.6 Grids internos

- Catálogo: `repeat(3,1fr)`, `gap:16px`. Card: padding 16px, `gap:12px`.
- Cards de estatística (Operações): `repeat(4,1fr)`, `gap:14px`, padding `16px 18px`.
- Detalhe do item: `1fr 356px`, `gap:32px`. Imagem: altura 260px.
- Formulário de cadastro: `1fr 320px`, `gap:40px`; formulário interno `1fr 1fr`, `gap:18px`, largura máx. 620px; campos largos usam `grid-column: span 2`.
- Ficha técnica do item: `repeat(4,1fr)`, `gap:20px`.
- Tabela de Operações: `1.3fr 1.1fr 120px 120px 150px 110px`, `gap:16px`, linha `padding:13px 18px`, cabeçalho `padding:12px 18px`.
- Histórico do colaborador: `1fr 150px 150px 130px`, `gap:16px`.
- Lista "Comigo agora": linha `padding:18px 20px`, `gap:18px`; ícone 44px; coluna de prazo 180px.

### 4.7 Larguras de texto

Parágrafos limitados por `max-width` em ch: `20ch` (título de hero), `38ch` (subtítulo de hero), `56ch` (descrição do documento), `60ch` (descrição de item).

---

## 5. Componentes

### 5.1 Botões

| Variante | Borda | Fundo | Texto | Hover |
|---|---|---|---|---|
| Primário | `1px solid #5B7FE0` | transparente | `#B4C6F6` 600 | `background:rgba(91,127,224,0.12); color:#EEF2FE` |
| Confirmação (diálogo) | `1px solid #5B7FE0` | `rgba(91,127,224,0.12)` | `#D6E0FB` 600 | `background:rgba(91,127,224,0.2)` |
| Secundário | `1px solid #2B3450` | transparente | `#9AA3BC` | `color:#E6EAF6; border-color:#454E68` |
| Ação de linha | `1px solid #2B3450` | transparente | `#D6E0FB` 600 | `border-color:#5B7FE0; background:rgba(91,127,224,0.1)` |
| Ação de linha em atraso | `1px solid #5B7FE0` | `rgba(91,127,224,0.14)` | `#D6E0FB` 600 | `background:rgba(91,127,224,0.24)` |

Foco de teclado sempre `outline:2px solid #5B7FE0; outline-offset:2px`. Desabilitado: `opacity:0.45`.

### 5.2 Pill de estado

`font-size:11px; font-weight:600; padding:3px 9px; border-radius:99px` + trio de cores da seção 2.4.

### 5.3 Chips de filtro

Altura implícita por `padding:6px 12px`, raio 99px, 12px.
- Ativo: fundo `#132663`, texto `#D6E0FB`, borda `#25408F`.
- Inativo: fundo transparente, texto `#9AA3BC`, borda `#222C4A`.

### 5.4 Card de equipamento (catálogo)

Coluna: ícone 40×40 (raio 9px, fundo `#0B1128`, ícone 20px `#8AA6EE`) + pill de estado no canto oposto → nome 14.5px/600 → meta 12px `#7C86A2` → rodapé de 12px.
- Disponível: rodapé "Solicitar →" em `#8AA6EE`, card clicável, hover `border-color:#3C5DBE`.
- Emprestado: rodapé "Com {pessoa} · devolve {data}" em `#5E6884`, sem hover.
- Manutenção: rodapé com situação da assistência, sem hover.

### 5.5 Input

`height:42px; padding:0 12px; border-radius:8px; border:1px solid #2B3450; background:#0B1128; color:#E6EAF6; font-size:14px; font-family:inherit`.
Select falso: mesmo box + `<i class="ph ph-caret-down">` 13px `#5E6884` à direita.

### 5.6 Controle segmentado

Contêiner `border:1px solid #2B3450; border-radius:8px; overflow:hidden; width:fit-content`; opções `padding:9px 18px`, 13px, separadas por `border-left:1px solid #2B3450`. Ativo: fundo `#132663`, texto `#D6E0FB`, peso 600.

### 5.7 Tabela

Cabeçalho: fundo `#0B1128`, texto 11px uppercase `letter-spacing:.08em` `#5E6884`. Linhas separadas por `border-top:1px solid #161D33`. Contêiner: raio 12px, borda `#1A2340`, `overflow:hidden`. Linha em atraso recebe `background:rgba(224,91,98,0.05)`.

### 5.8 Faixa de aviso de regras (topo do catálogo)

`padding:13px 16px; border-radius:10px; background:linear-gradient(90deg,#0E1530,#0B1128); border:1px solid #25408F`; ícone `ph-info` 17px `#8AA6EE`; título 13px/600 + corpo 12.5px `#9AA3BC`; `gap:12px`.

### 5.9 Diálogo

Backdrop `rgba(4,6,14,0.68)` cobrindo a tela, conteúdo centralizado. Caixa: 432px, padding 24px, raio 14px, fundo `#0E1530`, `--shadow-lg`. Título 19px/600 → corpo 13.5px `#8A93B2` → bloco de consequência (`padding:12px 14px`, raio 9px, fundo `#0B1128`, borda `#1A2340`, 12.5px `#9AA3BC`) → ações alinhadas à direita, `gap:10px`.

### 5.10 Indicadores de limite

- Segmentos de 3 (limite de itens): três divs `flex:1; height:5px; border-radius:99px`, `gap:5px`; preenchidos `#5B7FE0`, vazios `#222C4A`.
- Barra de prazo: trilha `height:4px; background:#222C4A; border-radius:99px; overflow:hidden`; preenchimento `#5B7FE0` na proporção de dias decorridos / 14.

### 5.11 Ícones

Phosphor Icons (`@phosphor-icons/web`), pesos *regular* (padrão) e *fill* (apenas item ativo da sidebar).
Mapeamento: marca `ph-package` · catálogo `ph-squares-four` · meus empréstimos `ph-hand-arrow-down` · operações `ph-list-checks` · cadastro `ph-plus-square` · notebook `ph-laptop` · monitor `ph-monitor` · câmera `ph-video-camera` · cabo/dock `ph-usb` · projetor `ph-projector-screen` · busca `ph-magnifying-glass` · filtro `ph-funnel` · aviso `ph-info` · breadcrumb `ph-caret-right` · select `ph-caret-down` · avanço `ph-arrow-right` · adicionar `ph-plus` · notificação `ph-bell`.
Tamanhos: 12px (breadcrumb) · 13px (caret) · 15–16px (nav/marca) · 17px (header, aviso) · 19–21px (ícone de item) · 64px (hero do item).

---

## 6. Páginas

### 01 · Login (1440×820)
Split `560px | 1fr`.
- **Esquerda** — hero em `linear-gradient(160deg,#001449,#00102F 60%,#080C1A)`, padding 56px, `justify-content:space-between`: marca no topo (ícone 34px, texto 16px) · bloco central com título 34px (máx. 20ch), subtítulo 14px `#93A0C6` (máx. 38ch), régua-marca esmaecida, dois números (3 itens por pessoa / 14 dias de prazo) com `gap:40px` · rodapé "Operações · v1" 11px.
- **Direita** — formulário centralizado de 372px, padding 56px: "Entrar" 22px/600, subtítulo 13px, campos e-mail + senha (`gap:18px`), botão primário 44px com `ph-arrow-right`, régua esmaecida, nota de suporte 12px centralizada.

### 02 · Catálogo (1440×900)
Sidebar + header (busca, "2 de 3 itens com você", `ph-bell`).
Conteúdo: H1 "Catálogo" + contagem ("32 equipamentos · 11 disponíveis agora") → **faixa de aviso de regras** (limite de 3, prazo de 14 dias, bloqueio por atraso, manutenção fora do catálogo) → chips de categoria + "Só disponíveis" à direita → grid 3×2 de cards mostrando os três estados.

### 03 · Detalhe do item (1440×900)
Sidebar + header com breadcrumb (Catálogo › Notebooks › item) e contador à direita.
Conteúdo `1fr 356px`:
- Coluna principal: bloco de imagem 260px com ícone 64px → título 28px + pill de estado → descrição (máx. 60ch) → régua esmaecida → ficha técnica em 4 colunas (Categoria, Patrimônio, Local, Última devolução) → "Histórico" em linhas `data | evento | resultado`.
- Coluna lateral: card **Solicitar empréstimo** (Retirada / Prazo padrão 14 dias / Devolver até — valor em `#B4C6F6` 600 — botão 44px + nota de retirada) e card **Seus itens** com "2 de 3", segmentos de limite e nota de status.
- Sobreposto: diálogo de confirmação (§5.9) com o prazo calculado e o aviso de que o colaborador chegará a 3 de 3.

### 04 · Meus empréstimos (1440×820)
Sidebar + header com breadcrumb simples e botão "Pegar emprestado".
Conteúdo: cabeçalho "Comigo agora" + "2 de 3 itens · nenhum em atraso" com segmentos de limite (180px) à direita → duas linhas de empréstimo (ícone 44px | nome + meta | prazo com barra | botão "Devolver") → régua esmaecida → tabela **Histórico** (Item / Retirada / Devolução / Situação) com "No prazo" verde e atraso em âmbar.

### 05 · Operações — empréstimos em aberto (1440×900)
Sidebar (usuário = "Operações · Balcão · 2º andar") + header com busca ampliada e "Cadastrar equipamento".
Conteúdo: H1 + "21 itens fora · atualizado agora" → 4 cards de estatística (Em aberto 21 · Vencem em 3 dias 4 · **Em atraso 3** com borda e números em vermelho · Em manutenção 2) → chips (Todos / Em atraso / Vencem esta semana / Notebooks) → tabela de 7 linhas com botão "Devolver" por linha, linhas em atraso tingidas e com botão reforçado → paginação "7 de 21 empréstimos" + Anterior/Próximo.

### 06 · Operações — cadastrar equipamento (1440×820)
Sidebar + header com breadcrumb (Operações › Cadastrar equipamento).
Conteúdo `1fr 320px`:
- Formulário (máx. 620px): H1 + nota "Um registro por unidade física" → Nome (largo) · Categoria · Patrimônio · Número de série · Local de retirada · **Situação inicial** (segmentado: Disponível / Em manutenção / Fora de uso + nota "Em manutenção não aparece no catálogo") · Observações (textarea) → ações "Cadastrar" (primário) e "Cadastrar e adicionar outro" (secundário).
- Coluna lateral: **Prévia no catálogo** (card real renderizado com os dados do formulário) e **Últimos cadastros** (3 linhas item/data).

---

## 7. Navegação

- **Sidebar fixa de 236px**, presente em todas as telas do app (não no login), dividida em dois grupos rotulados: **Colaborador** (Catálogo, Meus empréstimos) e **Operações** (Empréstimos em aberto, Cadastrar equipamento). Operações é seção extra no mesmo app, não app separado.
- **Item ativo**: fundo `#0E1530`, texto `#E6EAF6`, ícone Phosphor *fill* em `#8AA6EE` e barra de 2px à esquerda via `box-shadow: inset 2px 0 0 #5B7FE0`.
- **Item inativo**: texto `#9AA3BC`, ícone regular; hover `background:#0B1128; color:#E6EAF6`.
- **Badge de contagem** em "Meus empréstimos": pill `padding:1px 7px`, fundo `#132663`, texto `#B4C6F6` 11px, `margin-left:auto`.
- **Breadcrumb** no header das telas de profundidade 2 (03 e 06): links em `#8AA6EE`, separador `ph-caret-right` 12px, item atual em `#E6EAF6`.
- Fluxos: Catálogo → card disponível → Detalhe → diálogo de confirmação → Meus empréstimos. Meus empréstimos → "Pegar emprestado" → Catálogo. Operações → "Cadastrar equipamento" → tela 06.
- O contador "2 de 3 itens com você" aparece no header do Catálogo e do Detalhe.
- Neste layout as telas são estáticas e ligadas por âncoras (`#s1`…`#s6`); em implementação real, rotas: `/login`, `/catalogo`, `/catalogo/:patrimonio`, `/meus-emprestimos`, `/operacoes/emprestimos`, `/operacoes/equipamentos/novo`.

---

## 8. Animações e transições

Movimento é discreto e funcional; nada decorativo, nada que se mova sozinho.

| Elemento | Propriedade | Duração / curva |
|---|---|---|
| Hover de item de navegação | `background, color` | 120ms `ease-out` |
| Hover de botão | `background, border-color, color` | 140ms `ease-out` |
| Hover de card do catálogo | `border-color` | 160ms `ease-out` |
| Pressionado (botões) | `transform: translateY(1px)` | 80ms |
| Abertura de diálogo | `opacity 0→1` + `translateY(6px)→0`, backdrop `opacity 0→1` | 180ms `cubic-bezier(.2,.8,.2,1)` |
| Fechamento de diálogo | inverso | 120ms `ease-in` |
| Barra de prazo / segmentos ao mudar | `width` / `background` | 240ms `ease-out` |
| Remoção de linha após devolução | `opacity 1→0` + `height→0` | 200ms `ease-in` |
| Foco de teclado | sem transição (ring imediato) | — |

Regras: nunca animar `box-shadow` de moldura; nada acima de 240ms; respeitar `@media (prefers-reduced-motion: reduce)` desativando transform e opacity em favor de troca imediata.

---

## 9. Regras de negócio visíveis na interface

1. **Máximo de 3 itens por pessoa** — contador no header ("2 de 3 itens com você"), segmentos de limite no detalhe e em Meus empréstimos, aviso no diálogo quando a solicitação leva ao terceiro item.
2. **Prazo padrão de 14 dias** — data calculada no card de solicitação ("Devolver até 14/set"), barra de progresso por item, coluna "Prazo" em Operações.
3. **Atraso bloqueia novo empréstimo** — linha tingida em vermelho suave, card de estatística "Em atraso" com borda vermelha, botão "Solicitar" desabilitado (`opacity:.45`) com nota explicativa quando houver atraso.
4. **Manutenção não fica disponível** — pill âmbar, card sem ação, e nota no controle "Situação inicial" do cadastro.
5. Fora de escopo v1 (não desenhar): reserva com data futura, notificação por e-mail, importação de planilha.

---

## 10. Notas de implementação

- Estilos **inline** no template do componente; o único CSS global permitido é `@font-face`/import de fonte, `@keyframes` e resets de `body`.
- Fontes: `https://fonts.googleapis.com/css2?family=Open+Sans:wght@400;500;600;700`.
- Ícones: `https://unpkg.com/@phosphor-icons/web@2.1.1/src/regular/style.css` e `.../fill/style.css`.
- Design system Nocturne carregado a partir de `_ds/nocturne-<id>/styles.css` + `_ds_bundle.js`; as variáveis de tema são sobrescritas no `:root` com a paleta desta especificação.
- Layout com `flex`/`grid` + `gap` em todos os grupos de irmãos; nunca espaçar por margem individual ou whitespace.
- Cada tela recebe `data-screen-label` ("01 Login" … "06 Cadastrar equipamento") para referência.
- Conteúdo de exemplo: Marina Alves (Design, 2 itens), Rafael Lima (Eng), Camila Duarte (Mkt, atrasada), Tiago Menezes (Suporte, atrasado), Ana Sato (Financeiro), Bruno Kato (Eng), Helena Prado (Comercial, atrasada). Equipamentos: MacBook Pro 14" PAT-1042, ThinkPad T14 PAT-1188/1190, Dell UltraSharp 27" PAT-0871, LG UltraFine 24" PAT-0910, Sony A7 III PAT-0233, Dock USB-C Anker PAT-0455, Adaptador HDMI Belkin PAT-0338, Projetor Epson X49 PAT-0102, MacBook Air 13" M2 PAT-1204.
- Tom de copy: **seco e operacional** — frases curtas, sem exclamação, sem emoji, sem "ops!". Datas no formato `dd/mmm` (`14/set`).
- Idioma: português do Brasil.
