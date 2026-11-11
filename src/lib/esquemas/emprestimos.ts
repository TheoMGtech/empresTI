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

/** Motivos de recusa da solicitação, em `error.data.motivo` (RF-SOLIC-06). */
export const MOTIVOS_SOLICITACAO = [
  "EQUIPAMENTO_NAO_ENCONTRADO",
  "EQUIPAMENTO_INDISPONIVEL",
  "EQUIPAMENTO_EM_MANUTENCAO",
] as const;

export type MotivoSolicitacao = (typeof MOTIVOS_SOLICITACAO)[number];
export type EntradaSolicitarEmprestimo = z.infer<typeof esquemaEntradaSolicitarEmprestimo>;
export type SaidaSolicitarEmprestimo = z.infer<typeof esquemaSaidaSolicitarEmprestimo>;
