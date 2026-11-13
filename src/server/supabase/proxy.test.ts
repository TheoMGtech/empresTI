// @vitest-environment node
import type { CookieOptions } from "@supabase/ssr";
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

type CookieParaDefinir = { name: string; value: string; options: CookieOptions };
type OpcoesCliente = {
  cookies: { setAll: (cookies: CookieParaDefinir[]) => void };
};

const { criarClienteServidor } = vi.hoisted(() => ({
  criarClienteServidor: vi.fn<(url: string, chave: string, opcoes: OpcoesCliente) => unknown>(),
}));

vi.mock("@supabase/ssr", () => ({ createServerClient: criarClienteServidor }));

const COOKIE_RENOVADO: CookieParaDefinir = {
  name: "sb-wdudlqacomnasnrxgbni-auth-token",
  value: "sessao-renovada",
  options: { httpOnly: false, sameSite: "none", maxAge: 3600 },
};

function simularSupabase({ renovarSessao }: { renovarSessao: boolean }) {
  criarClienteServidor.mockImplementation((_url, _chave, opcoes) => ({
    auth: {
      getUser: async () => {
        if (renovarSessao) opcoes.cookies.setAll([COOKIE_RENOVADO]);
        return { data: { user: null }, error: null };
      },
    },
  }));
}

const SEGURANCA = {
  nonce: "bm9uY2UtZGUtdGVzdGU=",
  csp: "default-src 'self'; script-src 'self' 'nonce-bm9uY2UtZGUtdGVzdGU='",
};

async function atualizarSessaoNaRaiz(requisicao = new NextRequest("http://localhost:3000/")) {
  const { atualizarSessao } = await import("@/server/supabase/proxy");
  return atualizarSessao(requisicao, SEGURANCA);
}

/** Cabeçalho que o `NextResponse.next({ request: { headers } })` repassa à renderização. */
function repassadoAoNext(resposta: Response, nome: string) {
  return resposta.headers.get(`x-middleware-request-${nome}`);
}

function cookieDaResposta(resposta: Response) {
  return resposta.headers
    .getSetCookie()
    .find((cookie) => cookie.startsWith(`${COOKIE_RENOVADO.name}=`));
}

beforeEach(() => {
  vi.resetModules();
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("proxy de sessão Supabase", () => {
  it("CA-LOGIN-04/RS-LOGIN-02 — devolve a sessão renovada em cookie HttpOnly e SameSite=Lax", async () => {
    simularSupabase({ renovarSessao: true });

    const cookie = await atualizarSessaoNaRaiz().then(cookieDaResposta);

    expect(cookie).toBeDefined();
    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*SameSite=lax/i);
    expect(cookie).toMatch(/;\s*Path=\//);
    expect(cookie).toMatch(/;\s*Max-Age=3600/);
    expect(cookie).not.toMatch(/;\s*Secure/i);
  });

  it("CA-LOGIN-04/RS-LOGIN-02 — exige Secure no cookie em produção", async () => {
    vi.stubEnv("NODE_ENV", "production");
    simularSupabase({ renovarSessao: true });

    const cookie = await atualizarSessaoNaRaiz().then(cookieDaResposta);

    expect(cookie).toMatch(/;\s*HttpOnly/i);
    expect(cookie).toMatch(/;\s*Secure/i);
  });

  it("T-LOGIN-01 — não cria cookie sem renovação e impede cache da resposta", async () => {
    simularSupabase({ renovarSessao: false });

    const resposta = await atualizarSessaoNaRaiz();

    expect(resposta.headers.getSetCookie()).toEqual([]);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("CA-SEG-05 — sem renovação, a CSP vai na resposta e segue com o nonce para o Next", async () => {
    simularSupabase({ renovarSessao: false });

    const resposta = await atualizarSessaoNaRaiz();

    expect(resposta.headers.get("Content-Security-Policy")).toBe(SEGURANCA.csp);
    expect(repassadoAoNext(resposta, "content-security-policy")).toBe(SEGURANCA.csp);
    expect(repassadoAoNext(resposta, "x-nonce")).toBe(SEGURANCA.nonce);
  });

  it("CA-SEG-05 — com sessão renovada, a resposta leva o cookie e a CSP, e o Next recebe os dois", async () => {
    simularSupabase({ renovarSessao: true });
    const requisicao = new NextRequest("http://localhost:3000/catalogo", {
      headers: { cookie: "preferencia=1" },
    });

    const resposta = await atualizarSessaoNaRaiz(requisicao);

    expect(cookieDaResposta(resposta)).toMatch(/;\s*HttpOnly/i);
    expect(resposta.headers.get("Content-Security-Policy")).toBe(SEGURANCA.csp);
    expect(resposta.headers.get("Cache-Control")).toBe("private, no-store");
    expect(repassadoAoNext(resposta, "content-security-policy")).toBe(SEGURANCA.csp);
    expect(repassadoAoNext(resposta, "x-nonce")).toBe(SEGURANCA.nonce);
    const cookieRepassado = repassadoAoNext(resposta, "cookie") ?? "";
    expect(cookieRepassado).toContain(`${COOKIE_RENOVADO.name}=${COOKIE_RENOVADO.value}`);
    expect(cookieRepassado).toContain("preferencia=1");
  });
});
