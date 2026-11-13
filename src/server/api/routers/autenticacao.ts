import { TRPCError } from "@trpc/server";

import { esquemaEntrada } from "@/lib/esquemas/autenticacao";
import {
  aplicarLimite,
  criarRouterTRPC,
  limitadorDoContexto,
  procedimentoPublico,
} from "@/server/api/trpc";
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

  // Spec 009 (ajuste obrigatório 1, RN-SEG-03/04, P2): depois da validação de entrada, reserva
  // `login_ip` e `login_email` numa única transação. Se um bloquear, nenhum é consumido e o Supabase
  // Auth não é chamado (429 ou 503). Depois da chamada, a vaga do IP fica consumida; a do e-mail só
  // fica na falha de credencial.
  entrar: procedimentoPublico.input(esquemaEntrada).mutation(async ({ ctx, input }) => {
    const limitador = limitadorDoContexto(ctx);
    const reservas = await aplicarLimite(() =>
      limitador.reservarLogin({ email: input.email, ip: ctx.ipConfiavel ?? null }),
    );
    // Falha ao devolver deixa a vaga consumida: mais restritivo, nunca menos. O login já aconteceu
    // (ou já falhou) e a resposta não muda; nada vai para log (RS-SEG-03).
    const devolverEmail = () => limitador.devolver(reservas.email).catch(() => undefined);

    try {
      const resultado = await entrar(await ctx.obterClienteSupabase(), input);
      await devolverEmail();
      return resultado;
    } catch (erro) {
      if (erro instanceof ErroCredenciaisInvalidas) {
        throw new TRPCError({
          code: "UNAUTHORIZED",
          message: "Não foi possível entrar. Confira e-mail e senha.",
        });
      }

      await devolverEmail();
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
