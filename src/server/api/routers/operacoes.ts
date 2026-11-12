import { lerAmbientePublico } from "@/env";
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
import {
  consultarResumoOperacoes,
  listarEmprestimosEmAberto,
  listarUltimosCadastros,
} from "@/server/services/operacoes";

// Painel de Operações (Spec 008). Todos em `adminProcedure` (RS-OPER-01): `colaborador` recebe
// `FORBIDDEN` antes de chegar aqui (RS-OPER-02). O tenant vem sempre da sessão.
export const routerOperacoes = criarRouterTRPC({
  // RF-OPER-01 e RF-OPER-03: lista paginada com chips; janelas de D-OPER-05.
  emprestimosEmAberto: adminProcedure
    .input(esquemaEntradaEmprestimosEmAberto)
    .output(esquemaSaidaEmprestimosEmAberto)
    .query(({ ctx, input }) =>
      listarEmprestimosEmAberto(ctx.obterClientePrisma(), ctx.tenantId, input, {
        agora: new Date(),
        urlSupabase: lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL,
      }),
    ),

  // RF-OPER-02: cards de estatística.
  resumo: adminProcedure
    .output(esquemaResumoOperacoes)
    .query(({ ctx }) =>
      consultarResumoOperacoes(ctx.obterClientePrisma(), ctx.tenantId, { agora: new Date() }),
    ),

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

  // RF-OPER-08: os 3 cadastros mais recentes do tenant.
  ultimosCadastros: adminProcedure
    .output(esquemaSaidaUltimosCadastros)
    .query(({ ctx }) => listarUltimosCadastros(ctx.obterClientePrisma(), ctx.tenantId)),
});
