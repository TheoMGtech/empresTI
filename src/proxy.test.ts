// @vitest-environment node
import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { criarClienteServidor } = vi.hoisted(() => ({ criarClienteServidor: vi.fn() }));

vi.mock("@supabase/ssr", () => ({ createServerClient: criarClienteServidor }));

beforeEach(() => {
  vi.resetModules();
  criarClienteServidor.mockReturnValue({
    auth: { getUser: async () => ({ data: { user: null }, error: null }) },
  });
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

async function responderRaiz() {
  const { proxy } = await import("@/proxy");
  return proxy(new NextRequest("http://localhost:3000/"));
}

function nonceDaCsp(csp: string | null) {
  return csp?.match(/script-src [^;]*'nonce-([^']+)'/)?.[1];
}

describe("T-SEG-02 — proxy com CSP por requisição", () => {
  it("CA-SEG-01 — em produção, a resposta traz a CSP aplicada, sem relaxamentos", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const resposta = await responderRaiz();
    const csp = resposta.headers.get("Content-Security-Policy");

    expect(csp).toContain("default-src 'self'");
    expect(csp).toContain("frame-ancestors 'none'");
    expect(csp).toContain("img-src 'self' https://wdudlqacomnasnrxgbni.supabase.co");
    expect(csp).not.toMatch(/unsafe-inline|unsafe-eval/);
    expect(resposta.headers.get("Content-Security-Policy-Report-Only")).toBeNull();
  });

  it("CA-SEG-02 — duas requisições seguidas recebem nonces diferentes", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const primeira = nonceDaCsp((await responderRaiz()).headers.get("Content-Security-Policy"));
    const segunda = nonceDaCsp((await responderRaiz()).headers.get("Content-Security-Policy"));

    expect(primeira).toBeDefined();
    expect(segunda).toBeDefined();
    expect(primeira).not.toBe(segunda);
  });

  it("CA-SEG-02 — o nonce repassado ao Next é o mesmo da CSP da resposta", async () => {
    vi.stubEnv("NODE_ENV", "production");

    const resposta = await responderRaiz();
    const nonce = nonceDaCsp(resposta.headers.get("Content-Security-Policy"));

    expect(resposta.headers.get("x-middleware-request-x-nonce")).toBe(nonce);
    expect(resposta.headers.get("x-middleware-request-content-security-policy")).toBe(
      resposta.headers.get("Content-Security-Policy"),
    );
  });
});
