import { criarRouterTRPC } from "@/server/api/trpc";
import { routerAutenticacao } from "@/server/api/routers/autenticacao";
import { routerEmprestimos } from "@/server/api/routers/emprestimos";
import { routerEquipamentos } from "@/server/api/routers/equipamentos";
import { routerOperacoes } from "@/server/api/routers/operacoes";
import { routerSessao } from "@/server/api/routers/sessao";
import { routerTecnico } from "@/server/api/routers/tecnico";

export const routerAplicacao = criarRouterTRPC({
  autenticacao: routerAutenticacao,
  emprestimos: routerEmprestimos,
  equipamentos: routerEquipamentos,
  operacoes: routerOperacoes,
  sessao: routerSessao,
  tecnico: routerTecnico,
});

export type RouterAplicacao = typeof routerAplicacao;
