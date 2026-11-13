import { describe, expect, it, vi } from "vitest";

import { MENSAGENS_LIMITE } from "@/lib/mensagens-limite";
import { routerAplicacao } from "@/server/api/raiz";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { criarLimitadorDeTeste, type ResultadoLimitador } from "@/test/limitador";

type ErroEntrada = { code?: string; status?: number; message: string } | null;

const CREDENCIAIS_INVALIDAS: ErroEntrada = {
  code: "invalid_credentials",
  status: 400,
  message: "Invalid login credentials",
};

function criarCliente({
  autenticado = false,
  erroEntrada = null as ErroEntrada,
  falhaSaida = false,
} = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: autenticado ? { id: "usuario-1" } : null },
        error: null,
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: erroEntrada ? null : { id: "usuario-1" }, session: null },
        error: erroEntrada,
      })),
      signOut: vi.fn(async () => ({
        error: falhaSaida ? { message: "detalhe interno" } : null,
      })),
    },
  } as unknown as ClienteSupabaseAutenticacao;
}

// Prisma simulado: o limite vem de um limitador de teste explícito (Spec 009). O contador real é
// provado com banco real em `autenticacao-limite.test.ts`.
function criarCaller(
  cliente: ClienteSupabaseAutenticacao,
  limitador = criarLimitadorDeTeste(),
  ipConfiavel: string | null = null,
) {
  return routerAplicacao.createCaller({
    obterClientePrisma: () => {
      throw new Error("Prisma não usado neste teste.");
    },
    obterClienteSupabase: async () => cliente,
    obterLimitador: limitador.obterLimitador,
    ipConfiavel,
  });
}

const ENTRADA = { email: "Colaborador@Empresa.com", senha: "senha-valida" };

describe("limite do login (Spec 009, limitador de teste)", () => {
  it.each<[ResultadoLimitador, string, string]>([
    ["excedido", "TOO_MANY_REQUESTS", MENSAGENS_LIMITE.excedido],
    ["indisponivel", "SERVICE_UNAVAILABLE", MENSAGENS_LIMITE.indisponivel],
  ])("CA-SEG-07/08/12 — limitador %s: responde %s sem chamar o Supabase Auth", async (resultado, code, message) => {
    const cliente = criarCliente();
    const limitador = criarLimitadorDeTeste(resultado);

    await expect(criarCaller(cliente, limitador).autenticacao.entrar(ENTRADA)).rejects.toMatchObject({
      code,
      message,
    });
    expect(cliente.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(limitador.chamadas.devolver).toEqual([]);
  });

  it("RN-SEG-03 — reserva com o e-mail da entrada e o IP confiável do contexto", async () => {
    const limitador = criarLimitadorDeTeste();

    await criarCaller(criarCliente(), limitador, "203.0.113.7").autenticacao.entrar(ENTRADA);

    expect(limitador.chamadas.reservarLogin).toEqual([
      { email: "Colaborador@Empresa.com", ip: "203.0.113.7" },
    ]);
  });

  it("RN-SEG-03 — entrada inválida não reserva vaga", async () => {
    const limitador = criarLimitadorDeTeste();

    await expect(
      criarCaller(criarCliente(), limitador).autenticacao.entrar({ email: "sem-arroba", senha: "" }),
    ).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(limitador.chamadas.reservarLogin).toEqual([]);
  });

  it("P2 — sucesso devolve a vaga do e-mail e mantém a do IP", async () => {
    const limitador = criarLimitadorDeTeste();

    await criarCaller(criarCliente(), limitador).autenticacao.entrar(ENTRADA);

    expect(limitador.chamadas.devolver.map((reserva) => reserva.escopo)).toEqual(["login_email"]);
  });

  it("P2 — falha de credencial mantém as duas vagas", async () => {
    const limitador = criarLimitadorDeTeste();

    await expect(
      criarCaller(criarCliente({ erroEntrada: CREDENCIAIS_INVALIDAS }), limitador).autenticacao.entrar(
        ENTRADA,
      ),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(limitador.chamadas.devolver).toEqual([]);
  });

  it("P2 — falha que não é de credencial devolve a vaga do e-mail", async () => {
    const limitador = criarLimitadorDeTeste();

    await expect(
      criarCaller(
        criarCliente({ erroEntrada: { status: 503, message: "detalhe interno" } }),
        limitador,
      ).autenticacao.entrar(ENTRADA),
    ).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(limitador.chamadas.devolver.map((reserva) => reserva.escopo)).toEqual(["login_email"]);
  });

  it("P2 — falha ao devolver a vaga não muda a resposta do login", async () => {
    const limitador = criarLimitadorDeTeste();
    limitador.limitador.devolver = async () => {
      throw new Error("banco fora");
    };

    await expect(criarCaller(criarCliente(), limitador).autenticacao.entrar(ENTRADA)).resolves.toEqual({
      autenticado: true,
    });
  });
});

describe("router de autenticação", () => {
  it("CA-LOGIN-04 — autentica sem devolver tokens", async () => {
    const resposta = await criarCaller(criarCliente()).autenticacao.entrar({
      email: "colaborador@empresa.com",
      senha: "senha-valida",
    });

    expect(resposta).toEqual({ autenticado: true });
    expect(resposta).not.toHaveProperty("session");
    expect(resposta).not.toHaveProperty("access_token");
  });

  it("CA-LOGIN-03 — normaliza credenciais inválidas", async () => {
    await expect(
      criarCaller(criarCliente({ erroEntrada: CREDENCIAIS_INVALIDAS })).autenticacao.entrar({
        email: "colaborador@empresa.com",
        senha: "senha-incorreta",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Não foi possível entrar. Confira e-mail e senha.",
    });
  });

  it.each([
    ["Supabase indisponível", { status: 503, message: "detalhe interno" }],
    [
      "limite de requisições",
      { code: "over_request_rate_limit", status: 429, message: "detalhe interno" },
    ],
    ["falha de rede", { status: 0, message: "detalhe interno: fetch failed" }],
  ])("RF-LOGIN-08 — %s não vira erro de credenciais", async (_caso, erroEntrada) => {
    await expect(
      criarCaller(criarCliente({ erroEntrada })).autenticacao.entrar({
        email: "colaborador@empresa.com",
        senha: "senha-valida",
      }),
    ).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "Não foi possível concluir o acesso. Tente novamente.",
    });
  });

  it("CA-LOGIN-05/CA-LOGIN-06 — consulta e encerra somente a sessão local", async () => {
    const cliente = criarCliente({ autenticado: true });
    const caller = criarCaller(cliente);

    await expect(caller.autenticacao.sessao()).resolves.toEqual({ autenticado: true });
    await expect(caller.autenticacao.sair()).resolves.toEqual({ autenticado: false });
    expect(cliente.auth.signOut).toHaveBeenCalledWith({ scope: "local" });
  });
});
