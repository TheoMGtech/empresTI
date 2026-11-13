import { z } from "@/lib/zod";

import { LIMITE_MAXIMO_LISTAGEM, esquemaCategoria } from "@/lib/esquemas/equipamentos";

// Entrada de `emprestimos.solicitar` (RF-SOLIC-02): só o equipamento. Usuário, tenant e prazo vêm
// do servidor; campos desconhecidos são descartados.
export const esquemaEntradaSolicitarEmprestimo = z.object({
  equipamentoId: z.uuid(),
});

export const esquemaSaidaSolicitarEmprestimo = z.strictObject({
  id: z.uuid(),
  /** Data de devolução (AAAA-MM-DD, calendário de São Paulo): 14 dias corridos (RN-SOLIC-03). */
  devolverAte: z.iso.date(),
});

/** Máximo de itens em aberto por pessoa, contando os atrasados (RN-REGRAS-01, RN-REGRAS-05). */
export const LIMITE_ITENS_POR_PESSOA = 3;

/**
 * Motivos de recusa da solicitação, em `error.data.motivo`: os da Spec 005 (RF-SOLIC-06) e os de
 * regra da Spec 006 (RF-REGRAS-04).
 */
export const MOTIVOS_SOLICITACAO = [
  "EQUIPAMENTO_NAO_ENCONTRADO",
  "EQUIPAMENTO_INDISPONIVEL",
  "EQUIPAMENTO_EM_MANUTENCAO",
  "LIMITE_ATINGIDO",
  "ITEM_EM_ATRASO",
] as const;

// Saída de `emprestimos.meuResumo` (RF-REGRAS-01): situação da própria pessoa no tenant da sessão.
export const esquemaMeuResumo = z.strictObject({
  /** Empréstimos em aberto, inclusive os atrasados (RN-REGRAS-05). */
  itensAbertos: z.number().int().nonnegative(),
  /** Máximo de itens em aberto (RN-REGRAS-01). */
  limite: z.number().int().positive(),
  /** Quantos dos itens abertos estão em atraso; acima de zero, nova solicitação é recusada. */
  emAtraso: z.number().int().nonnegative(),
  /** Prazo padrão de devolução, em dias corridos (RN-SOLIC-03). */
  prazoDias: z.number().int().positive(),
});

export type MotivoSolicitacao = (typeof MOTIVOS_SOLICITACAO)[number];
export type MeuResumo = z.infer<typeof esquemaMeuResumo>;
export type EntradaSolicitarEmprestimo = z.infer<typeof esquemaEntradaSolicitarEmprestimo>;
export type SaidaSolicitarEmprestimo = z.infer<typeof esquemaSaidaSolicitarEmprestimo>;

// ---------------------------------------------------------------------------------------------
// Spec 007 — meus empréstimos, devolução e histórico.

/** Equipamento resumido dentro de um empréstimo da própria pessoa. */
export const esquemaEquipamentoDoEmprestimo = z.strictObject({
  patrimonio: z.string().min(1),
  nome: z.string().min(1),
  categoria: esquemaCategoria,
  imagemUrl: z.url().nullable(),
});

// Item de `emprestimos.meus` (RF-DEVOL-01): empréstimo em aberto da própria pessoa.
export const esquemaEmprestimoAberto = z.strictObject({
  id: z.uuid(),
  equipamento: esquemaEquipamentoDoEmprestimo,
  retiradoEm: z.date(),
  /** Data de devolução (AAAA-MM-DD, calendário de São Paulo). */
  devolverAte: z.iso.date(),
  /** Atraso calculado no servidor, no fuso de São Paulo (RN-REGRAS-06). */
  emAtraso: z.boolean(),
});

export const esquemaSaidaMeusEmprestimos = z.array(esquemaEmprestimoAberto);

// Entrada e saída de `emprestimos.historico` (RF-DEVOL-02): encerrados da própria pessoa, do mais
// recente para o mais antigo, por cursor (ADR-001 §4).
export const esquemaEntradaHistorico = z.object({
  /** `id` do último empréstimo da página anterior. */
  cursor: z.uuid().optional(),
  limite: z.number().int().min(1).max(LIMITE_MAXIMO_LISTAGEM).optional(),
});

export const esquemaEmprestimoEncerrado = z.strictObject({
  id: z.uuid(),
  equipamento: esquemaEquipamentoDoEmprestimo,
  retiradoEm: z.date(),
  devolverAte: z.iso.date(),
  devolvidoEm: z.date(),
  /** Devolvido até o fim do dia `devolverAte` em São Paulo (RF-DEVOL-05). */
  noPrazo: z.boolean(),
});

export const esquemaSaidaHistorico = z.strictObject({
  itens: z.array(esquemaEmprestimoEncerrado),
  /** `null` na última página. */
  proximoCursor: z.uuid().nullable(),
});

// Entrada e saída de `emprestimos.devolver` (RF-DEVOL-03): só o empréstimo; pessoa e tenant vêm da
// sessão (RS-DEVOL-01).
export const esquemaEntradaDevolver = z.object({
  emprestimoId: z.uuid(),
});

export const esquemaSaidaDevolver = z.strictObject({
  id: z.uuid(),
  devolvidoEm: z.date(),
});

/** Motivos de recusa da devolução, em `error.data.motivo` (RF-DEVOL-07). */
export const MOTIVOS_DEVOLUCAO = ["EMPRESTIMO_JA_ENCERRADO"] as const;

export type EmprestimoAberto = z.infer<typeof esquemaEmprestimoAberto>;
export type EmprestimoEncerrado = z.infer<typeof esquemaEmprestimoEncerrado>;
export type EntradaHistorico = z.infer<typeof esquemaEntradaHistorico>;
export type SaidaHistorico = z.infer<typeof esquemaSaidaHistorico>;
export type EntradaDevolver = z.infer<typeof esquemaEntradaDevolver>;
export type SaidaDevolver = z.infer<typeof esquemaSaidaDevolver>;
export type MotivoDevolucao = (typeof MOTIVOS_DEVOLUCAO)[number];
