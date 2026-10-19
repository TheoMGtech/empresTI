import { lerAmbientePublico, lerAmbienteServidor } from "@/env";
import { criarRouterTRPC, procedimentoPublico } from "@/server/api/trpc";

export const routerTecnico = criarRouterTRPC({
  status: procedimentoPublico.query(() => {
    const ambiente = lerAmbienteServidor();
    const publico = lerAmbientePublico();

    return {
      ambiente: ambiente.NODE_ENV,
      supabaseVinculado: publico.NEXT_PUBLIC_SUPABASE_URL.includes(ambiente.SUPABASE_PROJECT_REF),
      verificadoEm: new Date().toISOString(),
      versao: "0.1.0",
    };
  }),
});
