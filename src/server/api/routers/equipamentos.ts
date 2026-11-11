import { lerAmbientePublico } from "@/env";
import {
  esquemaEntradaListarEquipamentos,
  esquemaSaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import { listarEquipamentos } from "@/server/services/equipamentos";

export const routerEquipamentos = criarRouterTRPC({
  // RF-CATALOGO-01, RS-CATALOGO-01: tenant e papel vêm do contexto, nunca do input.
  // Filtros e cursor da entrada entram na T-CATALOGO-03.
  listar: tenantProcedure
    .input(esquemaEntradaListarEquipamentos)
    .output(esquemaSaidaListarEquipamentos)
    .query(({ ctx }) =>
      listarEquipamentos(
        ctx.obterClientePrisma(),
        { tenantId: ctx.tenantId, papel: ctx.papel },
        { urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL },
      ),
    ),
});
