import { TRPCError } from "@trpc/server";

import {
  esquemaEntradaEmprestimosEmAberto,
  esquemaEntradaRegistrarDevolucao,
  esquemaResumoOperacoes,
  esquemaSaidaEmprestimosEmAberto,
  esquemaSaidaRegistrarDevolucao,
  esquemaSaidaUltimosCadastros,
} from "@/lib/esquemas/operacoes";
import { traduzirErroEncerramento } from "@/server/api/routers/emprestimos";
import { adminProcedure, criarRouterTRPC } from "@/server/api/trpc";
import { encerrarEmprestimo } from "@/server/services/encerramento-emprestimo";

export const MENSAGEM_OPERACOES_NAO_IMPLEMENTADO = "Painel de Operações ainda não disponível.";

export const naoImplementadoOperacoes = (): never => {
  throw new TRPCError({ code: "NOT_IMPLEMENTED", message: MENSAGEM_OPERACOES_NAO_IMPLEMENTADO });
};

// Contratos publicados na T-OPER-01. Todos em `adminProcedure` (RS-OPER-01): `colaborador` recebe
// `FORBIDDEN` antes de chegar aqui (RS-OPER-02). Lista, resumo e últimos cadastros respondem `NOT_IMPLEMENTED` até a T-OPER-02.
export const routerOperacoes = criarRouterTRPC({
  emprestimosEmAberto: adminProcedure
    .input(esquemaEntradaEmprestimosEmAberto)
    .output(esquemaSaidaEmprestimosEmAberto)
    .query(naoImplementadoOperacoes),
  resumo: adminProcedure.output(esquemaResumoOperacoes).query(naoImplementadoOperacoes),
  // RF-OPER-04: devolução no balcão de qualquer empréstimo em aberto do tenant, pelo serviço único
  // da Spec 007 (RN-DEVOL-03), com Operações como ator (RS-OPER-03).
  registrarDevolucao: adminProcedure
    .input(esquemaEntradaRegistrarDevolucao)
    .output(esquemaSaidaRegistrarDevolucao)
    .mutation(async ({ ctx, input }) => {
      try {
        return await encerrarEmprestimo(
          ctx.obterClientePrisma(),
          { tenantId: ctx.tenantId, ator: ctx.usuarioId },
          input.emprestimoId,
          { agora: new Date() },
        );
      } catch (erro) {
        throw traduzirErroEncerramento(erro);
      }
    }),
  ultimosCadastros: adminProcedure
    .output(esquemaSaidaUltimosCadastros)
    .query(naoImplementadoOperacoes),
});
