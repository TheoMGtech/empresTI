import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaEmprestimosEmAberto,
  esquemaEntradaRegistrarDevolucao,
  esquemaResumoOperacoes,
  esquemaSaidaEmprestimosEmAberto,
  esquemaSaidaRegistrarDevolucao,
  esquemaSaidaUltimosCadastros,
} from "@/lib/esquemas/operacoes";
import { adminProcedure, criarRouterTRPC } from "@/server/api/trpc";

export const MENSAGEM_OPERACOES_NAO_IMPLEMENTADO = "Painel de Operações ainda não disponível.";

export const naoImplementadoOperacoes = (): never => {
  throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_OPERACOES_NAO_IMPLEMENTADO });
};

// Contratos publicados na T-OPER-01. Todos em `adminProcedure` (RS-OPER-01): `colaborador` recebe
// `FORBIDDEN` antes de chegar aqui (RS-OPER-02). Respondem `NOT_IMPLEMENTED` até as T-OPER-02 e 03.
export const routerOperacoes = criarRouterTRPC({
  emprestimosEmAberto: adminProcedure
    .input(esquemaEntradaEmprestimosEmAberto)
    .output(esquemaSaidaEmprestimosEmAberto)
    .query(naoImplementadoOperacoes),
  resumo: adminProcedure.output(esquemaResumoOperacoes).query(naoImplementadoOperacoes),
  registrarDevolucao: adminProcedure
    .input(esquemaEntradaRegistrarDevolucao)
    .output(esquemaSaidaRegistrarDevolucao)
    .mutation(naoImplementadoOperacoes),
  ultimosCadastros: adminProcedure
    .output(esquemaSaidaUltimosCadastros)
    .query(naoImplementadoOperacoes),
});
