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

export type Categoria = z.infer<typeof esquemaCategoria>;
export type Disponibilidade = z.infer<typeof esquemaDisponibilidade>;
export type EntradaListarEquipamentos = z.infer<typeof esquemaEntradaListarEquipamentos>;
export type ItemCatalogo = z.infer<typeof esquemaItemCatalogo>;
export type SaidaListarEquipamentos = z.infer<typeof esquemaSaidaListarEquipamentos>;
