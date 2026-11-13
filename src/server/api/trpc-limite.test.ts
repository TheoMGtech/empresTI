// @vitest-environment node
// Spec 009 (T-SEG-08): contexto com IP confiável e limitador, tradução para 429/503 e `Retry-After`.
// O contador em si é provado com banco real em `limites.test.ts`; aqui o Prisma é simulado.
import { TRPCError } from "@trpc/server";
import { fetchRequestHandler } from "@trpc/server/adapters/fetch";
import superjson from "superjson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { z } from "zod";

import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import {
  aplicarLimite,
  criarContextoTRPC,
  criarRouterTRPC,
  limitadorDoContexto,
  metaRespostaLimite,
  procedimentoPublico,
  type ContextoTRPC,
} from "@/server/api/trpc";
import { ErroLimiteExcedido, ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import {
  identificadoresLogin,
  identificadoresMutacao,
} from "@/server/services/identificadores-limite";
import { criarLimitador } from "@/server/services/limites";
import { criarLimitadorDeTeste } from "@/test/limitador";

// Prisma simulado: `$transaction` executa a função com uma transação que registra os comandos.
// `$queryRaw` devolve uma linha (vaga concedida) ou nenhuma (limite cheio).
const simulado = vi.hoisted(() => {
  type Comando = { sql: string; valores: unknown[] };
  const estado = { comandos: [] as Comando[], cheio: false, transacoes: 0 };
  const registrar = (partes: TemplateStringsArray, ...valores: unknown[]) => {
    estado.comandos.push({ sql: partes.join("?"), valores });
  };
  const prisma = {
    $transaction: async (acao: (transacao: unknown) => Promise<unknown>) => {
      estado.transacoes += 1;
      return acao({
        $queryRaw: async (partes: TemplateStringsArray, ...valores: unknown[]) => {
          registrar(partes, ...valores);
          return estado.cheio ? [] : [{ contador: 1 }];
        },
        $executeRaw: async (partes: TemplateStringsArray, ...valores: unknown[]) => {
          registrar(partes, ...valores);
          return 0;
        },
      });
    },
  };
  return { estado, prisma };
});

vi.mock("@/server/db", () => ({ obterClientePrisma: () => simulado.prisma }));

type PrismaDoContexto = ReturnType<ContextoTRPC["obterClientePrisma"]>;
const prismaSimulado = simulado.prisma as unknown as PrismaDoContexto;

const AGORA = new Date("2026-11-12T12:07:30Z");
const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";

const identificadoresGravados = () =>
  simulado.estado.comandos
    .filter((comando) => comando.sql.includes("INSERT INTO"))
    .map((comando) => comando.valores[1]);

function requisicao(cabecalhos: Record<string, string> = {}) {
  return new Request("http://localhost/api/trpc/x", { headers: cabecalhos });
}

beforeEach(() => {
  simulado.estado.comandos = [];
  simulado.estado.cheio = false;
  simulado.estado.transacoes = 0;
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("criarContextoTRPC", () => {
  it("CA-SEG-16 — na Vercel, o IP confiável vem de x-forwarded-for válido", () => {
    vi.stubEnv("VERCEL", "1");
    const ctx = criarContextoTRPC({ req: requisicao({ "x-forwarded-for": "203.0.113.7" }) });
    expect(ctx.ipConfiavel).toBe("203.0.113.7");
  });

  it("CA-SEG-16 — cabeçalhos forjados não viram IP confiável", () => {
    vi.stubEnv("VERCEL", "1");
    const ctx = criarContextoTRPC({
      req: requisicao({
        "x-real-ip": "198.51.100.1",
        "x-vercel-forwarded-for": "198.51.100.2",
        "x-client-ip": "198.51.100.3",
      }),
    });
    expect(ctx.ipConfiavel).toBeNull();
  });

  it("CA-SEG-16 — fora da Vercel, não há IP confiável", () => {
    vi.stubEnv("VERCEL", "");
    const ctx = criarContextoTRPC({ req: requisicao({ "x-forwarded-for": "203.0.113.7" }) });
    expect(ctx.ipConfiavel).toBeNull();
  });

  it("CA-SEG-16 — o contexto da requisição sempre usa o limitador real, sobre o Prisma do servidor", async () => {
    vi.stubEnv("VERCEL", "1");
    const ctx = criarContextoTRPC({ req: requisicao({ "x-forwarded-for": "203.0.113.7" }) });

    await ctx.obterLimitador?.().reservarMutacao({
      tenantId: TENANT,
      usuarioId: USUARIO,
      ip: ctx.ipConfiavel ?? null,
    });

    const ids = identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: "203.0.113.7" });
    expect(simulado.estado.transacoes).toBe(1);
    expect(identificadoresGravados()).toEqual([ids.mutacao_ip, ids.mutacao_usuario]);
  });
});

describe("limitadorDoContexto", () => {
  it("usa o limitador explícito do contexto, quando há um", async () => {
    const teste = criarLimitadorDeTeste();
    const ctx: ContextoTRPC = {
      obterClientePrisma: () => prismaSimulado,
      obterClienteSupabase: async () => {
        throw new Error("não usado");
      },
      obterLimitador: teste.obterLimitador,
    };

    await limitadorDoContexto(ctx).reservarMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null });

    expect(teste.chamadas.reservarMutacao).toEqual([
      { tenantId: TENANT, usuarioId: USUARIO, ip: null },
    ]);
    expect(simulado.estado.transacoes).toBe(0);
  });

  it("sem limitador no contexto, usa o real sobre o Prisma do contexto — nunca a ausência de limite", async () => {
    const ctx: ContextoTRPC = {
      obterClientePrisma: () => prismaSimulado,
      obterClienteSupabase: async () => {
        throw new Error("não usado");
      },
    };

    await limitadorDoContexto(ctx).reservarMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null });

    expect(simulado.estado.transacoes).toBe(1);
  });
});

describe("criarLimitador", () => {
  const limitador = () => criarLimitador(() => prismaSimulado, () => AGORA);

  it("CA-SEG-13 — reservarLogin grava só o HMAC do IP e do e-mail normalizado, e devolve as duas reservas", async () => {
    const reservas = await limitador().reservarLogin({ email: "  Pessoa@Empresa.COM ", ip: null });

    const ids = identificadoresLogin({ email: "pessoa@empresa.com", ip: null });
    expect(identificadoresGravados()).toEqual([ids.login_email, ids.login_ip]);
    expect(reservas).toEqual({
      ip: { escopo: "login_ip", identificador: ids.login_ip, janelaInicio: new Date("2026-11-12T12:00:00Z") },
      email: {
        escopo: "login_email",
        identificador: ids.login_email,
        janelaInicio: new Date("2026-11-12T12:00:00Z"),
      },
    });
    const valores = simulado.estado.comandos.flatMap((comando) => comando.valores).map(String);
    expect(valores.some((valor) => valor.toLowerCase().includes("pessoa@empresa.com"))).toBe(false);
  });

  it("limite cheio: lança ErroLimiteExcedido com os segundos até o fim da janela", async () => {
    simulado.estado.cheio = true;
    const erro = await limitador()
      .reservarMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: "203.0.113.7" })
      .catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(ErroLimiteExcedido);
    expect((erro as ErroLimiteExcedido).segundos).toBe(30);
  });

  it("CA-SEG-12 — sem CHAVE_HMAC_LIMITES, falha fechado sem tocar o banco", async () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", "");

    await expect(limitador().reservarLogin({ email: "a@b.com", ip: null })).rejects.toBeInstanceOf(
      ErroLimiteIndisponivel,
    );
    await expect(
      limitador().reservarMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null }),
    ).rejects.toBeInstanceOf(ErroLimiteIndisponivel);
    expect(simulado.estado.transacoes).toBe(0);
  });

  it("CA-SEG-12 — sem banco configurado, falha fechado sem detalhe", async () => {
    const semBanco = criarLimitador(() => {
      throw new Error("DATABASE_URL ausente");
    });

    const erros = await Promise.all([
      semBanco.reservarLogin({ email: "a@b.com", ip: null }).catch((e: unknown) => e),
      semBanco.reservarMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null }).catch((e: unknown) => e),
      semBanco
        .devolver({ escopo: "login_email", identificador: "0".repeat(64), janelaInicio: AGORA })
        .catch((e: unknown) => e),
    ]);

    for (const erro of erros) {
      expect(erro).toBeInstanceOf(ErroLimiteIndisponivel);
      expect((erro as Error).message).not.toContain("DATABASE_URL");
    }
  });
});

describe("aplicarLimite", () => {
  it("devolve o resultado da ação quando o limite permite", async () => {
    await expect(aplicarLimite(async () => "ok")).resolves.toBe("ok");
  });

  it("CA-SEG-12 — limite excedido vira TOO_MANY_REQUESTS com a mensagem aprovada", async () => {
    const erro = await aplicarLimite(async () => {
      throw new ErroLimiteExcedido(450);
    }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(TRPCError);
    expect(erro).toMatchObject({ code: "TOO_MANY_REQUESTS", message: MENSAGENS_LIMITE.excedido });
  });

  it("CA-SEG-12 — contador indisponível vira SERVICE_UNAVAILABLE com a mensagem aprovada", async () => {
    const erro = await aplicarLimite(async () => {
      throw new ErroLimiteIndisponivel();
    }).catch((e: unknown) => e);

    expect(erro).toBeInstanceOf(TRPCError);
    expect(erro).toMatchObject({ code: "SERVICE_UNAVAILABLE", message: MENSAGENS_LIMITE.indisponivel });
  });

  it("outros erros passam como estão", async () => {
    const original = new TRPCError({ code: "FORBIDDEN", message: "Acesso não liberado." });
    await expect(
      aplicarLimite(async () => {
        throw original;
      }),
    ).rejects.toBe(original);
  });
});

describe("resposta HTTP (Route Handler)", () => {
  const routerTeste = criarRouterTRPC({
    limitado: procedimentoPublico
      .input(z.object({ resultado: z.enum(["permitir", "excedido", "indisponivel"]), segundos: z.number() }))
      .mutation(({ ctx, input }) =>
        aplicarLimite(async () => {
          const teste = criarLimitadorDeTeste(input.resultado, input.segundos);
          await limitadorDoContexto({ ...ctx, obterLimitador: teste.obterLimitador }).reservarMutacao({
            tenantId: TENANT,
            usuarioId: USUARIO,
            ip: ctx.ipConfiavel ?? null,
          });
          return "gravado";
        }),
      ),
  });

  type Entrada = { resultado: "permitir" | "excedido" | "indisponivel"; segundos: number };

  function chamar(caminho: string, corpo: unknown) {
    return fetchRequestHandler({
      endpoint: "/api/trpc",
      req: new Request(`http://localhost/api/trpc/${caminho}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(corpo),
      }),
      router: routerTeste,
      createContext: () => ({
        obterClientePrisma: () => prismaSimulado,
        obterClienteSupabase: async () => {
          throw new Error("não usado");
        },
      }),
      responseMeta: metaRespostaLimite,
    });
  }

  const umaChamada = (entrada: Entrada) => chamar("limitado", superjson.serialize(entrada));
  const lote = (...entradas: Entrada[]) =>
    chamar(
      `${entradas.map(() => "limitado").join(",")}?batch=1`,
      Object.fromEntries(entradas.map((entrada, i) => [String(i), superjson.serialize(entrada)])),
    );

  it("CA-SEG-12 — 429 com Retry-After em segundos e a mensagem aprovada, sem pilha nem detalhe", async () => {
    const resposta = await umaChamada({ resultado: "excedido", segundos: 450 });
    const corpo = (await resposta.json()) as { error: { json: Record<string, unknown> } };

    expect(resposta.status).toBe(429);
    expect(resposta.headers.get("Retry-After")).toBe("450");
    expect(corpo.error.json).toMatchObject({
      message: MENSAGENS_LIMITE.excedido,
      data: { code: "TOO_MANY_REQUESTS", httpStatus: 429, motivo: null, campos: null },
    });
    expect(corpo.error.json.data).not.toHaveProperty("stack");
  });

  it("CA-SEG-12 — 503 com a mensagem aprovada, sem Retry-After nem detalhe", async () => {
    const resposta = await umaChamada({ resultado: "indisponivel", segundos: 0 });
    const corpo = (await resposta.json()) as { error: { json: Record<string, unknown> } };

    expect(resposta.status).toBe(503);
    expect(resposta.headers.get("Retry-After")).toBeNull();
    expect(corpo.error.json).toMatchObject({
      message: MENSAGENS_LIMITE.indisponivel,
      data: { code: "SERVICE_UNAVAILABLE", httpStatus: 503 },
    });
    expect(corpo.error.json.data).not.toHaveProperty("stack");
  });

  it("RF-SEG-11 — em lote, Retry-After é o maior número de segundos entre os 429", async () => {
    const resposta = await lote(
      { resultado: "excedido", segundos: 30 },
      { resultado: "excedido", segundos: 450 },
      { resultado: "permitir", segundos: 0 },
    );

    expect(resposta.headers.get("Retry-After")).toBe("450");
  });

  it("sucesso não leva Retry-After", async () => {
    const resposta = await umaChamada({ resultado: "permitir", segundos: 0 });

    expect(resposta.status).toBe(200);
    expect(resposta.headers.get("Retry-After")).toBeNull();
  });

  it("metaRespostaLimite ignora erros que não são de limite", () => {
    expect(
      metaRespostaLimite({ errors: [new TRPCError({ code: "FORBIDDEN", message: "x" })] }),
    ).toEqual({});
  });
});
