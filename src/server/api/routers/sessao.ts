import { TRPCError } from "@trpc/server";

import { esquemaSessaoAtual } from "@/lib/esquemas/sessao";
import { criarRouterTRPC, procedimentoPublico } from "@/server/api/trpc";

export const MENSAGEM_NAO_IMPLEMENTADO = "Sessão ainda não disponível.";

export const routerSessao = criarRouterTRPC({
  // Contrato publicado na T-SESSAO-02. Até a T-SESSAO-06, o procedimento responde sempre
  // `NOT_IMPLEMENTED` e não lê identidade nem banco. A T-SESSAO-06 troca o procedimento por
  // `tenantProcedure` (T-SESSAO-04) e passa a devolver os dados reais do membership.
  atual: procedimentoPublico.output(esquemaSessaoAtual).query((): never => {
    throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_NAO_IMPLEMENTADO });
  }),
});
