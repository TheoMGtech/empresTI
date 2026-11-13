import type { PrismaClient } from "@prisma/client";
import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { z, ZodError } from "zod";

import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { obterClientePrisma } from "@/server/db";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { ErroLimiteExcedido, ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import { lerIpConfiavel } from "@/server/services/ip-confiavel";
import { criarLimitador, type Limitador } from "@/server/services/limites";
import {
  ErroMultiplosMemberships,
  ErroSemMembership,
  resolverVinculo,
} from "@/server/services/sessao";
import { criarClienteSupabaseServidor } from "@/server/supabase/cliente";

const obterClienteSupabase = async (): Promise<ClienteSupabaseAutenticacao> =>
  criarClienteSupabaseServidor();

/**
 * Contexto do tRPC. `ipConfiavel` e `obterLimitador` são opcionais só para os testes, que montam o
 * contexto à mão com `createCaller` (Q10). Sem IP, vale o identificador compartilhado (P3); sem
 * limitador, vale o real (`limitadorDoContexto`).
 */
export type ContextoTRPC = {
  obterClientePrisma: () => PrismaClient;
  obterClienteSupabase: () => Promise<ClienteSupabaseAutenticacao>;
  ipConfiavel?: string | null;
  obterLimitador?: () => Limitador;
};

// Spec 009 (T-SEG-08): o IP vem só de `lerIpConfiavel` (RN-SEG-11), e o limitador é sempre o real.
export function criarContextoTRPC({ req }: { req: Request }): ContextoTRPC {
  return {
    obterClientePrisma,
    obterClienteSupabase,
    ipConfiavel: lerIpConfiavel(req.headers),
    obterLimitador: () => criarLimitador(obterClientePrisma),
  };
}

/** O padrão é o limitador real sobre o Prisma do contexto: nunca a ausência de limite. */
export function limitadorDoContexto(ctx: ContextoTRPC): Limitador {
  return ctx.obterLimitador?.() ?? criarLimitador(ctx.obterClientePrisma);
}

/**
 * Traduz os erros do limitador (RF-SEG-11, RF-SEG-12): excedido vira 429 e indisponível vira 503,
 * com as mensagens aprovadas e sem detalhe. O `ErroLimiteExcedido` segue como `cause`, para o
 * `Retry-After` (`metaRespostaLimite`). Outros erros passam como estão.
 */
export async function aplicarLimite<T>(acao: () => Promise<T>): Promise<T> {
  try {
    return await acao();
  } catch (erro) {
    if (erro instanceof ErroLimiteExcedido) {
      throw new TRPCError({
        code: "TOO_MANY_REQUESTS",
        message: MENSAGENS_LIMITE.excedido,
        cause: erro,
      });
    }
    if (erro instanceof ErroLimiteIndisponivel) {
      throw new TRPCError({ code: "SERVICE_UNAVAILABLE", message: MENSAGENS_LIMITE.indisponivel });
    }
    throw erro;
  }
}

/**
 * `responseMeta` do Route Handler (RF-SEG-11): `Retry-After` com o maior número de segundos entre
 * os erros `TOO_MANY_REQUESTS` da resposta. O status HTTP já vem do código do erro.
 */
export function metaRespostaLimite({ errors }: { errors: readonly TRPCError[] }) {
  const segundos = errors
    .filter((erro) => erro.code === "TOO_MANY_REQUESTS" && erro.cause instanceof ErroLimiteExcedido)
    .map((erro) => (erro.cause as ErroLimiteExcedido).segundos);

  if (segundos.length === 0) return {};
  return { headers: { "Retry-After": String(Math.max(...segundos)) } };
}

/**
 * Motivo de recusa de regra, carregado como `cause` do `TRPCError`. O `errorFormatter` o expõe
 * em `error.data.motivo` (CA-SESSAO-11).
 */
export class ErroComMotivo extends Error {
  constructor(readonly motivo: string) {
    super(motivo);
    this.name = "ErroComMotivo";
  }
}

export const MENSAGENS_ERRO = {
  dadosInvalidos: "Dados inválidos. Confira os campos.",
  interno: "Não foi possível concluir a operação. Tente novamente.",
} as const;

export type CamposInvalidos = Record<string, string[] | undefined>;

const t = initTRPC.context<ContextoTRPC>().create({
  transformer: superjson,
  // Formato único de erro (ADR-001 §4, CA-SESSAO-11): a tela decide por `code`, `motivo` e
  // `campos`, sem ler a mensagem. Pilha e detalhe de erro inesperado não saem do servidor.
  errorFormatter({ shape, error }) {
    const causa = error.cause;
    // Só erro de entrada vira `campos`; Zod falhando na saída é erro interno.
    const campos: CamposInvalidos | null =
      error.code === "BAD_REQUEST" && causa instanceof ZodError
        ? z.flattenError(causa).fieldErrors
        : null;
    const motivo = causa instanceof ErroComMotivo ? causa.motivo : null;
    // `TRPCError` lançado de propósito não tem `cause`; erro inesperado chega embrulhado nele.
    const inesperado =
      error.code === "INTERNAL_SERVER_ERROR" && causa !== undefined && motivo === null;

    const dados = { ...shape.data };
    delete dados.stack;
    const mensagem = campos
      ? MENSAGENS_ERRO.dadosInvalidos
      : inesperado
        ? MENSAGENS_ERRO.interno
        : shape.message;

    return { ...shape, message: mensagem, data: { ...dados, motivo, campos } };
  },
});

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
