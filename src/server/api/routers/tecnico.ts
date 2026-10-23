import { lerAmbientePublico, lerAmbienteServidor } from "@/env";
import { criarRouterTRPC, procedimentoPublico } from "@/server/api/trpc";
import { verificarSaudeDoBanco } from "@/server/services/saude-sistema";

export const routerTecnico = criarRouterTRPC({
  status: procedimentoPublico.query(async ({ ctx }) => {
    const ambiente = lerAmbienteServidor();
    const publico = lerAmbientePublico();
    const saudeBanco = await verificarSaudeDoBanco(ctx.obterClientePrisma);

    return {
      ambiente: ambiente.NODE_ENV,
      ...saudeBanco,
      supabaseVinculado: publico.NEXT_PUBLIC_SUPABASE_URL.includes(ambiente.SUPABASE_PROJECT_REF),
      verificadoEm: new Date().toISOString(),
      versao: "0.1.0",
    };
  }),
});
