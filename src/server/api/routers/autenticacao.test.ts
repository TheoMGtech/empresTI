import { describe, expect, it, vi } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

function criarCliente({ autenticado = false, falhaEntrada = false, falhaSaida = false } = {}) {
  return {
    auth: {
      getUser: vi.fn(async () => ({
        data: { user: autenticado ? { id: "usuario-1" } : null },
        error: null,
      })),
      signInWithPassword: vi.fn(async () => ({
        data: { user: falhaEntrada ? null : { id: "usuario-1" }, session: null },
        error: falhaEntrada ? { message: "detalhe interno" } : null,
      })),
      signOut: vi.fn(async () => ({
        error: falhaSaida ? { message: "detalhe interno" } : null,
      })),
    },
  } as unknown as ClienteSupabaseAutenticacao;
}

function criarCaller(cliente: ClienteSupabaseAutenticacao) {
  return routerAplicacao.createCaller({
    obterClientePrisma: () => {
      throw new Error("Prisma não usado neste teste.");
    },
    obterClienteSupabase: async () => cliente,
  });
}

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
      criarCaller(criarCliente({ falhaEntrada: true })).autenticacao.entrar({
        email: "colaborador@empresa.com",
        senha: "senha-incorreta",
      }),
    ).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Não foi possível entrar. Confira e-mail e senha.",
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
