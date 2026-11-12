"use client";

import { trpc } from "@/trpc/cliente";
import type { SaidasRouter } from "@/trpc/tipos";

export type MeuResumo = SaidasRouter["emprestimos"]["meuResumo"];

export type BloqueioSolicitacao = { motivo: "ITEM_EM_ATRASO" | "LIMITE_ATINGIDO"; nota: string };

/** Situação da própria pessoa (RF-REGRAS-01). A regra vale no servidor; a tela só informa. */
export function useMeuResumo() {
  return trpc.emprestimos.meuResumo.useQuery();
}

/** RF-REGRAS-02: com atraso ou no limite, a ação fica desabilitada com a nota do motivo. */
export function bloqueioDoResumo(resumo: MeuResumo | undefined): BloqueioSolicitacao | null {
  if (!resumo) return null;

  if (resumo.emAtraso > 0) {
    return {
      motivo: "ITEM_EM_ATRASO",
      nota: "Você tem item em atraso. Devolva antes de solicitar outro.",
    };
  }

  if (resumo.itensAbertos >= resumo.limite) {
    return {
      motivo: "LIMITE_ATINGIDO",
      nota: `Limite de ${resumo.limite} itens atingido. Devolva um item para solicitar outro.`,
    };
  }

  return null;
}
