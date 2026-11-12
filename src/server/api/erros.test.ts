// @vitest-environment node
// T-SESSAO-05: formato único de erro (CA-SESSAO-11), exercitado pelo handler HTTP do tRPC.
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { describe, expect, it } from "vitest";
import { z } from "zod";

import {
  ErroComMotivo,
  MENSAGENS_ERRO,
  criarRouterTRPC,
  procedimentoPublico,
} from "@/server/api/trpc";

const DETALHE_INTERNO = "connect ECONNREFUSED 10.0.0.5:5432 usuario=empresti_dono";

const routerTeste = criarRouterTRPC({
  regra: procedimentoPublico.query(() => {
    throw new TRPCError({
      code: "CONFLICT",
      message: "Limite de empréstimos atingido.",
      cause: new ErroComMotivo("LIMITE_ATINGIDO"),
    });
  }),
  semMotivo: procedimentoPublico.query(() => {
    throw new TRPCError({ code: "FORBIDDEN", message: "Acesso não liberado." });
  }),
  entrada: procedimentoPublico
    .input(
      z.object({
        email: z.email("Informe um e-mail válido."),
        quantidade: z.number().int().positive("Informe uma quantidade positiva."),
      }),
    )
    .mutation(() => ({ ok: true })),
  inesperado: procedimentoPublico.query(() => {
    throw new Error(DETALHE_INTERNO);
  }),
  saidaInvalida: procedimentoPublico
    .output(z.object({ nome: z.string() }))
    .query(() => ({ nome: 1 }) as unknown as { nome: string }),
  internoDeliberado: procedimentoPublico.query(() => {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: "Não foi possível concluir o acesso. Tente novamente.",
    });
  }),
});

type ErroSerializado = {
  message: string;
  code: number;
  data: {
    code: string;
    httpStatus: number;
    path: string;
    motivo: string | null;
    campos: Record<string, string[]> | null;
    stack?: string;
  };
};

async function chamar(procedimento: string, entrada?: unknown) {
  const metodo = entrada === undefined ? "GET" : "POST";
  const resposta = await fetchRequestHandler({
    endpoint: "/api/trpc",
    req: new Request(`http://localhost:3000/api/trpc/${procedimento}`, {
      method: metodo,
      ...(metodo === "POST"
        ? {
            body: JSON.stringify(superjson.serialize(entrada)),
            headers: { "content-type": "application/json" },
          }
        : {}),
    }),
    router: routerTeste,
    createContext: () => ({
      obterClientePrisma: () => {
        throw new Error("Prisma não usado neste teste.");
      },
      obterClienteSupabase: async () => {
        throw new Error("Supabase não usado neste teste.");
      },
    }),
  });

  const corpo = await resposta.text();
  const { error } = JSON.parse(corpo) as { error: { json: ErroSerializado } };
  return { corpo, erro: error.json, status: resposta.status };
}

describe("errorFormatter", () => {
  it("CA-SESSAO-11 — erro de regra chega com error.data.motivo", async () => {
    const { erro, status } = await chamar("regra");

    expect(status).toBe(409);
    expect(erro.message).toBe("Limite de empréstimos atingido.");
    expect(erro.data).toMatchObject({ code: "CONFLICT", motivo: "LIMITE_ATINGIDO", campos: null });
  });

  it("CA-SESSAO-11 — erro sem motivo chega com motivo e campos nulos", async () => {
    const { erro } = await chamar("semMotivo");

    expect(erro.message).toBe("Acesso não liberado.");
    expect(erro.data).toMatchObject({ code: "FORBIDDEN", motivo: null, campos: null });
  });

  it("CA-SESSAO-11 — erro Zod de entrada chega com error.data.campos", async () => {
    const { erro, status } = await chamar("entrada", { email: "sem-arroba", quantidade: -1 });

    expect(status).toBe(400);
    expect(erro.message).toBe(MENSAGENS_ERRO.dadosInvalidos);
    expect(erro.data).toMatchObject({
      code: "BAD_REQUEST",
      motivo: null,
      campos: {
        email: ["Informe um e-mail válido."],
        quantidade: ["Informe uma quantidade positiva."],
      },
    });
  });

  it("CA-SESSAO-11 — campo válido não aparece em campos", async () => {
    const { erro } = await chamar("entrada", { email: "ana@empresa.com", quantidade: 0 });

    expect(erro.data.campos).toEqual({ quantidade: ["Informe uma quantidade positiva."] });
  });

  it("CA-SESSAO-11 — erro inesperado não vaza detalhe interno", async () => {
    const { corpo, erro, status } = await chamar("inesperado");

    expect(status).toBe(500);
    expect(erro.message).toBe(MENSAGENS_ERRO.interno);
    expect(erro.data).toMatchObject({ code: "INTERNAL_SERVER_ERROR", motivo: null, campos: null });
    expect(corpo).not.toContain("ECONNREFUSED");
    expect(corpo).not.toContain("10.0.0.5");
    expect(corpo).not.toContain("empresti_dono");
  });

  it("CA-SESSAO-11 — falha de validação da saída é interna e não vira campos", async () => {
    const { corpo, erro } = await chamar("saidaInvalida");

    expect(erro.message).toBe(MENSAGENS_ERRO.interno);
    expect(erro.data).toMatchObject({ code: "INTERNAL_SERVER_ERROR", campos: null });
    expect(corpo).not.toContain("nome");
  });

  it("CA-SESSAO-11 — erro interno lançado de propósito mantém a mensagem curada", async () => {
    const { erro } = await chamar("internoDeliberado");

    expect(erro.message).toBe("Não foi possível concluir o acesso. Tente novamente.");
  });

  it.each(["regra", "entrada", "inesperado", "saidaInvalida"])(
    "CA-SESSAO-11 — %s não expõe a pilha de execução",
    async (procedimento) => {
      const { corpo, erro } = await chamar(
        procedimento,
        procedimento === "entrada" ? { email: "x" } : undefined,
      );

      expect(erro.data).not.toHaveProperty("stack");
      expect(corpo).not.toMatch(/\bat \S+ \(|\.ts:\d+/);
    },
  );
});
