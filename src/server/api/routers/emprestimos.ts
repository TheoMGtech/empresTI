import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaSolicitarEmprestimo,
  esquemaSaidaSolicitarEmprestimo,
} from "@/lib/esquemas/emprestimos";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";

export const MENSAGEM_SOLICITACAO_NAO_IMPLEMENTADA = "Solicitação ainda não disponível.";

export const routerEmprestimos = criarRouterTRPC({
  // Contrato publicado na T-SOLIC-02. Já exige sessão e membership (RS-SOLIC-01); até a
  // T-SOLIC-05 responde `NOT_IMPLEMENTED` sem gravar nada.
  solicitar: tenantProcedure
    .input(esquemaEntradaSolicitarEmprestimo)
    .output(esquemaSaidaSolicitarEmprestimo)
    .mutation((): never => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: MENSAGEM_SOLICITACAO_NAO_IMPLEMENTADA,
      });
    }),
});
