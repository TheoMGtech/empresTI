import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaListarEquipamentos,
  esquemaSaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";

export const MENSAGEM_LISTAGEM_NAO_IMPLEMENTADA = "Catálogo ainda não disponível.";

export const routerEquipamentos = criarRouterTRPC({
  // Contrato publicado na T-CATALOGO-01. Já exige sessão e membership; até a T-CATALOGO-02
  // responde `NOT_IMPLEMENTED` sem ler equipamentos.
  listar: tenantProcedure
    .input(esquemaEntradaListarEquipamentos)
    .output(esquemaSaidaListarEquipamentos)
    .query((): never => {
      throw new TRPCError({
        code: "NOT_IMPLEMENTED",
        message: MENSAGEM_LISTAGEM_NAO_IMPLEMENTADA,
      });
    }),
});
