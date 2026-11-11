import { z } from "zod";

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
