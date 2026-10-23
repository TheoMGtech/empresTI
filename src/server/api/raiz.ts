import { criarRouterTRPC } from "@/server/api/trpc";
import { routerTecnico } from "@/server/api/routers/tecnico";

export const routerAplicacao = criarRouterTRPC({
  tecnico: routerTecnico,
});

export type RouterAplicacao = typeof routerAplicacao;
