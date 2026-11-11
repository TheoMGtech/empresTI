import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";

import { obterClientePrisma } from "@/server/db";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ErroMultiplosMemberships,
  ErroSemMembership,
  resolverVinculo,
} from "@/server/services/sessao";
import { criarClienteSupabaseServidor } from "@/server/supabase/cliente";

const obterClienteSupabase = async (): Promise<ClienteSupabaseAutenticacao> =>
  criarClienteSupabaseServidor();

export function criarContextoTRPC() {
  return {
    obterClientePrisma,
    obterClienteSupabase,
  };
}

const t = initTRPC.context<Awaited<ReturnType<typeof criarContextoTRPC>>>().create({
  transformer: superjson,
});

/**
 * Motivo de recusa de regra, carregado como `cause` do `TRPCError`. O `errorFormatter`
 * (T-SESSAO-05) o expõe em `error.data.motivo`.
 */
export class ErroComMotivo extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
    this.name = "ErroComMotivo";
  }
}

export const MENSAGENS_AUTORIZACAO = {
  semSessao: "Sessão encerrada. Entre novamente.",
  indisponivel: "Não foi possível validar a sessão. Tente novamente.",
  semAcesso: "Acesso não liberado.",
  restritoOperacoes: "Acesso restrito a Operações.",
} as const;

// Identidade validada no Supabase Auth a cada request (RF-SESSAO-01). Só o `id` do usuário é
// usado: claims editáveis pelo usuário não entram em decisão de autorização (RS-SESSAO-03).
const exigirSessao = t.middleware(async ({ ctx, next }) => {
  const cliente = await ctx.obterClienteSupabase();
  const { data, error } = await cliente.auth.getUser();

  // Falha de rede ou do Auth não pode virar "sessão encerrada".
  if (error && (!error.status || error.status >= 500)) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: MENSAGENS_AUTORIZACAO.indisponivel,
    });
  }

  if (error || !data.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: MENSAGENS_AUTORIZACAO.semSessao });
  }

  return next({ ctx: { usuarioId: data.user.id } });
});

export const criarRouterTRPC = t.router;
export const procedimentoPublico = t.procedure;
export const protectedProcedure = t.procedure.use(exigirSessao);

// Tenant e papel vêm de `memberships`, nunca do input (RF-SESSAO-02, RF-SESSAO-04).
export const tenantProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  try {
    const vinculo = await resolverVinculo(ctx.obterClientePrisma(), ctx.usuarioId);
    return next({ ctx: { tenantId: vinculo.tenantId, papel: vinculo.papel } });
  } catch (erro) {
    if (erro instanceof ErroSemMembership) {
      throw new TRPCError({ code: "FORBIDDEN", message: MENSAGENS_AUTORIZACAO.semAcesso });
    }

    if (erro instanceof ErroMultiplosMemberships) {
      throw new TRPCError({
        code: "FORBIDDEN",
        message: MENSAGENS_AUTORIZACAO.semAcesso,
        cause: new ErroComMotivo("MULTIPLOS_MEMBERSHIPS"),
      });
    }

    throw erro;
  }
});

// Só `operacoes` passa (RF-SESSAO-05). Esconder o menu não substitui esta verificação.
export const adminProcedure = tenantProcedure.use(async ({ ctx, next }) => {
  if (ctx.papel !== "operacoes") {
    throw new TRPCError({ code: "FORBIDDEN", message: MENSAGENS_AUTORIZACAO.restritoOperacoes });
  }

  return next();
});
