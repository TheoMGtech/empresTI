import { afterEach, describe, expect, it, vi } from "vitest";

import nextConfig from "../../../next.config";
import { CABECALHOS_FIXOS, cabecalhosFixos, HSTS } from "./cabecalhos";

const ESPERADOS = {
  "X-Content-Type-Options": "nosniff",
  "Referrer-Policy": "strict-origin-when-cross-origin",
  "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
  "X-Frame-Options": "DENY",
};

const comoMapa = (lista: { key: string; value: string }[]) =>
  Object.fromEntries(lista.map(({ key, value }) => [key, value]));

describe("T-SEG-01 — cabeçalhos HTTP fixos", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it.each(["production", "preview", "development", undefined])(
    "CA-SEG-04 — os quatro cabeçalhos fixos valem com VERCEL_ENV=%s",
    (ambiente) => {
      expect(comoMapa(cabecalhosFixos(ambiente))).toMatchObject(ESPERADOS);
    },
  );

  it("CA-SEG-04 — HSTS de um ano só em produção, sem preload e sem includeSubDomains", () => {
    expect(comoMapa(cabecalhosFixos("production"))["Strict-Transport-Security"]).toBe(
      "max-age=31536000",
    );
    expect(HSTS.value).not.toMatch(/preload|includeSubDomains/i);
  });

  it.each(["preview", "development", undefined])(
    "CA-SEG-04 — sem HSTS com VERCEL_ENV=%s",
    (ambiente) => {
      expect(cabecalhosFixos(ambiente).map(({ key }) => key)).not.toContain(
        "Strict-Transport-Security",
      );
    },
  );

  it("CA-SEG-04 — a lista fixa não carrega CSP, que tem nonce e fica no proxy", () => {
    const nomes = CABECALHOS_FIXOS.map(({ key }) => key.toLowerCase());
    expect(nomes.some((nome) => nome.startsWith("content-security-policy"))).toBe(false);
  });

  it("CA-SEG-04 — o next.config aplica os cabeçalhos a todas as rotas", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    const regras = await nextConfig.headers!();

    expect(regras).toHaveLength(1);
    expect(regras[0]!.source).toBe("/:path*");
    expect(comoMapa(regras[0]!.headers)).toEqual({
      ...ESPERADOS,
      "Strict-Transport-Security": "max-age=31536000",
    });
  });

  it("CA-SEG-04 — fora de produção, o next.config não envia HSTS", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    const regras = await nextConfig.headers!();

    expect(comoMapa(regras[0]!.headers)).toEqual(ESPERADOS);
  });
});
