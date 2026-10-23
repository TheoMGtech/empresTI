// @vitest-environment node
import type { CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";
import superjson from "superjson";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieParaDefinir = { name: string; value: string; options: CookieOptions };
type OpcoesCliente = { cookies: { setAll: (cookies: CookieParaDefinir[]) => void } };

const COOKIE_SESSAO = "sb-wdudlqacomnasnrxgbni-auth-token";
const TOKEN_ACESSO = "token-de-acesso-simulado";
const TOKEN_RENOVACAO = "token-de-renovacao-simulado";
const SENHA_CORRETA = "senha-de-teste-correta";

const { armazenamento, auth, criarClienteServidor } = vi.hoisted(() => ({
  armazenamento: { getAll: vi.fn(() => []), set: vi.fn() },
  auth: {
    getUser: vi.fn(),
    signInWithPassword: vi.fn(),
    signOut: vi.fn(),
  },
  criarClienteServidor: vi.fn(),
}));

vi.mock("next/headers", () => ({ cookies: async () => armazenamento }));
vi.mock("@supabase/ssr", () => ({ createServerClient: criarClienteServidor }));

import { POST } from "@/app/api/trpc/[trpc]/route";

function simularSupabase() {
  criarClienteServidor.mockImplementation((_url: string, _chave: string, opcoes: OpcoesCliente) => {
    auth.signInWithPassword.mockImplementation(async ({ password }: { password: string }) => {
      if (password !== SENHA_CORRETA) {
        return {
          data: { session: null, user: null },
          error: { code: "invalid_credentials", message: "Invalid login credentials" },
        };
      }

      opcoes.cookies.setAll([
        {
          name: COOKIE_SESSAO,
          value: `base64-${TOKEN_ACESSO}`,
          options: { httpOnly: false, maxAge: 34_560_000, path: "/", sameSite: "lax" },
        },
      ]);
      return {
        data: {
          session: { access_token: TOKEN_ACESSO, refresh_token: TOKEN_RENOVACAO },
          user: { id: "usuario-1" },
        },
        error: null,
      };
    });
    auth.signOut.mockImplementation(async () => {
      opcoes.cookies.setAll([{ name: COOKIE_SESSAO, value: "", options: { maxAge: 0 } }]);
      return { error: null };
    });

    return { auth };
  });
}

async function chamar(procedimento: string, entrada?: unknown) {
  const resposta = await POST(
    new NextRequest(`http://localhost:3000/api/trpc/${procedimento}`, {
      body: JSON.stringify(superjson.serialize(entrada)),
      headers: { "content-type": "application/json" },
      method: "POST",
    }),
  );

  return { corpo: await resposta.text(), status: resposta.status };
}

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
  simularSupabase();
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("rota /api/trpc de autenticação", () => {
  it("CA-LOGIN-04 — grava a sessão só em cookie httpOnly e não devolve tokens no corpo", async () => {
    const { corpo, status } = await chamar("autenticacao.entrar", {
      email: "colaborador@empresa.com",
      senha: SENHA_CORRETA,
    });

    expect(status).toBe(200);
    expect(JSON.parse(corpo)).toEqual({ result: { data: { json: { autenticado: true } } } });
    expect(corpo).not.toContain(TOKEN_ACESSO);
    expect(corpo).not.toContain(TOKEN_RENOVACAO);
    expect(corpo).not.toMatch(/access_token|refresh_token|session/);
    expect(armazenamento.set).toHaveBeenCalledWith(
      COOKIE_SESSAO,
      `base64-${TOKEN_ACESSO}`,
      expect.objectContaining({ httpOnly: true, path: "/", sameSite: "lax" }),
    );
  });

  it("CA-LOGIN-03 — rejeita credenciais inválidas com mensagem genérica e sem cookie", async () => {
    const { corpo, status } = await chamar("autenticacao.entrar", {
      email: "colaborador@empresa.com",
      senha: "senha-de-teste-incorreta",
    });

    expect(status).toBe(401);
    expect(corpo).toContain("Não foi possível entrar. Confira e-mail e senha.");
    expect(corpo).not.toContain("Invalid login credentials");
    expect(armazenamento.set).not.toHaveBeenCalled();
  });

  it("CA-LOGIN-02 — o servidor também recusa entrada inválida sem consultar o Supabase", async () => {
    const { status } = await chamar("autenticacao.entrar", { email: "sem-arroba", senha: "" });

    expect(status).toBe(400);
    expect(auth.signInWithPassword).not.toHaveBeenCalled();
    expect(armazenamento.set).not.toHaveBeenCalled();
  });

  it("CA-LOGIN-06 — sair expira o cookie de sessão mantendo httpOnly", async () => {
    const { corpo, status } = await chamar("autenticacao.sair");

    expect(status).toBe(200);
    expect(JSON.parse(corpo)).toEqual({ result: { data: { json: { autenticado: false } } } });
    expect(auth.signOut).toHaveBeenCalledWith({ scope: "local" });
    expect(armazenamento.set).toHaveBeenCalledWith(
      COOKIE_SESSAO,
      "",
      expect.objectContaining({ httpOnly: true, maxAge: 0 }),
    );
  });
});
