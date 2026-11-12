// @vitest-environment node
import { describe, expect, it } from "vitest";

import { gerarNonce, montarCsp } from "./csp";

const URL_SUPABASE = "https://wdudlqacomnasnrxgbni.supabase.co";
const NONCE = "bm9uY2UtZGUtdGVzdGU=";

function diretivas(csp: string) {
  return Object.fromEntries(
    csp.split(";").map((trecho) => {
      const [nome, ...valores] = trecho.trim().split(/\s+/);
      return [nome!, valores];
    }),
  );
}

describe("T-SEG-02 — política de CSP", () => {
  it("CA-SEG-01 — em produção, traz exatamente as diretivas de RF-SEG-02", () => {
    const csp = montarCsp({ nonce: NONCE, desenvolvimento: false, urlSupabase: URL_SUPABASE });

    expect(diretivas(csp)).toEqual({
      "default-src": ["'self'"],
      "script-src": ["'self'", `'nonce-${NONCE}'`],
      "style-src": ["'self'", `'nonce-${NONCE}'`],
      "img-src": ["'self'", URL_SUPABASE],
      "font-src": ["'self'"],
      "connect-src": ["'self'"],
      "object-src": ["'none'"],
      "base-uri": ["'self'"],
      "form-action": ["'self'"],
      "frame-ancestors": ["'none'"],
    });
  });

  it("CA-SEG-01 — em produção, sem 'unsafe-inline' e sem 'unsafe-eval'", () => {
    const csp = montarCsp({ nonce: NONCE, desenvolvimento: false, urlSupabase: URL_SUPABASE });

    expect(csp).not.toContain("'unsafe-inline'");
    expect(csp).not.toContain("'unsafe-eval'");
  });

  it("CA-SEG-01 — img-src usa só a origem do Supabase, sem caminho", () => {
    const csp = montarCsp({
      nonce: NONCE,
      desenvolvimento: false,
      urlSupabase: `${URL_SUPABASE}/`,
    });

    expect(diretivas(csp)["img-src"]).toEqual(["'self'", URL_SUPABASE]);
  });

  it("CA-SEG-01 — no desenvolvimento, só o que o hot reload exige é acrescentado", () => {
    const csp = diretivas(
      montarCsp({ nonce: NONCE, desenvolvimento: true, urlSupabase: URL_SUPABASE }),
    );

    expect(csp["script-src"]).toEqual(["'self'", `'nonce-${NONCE}'`, "'unsafe-eval'"]);
    expect(csp["style-src"]).toEqual(["'self'", "'unsafe-inline'"]);
    expect(csp["connect-src"]).toEqual(["'self'"]);
    expect(csp["frame-ancestors"]).toEqual(["'none'"]);
  });

  it("CA-SEG-02 — o nonce tem 128 bits em base64 e muda a cada chamada", () => {
    const nonces = Array.from({ length: 50 }, () => gerarNonce());

    for (const nonce of nonces) {
      expect(nonce).toMatch(/^[A-Za-z0-9+/]{22}==$/);
      expect(Buffer.from(nonce, "base64")).toHaveLength(16);
    }
    expect(new Set(nonces).size).toBe(nonces.length);
  });
});
