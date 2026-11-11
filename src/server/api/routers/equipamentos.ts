import { lerAmbientePublico } from "@/env";
import {
  esquemaEntradaListarEquipamentos,
  esquemaSaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import { listarEquipamentos } from "@/server/services/equipamentos";

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
});
