import { z } from "zod";

// Categorias da Spec 002. Espelham o enum `CategoriaEquipamento` do Prisma; o teste do contrato
// falha se os dois divergirem.
export const CATEGORIAS = ["notebook", "monitor", "cabo", "camera"] as const;
export const esquemaCategoria = z.enum(CATEGORIAS);

// Tamanho de página da listagem por cursor (ADR-001 §4). Parâmetro técnico, não regra de negócio.
export const LIMITE_PADRAO_LISTAGEM = 20;
export const LIMITE_MAXIMO_LISTAGEM = 50;

// Entrada de `equipamentos.listar` (RF-CATALOGO-01). O tenant nunca vem do input
// (RS-CATALOGO-01): campos desconhecidos são descartados.
export const esquemaEntradaListarEquipamentos = z.object({
  categoria: esquemaCategoria.optional(),
  somenteDisponiveis: z.boolean().optional(),
  /** Patrimônio do último item da página anterior. */
  cursor: z.string().trim().min(1).optional(),
  limite: z.number().int().min(1).max(LIMITE_MAXIMO_LISTAGEM).optional(),
});

// RN-CATALOGO-01. `devolverAte` é a data de devolução (AAAA-MM-DD, calendário de São Paulo);
// a variante `emprestado` só é devolvida a partir da Spec 005.
export const esquemaDisponibilidade = z.discriminatedUnion("estado", [
  z.strictObject({ estado: z.literal("disponivel") }),
  z.strictObject({ estado: z.literal("emprestado"), devolverAte: z.iso.date() }),
  z.strictObject({ estado: z.literal("manutencao") }),
  z.strictObject({ estado: z.literal("fora_de_uso") }),
]);

// Item do catálogo. Objeto estrito: nada de tomador nem identificador de pessoa (RS-CATALOGO-03).
export const esquemaItemCatalogo = z.strictObject({
  patrimonio: z.string().min(1),
  nome: z.string().min(1),
  categoria: esquemaCategoria,
  /** URL pública montada na leitura; `null` sem fotografia (RF-CATALOGO-02, RF-CATALOGO-03). */
  imagemUrl: z.url().nullable(),
  disponibilidade: esquemaDisponibilidade,
});

export const esquemaSaidaListarEquipamentos = z.strictObject({
  itens: z.array(esquemaItemCatalogo),
  /** `null` na última página. */
  proximoCursor: z.string().min(1).nullable(),
  /** Mesmo recorte de visibilidade do papel, sem os filtros da tela (RF-CATALOGO-05). */
  resumo: z.strictObject({
    total: z.number().int().nonnegative(),
    disponiveis: z.number().int().nonnegative(),
  }),
});

// Entrada de `equipamentos.detalhar` (RF-SOLIC-01): busca por patrimônio no tenant da sessão.
export const esquemaEntradaDetalharEquipamento = z.object({
  patrimonio: z.string().trim().min(1),
});

/** Empréstimo no histórico do equipamento, visível só para Operações (RS-SOLIC-05). */
export const esquemaEmprestimoHistorico = z.strictObject({
  retiradoEm: z.date(),
  /** Data de devolução combinada (AAAA-MM-DD, calendário de São Paulo). */
  devolverAte: z.iso.date(),
  /** `null` enquanto o empréstimo está aberto. */
  devolvidoEm: z.date().nullable(),
  /** Nome de exibição de quem pegou; `null` sem nome cadastrado. */
  tomadorNome: z.string().min(1).nullable(),
});

// Saída de `equipamentos.detalhar` (RF-SOLIC-01). `numeroSerie`, `observacoes` e `historico` só
// existem na resposta para Operações (CA-SOLIC-09): para `colaborador` as chaves não vêm.
// Campos sem valor chegam `null` e a tela os oculta (RF-SOLIC-05).
export const esquemaDetalheEquipamento = z.strictObject({
  id: z.uuid(),
  patrimonio: z.string().min(1),
  nome: z.string().min(1),
  categoria: esquemaCategoria,
  imagemUrl: z.url().nullable(),
  disponibilidade: esquemaDisponibilidade,
  local: z.string().min(1).nullable(),
  /** Momento da última devolução; `null` se nunca foi emprestado. */
  ultimaDevolucao: z.date().nullable(),
  /** Prazo calculado no servidor se a solicitação fosse confirmada agora (RF-SOLIC-03). */
  devolverAtePrevisto: z.iso.date(),
  numeroSerie: z.string().min(1).nullable().optional(),
  observacoes: z.string().min(1).nullable().optional(),
  historico: z.array(esquemaEmprestimoHistorico).optional(),
});

export type Categoria = z.infer<typeof esquemaCategoria>;
export type Disponibilidade = z.infer<typeof esquemaDisponibilidade>;
export type EntradaListarEquipamentos = z.infer<typeof esquemaEntradaListarEquipamentos>;
export type ItemCatalogo = z.infer<typeof esquemaItemCatalogo>;
export type SaidaListarEquipamentos = z.infer<typeof esquemaSaidaListarEquipamentos>;
export type EntradaDetalharEquipamento = z.infer<typeof esquemaEntradaDetalharEquipamento>;
export type EmprestimoHistorico = z.infer<typeof esquemaEmprestimoHistorico>;
export type DetalheEquipamento = z.infer<typeof esquemaDetalheEquipamento>;

// ---------------------------------------------------------------------------------------------
// Spec 008 — cadastro e situação de equipamentos (Operações).

/** Situações gravadas (Spec 002). Espelham o enum `SituacaoEquipamento` do Prisma. */
export const SITUACOES = ["ativo", "em_manutencao", "fora_de_uso"] as const;
export const esquemaSituacao = z.enum(SITUACOES);

/** Formato do patrimônio (RN-OPER-02, DF-21). */
export const FORMATO_PATRIMONIO = /^TI-\d{4}$/;

/** Texto opcional do formulário: vazio vira ausente. */
const textoOpcional = (maximo: number) =>
  z
    .string()
    .trim()
    .max(maximo)
    .transform((valor) => (valor ? valor : undefined))
    .optional();

// Mesmo esquema no formulário (zodResolver) e no servidor (RF-OPER-05). Limites de tamanho são
// técnicos, para conter entrada abusiva.
export const esquemaCadastroEquipamento = z.object({
  nome: z.string().trim().min(1, "Informe o nome.").max(120),
  categoria: esquemaCategoria,
  patrimonio: z.string().trim().regex(FORMATO_PATRIMONIO, "Use o formato TI-0000."),
  numeroSerie: textoOpcional(80),
  local: textoOpcional(120),
  /** Situação inicial: Disponível (`ativo`), Em manutenção ou Fora de uso (RN-OPER-03). */
  situacao: esquemaSituacao,
  observacoes: textoOpcional(1000),
});

export const esquemaSaidaCadastroEquipamento = z.strictObject({
  id: z.uuid(),
  patrimonio: z.string().min(1),
});

// `equipamentos.alterarSituacao` (RF-OPER-07).
export const esquemaEntradaAlterarSituacao = z.object({
  equipamentoId: z.uuid(),
  situacao: esquemaSituacao,
});

export const esquemaSaidaAlterarSituacao = z.strictObject({
  id: z.uuid(),
  situacao: esquemaSituacao,
});

/** Motivos de recusa de cadastro e alteração, em `error.data.motivo` (RN-OPER-02, RF-OPER-07). */
export const MOTIVOS_EQUIPAMENTO_OPERACOES = [
  "PATRIMONIO_DUPLICADO",
  "EMPRESTIMO_EM_ABERTO",
] as const;

export type Situacao = z.infer<typeof esquemaSituacao>;
export type EntradaCadastroEquipamento = z.input<typeof esquemaCadastroEquipamento>;
export type CadastroEquipamento = z.output<typeof esquemaCadastroEquipamento>;
export type SaidaCadastroEquipamento = z.infer<typeof esquemaSaidaCadastroEquipamento>;
export type EntradaAlterarSituacao = z.infer<typeof esquemaEntradaAlterarSituacao>;
export type SaidaAlterarSituacao = z.infer<typeof esquemaSaidaAlterarSituacao>;
export type MotivoEquipamentoOperacoes = (typeof MOTIVOS_EQUIPAMENTO_OPERACOES)[number];
