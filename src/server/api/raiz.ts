import { criarRouterTRPC } from "@/server/api/trpc";
import { routerAutenticacao } from "@/server/api/routers/autenticacao";
import { routerTecnico } from "@/server/api/routers/tecnico";

export const routerAplicacao = criarRouterTRPC({
  autenticacao: routerAutenticacao,
  tecnico: routerTecnico,
});

export type RouterAplicacao = typeof routerAplicacao;
