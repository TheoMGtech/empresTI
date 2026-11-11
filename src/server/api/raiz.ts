import { criarRouterTRPC } from "@/server/api/trpc";
import { routerAutenticacao } from "@/server/api/routers/autenticacao";
import { routerSessao } from "@/server/api/routers/sessao";
import { routerTecnico } from "@/server/api/routers/tecnico";

export const routerAplicacao = criarRouterTRPC({
  autenticacao: routerAutenticacao,
  sessao: routerSessao,
  tecnico: routerTecnico,
});

export type RouterAplicacao = typeof routerAplicacao;
