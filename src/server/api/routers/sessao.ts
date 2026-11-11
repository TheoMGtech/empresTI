import { esquemaSessaoAtual } from "@/lib/esquemas/sessao";
import { criarRouterTRPC, tenantProcedure } from "@/server/api/trpc";
import { consultarSessaoAtual } from "@/server/services/sessao";

export const routerSessao = criarRouterTRPC({
  // RF-SESSAO-06: exige sessão e membership; devolve só nome de exibição e papel.
  atual: tenantProcedure.output(esquemaSessaoAtual).query(({ ctx }) =>
    consultarSessaoAtual(ctx.obterClientePrisma(), {
      usuarioId: ctx.usuarioId,
      tenantId: ctx.tenantId,
    }),
  ),
});
