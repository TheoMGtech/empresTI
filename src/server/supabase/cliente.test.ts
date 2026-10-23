// @vitest-environment node
import type { CookieOptions } from "@supabase/ssr";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieParaDefinir = { name: string; value: string; options: CookieOptions };
type OpcoesCliente = {
  cookieOptions: CookieOptions;
  cookies: { setAll: (cookies: CookieParaDefinir[]) => void };
};

const { armazenamento, criarClienteServidor } = vi.hoisted(() => ({
  armazenamento: { getAll: vi.fn(() => []), set: vi.fn() },
  criarClienteServidor: vi.fn<(url: string, chave: string, opcoes: OpcoesCliente) => unknown>(),
}));

vi.mock("next/headers", () => ({ cookies: async () => armazenamento }));
vi.mock("@supabase/ssr", () => ({ createServerClient: criarClienteServidor }));

const CHAVE_PUBLICA = "chave-publica-de-teste-sem-credencial-real";
const COOKIE_DO_SUPABASE: CookieParaDefinir = {
  name: "sb-wdudlqacomnasnrxgbni-auth-token",
  value: "sessao-de-teste",
  options: { httpOnly: false, sameSite: "none", path: "/outro", maxAge: 3600 },
};

async function criarClienteCapturandoOpcoes() {
  const { criarClienteSupabaseServidor } = await import("@/server/supabase/cliente");
  await criarClienteSupabaseServidor();

  const [url, chave, opcoes] = criarClienteServidor.mock.calls[0];
  return { url, chave, opcoes };
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", CHAVE_PUBLICA);
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("cliente Supabase do servidor", () => {
  it("T-LOGIN-01/RS-LOGIN-01 — usa a URL do projeto e a chave publishable", async () => {
    const { url, chave } = await criarClienteCapturandoOpcoes();

    expect(url).toBe("https://wdudlqacomnasnrxgbni.supabase.co");
    expect(chave).toBe(CHAVE_PUBLICA);
  });

  it("CA-LOGIN-04/RS-LOGIN-02 — grava cookies httpOnly, sameSite lax e path raiz", async () => {
    const { opcoes } = await criarClienteCapturandoOpcoes();

    expect(opcoes.cookieOptions).toMatchObject({ httpOnly: true, sameSite: "lax", path: "/" });

    opcoes.cookies.setAll([COOKIE_DO_SUPABASE]);

    expect(armazenamento.set).toHaveBeenCalledWith(
      COOKIE_DO_SUPABASE.name,
      COOKIE_DO_SUPABASE.value,
      { httpOnly: true, sameSite: "lax", path: "/", secure: false, maxAge: 3600 },
    );
  });

  it("CA-LOGIN-04/RS-LOGIN-02 — marca os cookies como secure em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    const { opcoes } = await criarClienteCapturandoOpcoes();

    opcoes.cookies.setAll([COOKIE_DO_SUPABASE]);

    expect(armazenamento.set).toHaveBeenCalledWith(
      COOKIE_DO_SUPABASE.name,
      COOKIE_DO_SUPABASE.value,
      expect.objectContaining({ httpOnly: true, secure: true }),
    );
  });
});
