import { z } from "@/lib/zod";

import {
  esquemaEntradaDevolver,
  esquemaEquipamentoDoEmprestimo,
  esquemaSaidaDevolver,
} from "@/lib/esquemas/emprestimos";
import { LIMITE_MAXIMO_LISTAGEM, esquemaCategoria } from "@/lib/esquemas/equipamentos";

// Spec 008 — painel de Operações. Todos os procedimentos usam `adminProcedure` (RS-OPER-01).

/** Chips da lista (RF-OPER-03; layout, tela 05). `vencem_7_dias` é "Vencem esta semana" (DF-20). */
export const FILTROS_EMPRESTIMOS_EM_ABERTO = ["todos", "em_atraso", "vencem_7_dias"] as const;

// Entrada de `operacoes.emprestimosEmAberto` (RF-OPER-01, RF-OPER-03). O tenant vem da sessão.
export const esquemaEntradaEmprestimosEmAberto = z.object({
  filtro: z.enum(FILTROS_EMPRESTIMOS_EM_ABERTO).optional(),
  /** Chip de categoria, como "Notebooks". */
  categoria: esquemaCategoria.optional(),
  /** `id` do último empréstimo da página anterior. */
  cursor: z.uuid().optional(),
  limite: z.number().int().min(1).max(LIMITE_MAXIMO_LISTAGEM).optional(),
});

// Item da lista: com o nome de exibição da pessoa (RF-OPER-01; DF-5, nome só para Operações).
export const esquemaEmprestimoEmAberto = z.strictObject({
  id: z.uuid(),
  equipamento: esquemaEquipamentoDoEmprestimo,
  pessoa: z.strictObject({ nomeExibicao: z.string().min(1).nullable() }),
  retiradoEm: z.date(),
  /** Data de devolução (AAAA-MM-DD, calendário de São Paulo). */
  devolverAte: z.iso.date(),
  /** Linha destacada na tela (RF-OPER-03), pela regra de atraso da Spec 006. */
  emAtraso: z.boolean(),
});

export const esquemaSaidaEmprestimosEmAberto = z.strictObject({
  itens: z.array(esquemaEmprestimoEmAberto),
  /** `null` na última página. */
  proximoCursor: z.uuid().nullable(),
});

// Saída de `operacoes.resumo`: os quatro cards de estatística (RF-OPER-02).
export const esquemaResumoOperacoes = z.strictObject({
  emAberto: z.number().int().nonnegative(),
  vencendoEm3Dias: z.number().int().nonnegative(),
  emAtraso: z.number().int().nonnegative(),
  emManutencao: z.number().int().nonnegative(),
});

// `operacoes.registrarDevolucao` (RF-OPER-04): mesmo formato de `emprestimos.devolver`, sobre
// qualquer empréstimo em aberto do tenant; recusa com `EMPRESTIMO_JA_ENCERRADO`.
export const esquemaEntradaRegistrarDevolucao = esquemaEntradaDevolver;
export const esquemaSaidaRegistrarDevolucao = esquemaSaidaDevolver;

// Item de `operacoes.ultimosCadastros` (RF-OPER-08).
export const esquemaUltimoCadastro = z.strictObject({
  patrimonio: z.string().min(1),
  nome: z.string().min(1),
  criadoEm: z.date(),
});

export const QUANTIDADE_ULTIMOS_CADASTROS = 3;

export const esquemaSaidaUltimosCadastros = z
  .array(esquemaUltimoCadastro)
  .max(QUANTIDADE_ULTIMOS_CADASTROS);

export type FiltroEmprestimosEmAberto = (typeof FILTROS_EMPRESTIMOS_EM_ABERTO)[number];
export type EntradaEmprestimosEmAberto = z.infer<typeof esquemaEntradaEmprestimosEmAberto>;
export type EmprestimoEmAberto = z.infer<typeof esquemaEmprestimoEmAberto>;
export type SaidaEmprestimosEmAberto = z.infer<typeof esquemaSaidaEmprestimosEmAberto>;
export type ResumoOperacoes = z.infer<typeof esquemaResumoOperacoes>;
export type UltimoCadastro = z.infer<typeof esquemaUltimoCadastro>;
