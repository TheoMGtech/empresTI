import { TRPCError } from "@trpc/server";

import { lerAmbientePublico } from "@/env";
import {
  esquemaDetalheEquipamento,
  esquemaEntradaDetalharEquipamento,
  esquemaEntradaListarEquipamentos,
  esquemaSaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import { listarEquipamentos } from "@/server/services/equipamentos";

export const MENSAGEM_DETALHE_NAO_IMPLEMENTADO = "Detalhe ainda não disponível.";

export const routerEquipamentos = criarRouterTRPC({
  // RF-CATALOGO-01, RS-CATALOGO-01: tenant e papel vêm do contexto, nunca do input.
  listar: tenantProcedure
    .input(esquemaEntradaListarEquipamentos)
    .output(esquemaSaidaListarEquipamentos)
    .query(({ ctx, input }) =>
      listarEquipamentos(
        ctx.obterClientePrisma(),
        { tenantId: ctx.tenantId, papel: ctx.papel },
        input,
        { urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL },
      ),
    ),

  // Contrato publicado na T-SOLIC-02 (RF-SOLIC-01). Até a T-SOLIC-04 responde `NOT_IMPLEMENTED`.
  detalhar: tenantProcedure
    .input(esquemaEntradaDetalharEquipamento)
    .output(esquemaDetalheEquipamento)
    .query((): never => {
      throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_DETALHE_NAO_IMPLEMENTADO });
    }),
});
