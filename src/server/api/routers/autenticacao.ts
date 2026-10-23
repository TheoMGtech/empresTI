import { TRPCError } from "@trpc/server";

import { esquemaEntrada } from "@/lib/esquemas/autenticacao";
import { criarRouterTRPC, procedimentoPublico } from "@/server/api/trpc";
import {
  ErroAutenticacaoIndisponivel,
  ErroCredenciaisInvalidas,
  consultarSessao,
  entrar,
  sair,
} from "@/server/services/autenticacao";

export const routerAutenticacao = criarRouterTRPC({
  sessao: procedimentoPublico.query(async ({ ctx }) => {
    const cliente = await ctx.obterClienteSupabase();
    return consultarSessao(cliente);
  }),

  entrar: procedimentoPublico.input(esquemaEntrada).mutation(async ({ ctx, input }) => {
    const cliente = await ctx.obterClienteSupabase();

    try {
      return await entrar(cliente, input);
    } catch (erro) {
      if (erro instanceof ErroCredenciaisInvalidas) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Não foi possível entrar. Confira e-mail e senha.",
        });
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Não foi possível concluir o acesso. Tente novamente.",
      });
    }
  }),

  sair: procedimentoPublico.mutation(async ({ ctx }) => {
    const cliente = await ctx.obterClienteSupabase();

    try {
      return await sair(cliente);
    } catch (erro) {
      if (erro instanceof ErroAutenticacaoIndisponivel) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Não foi possível encerrar o acesso. Tente novamente.",
        });
      }

      throw erro;
    }
  }),
});
