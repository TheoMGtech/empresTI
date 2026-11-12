// @vitest-environment node
//
// Spec 009 (T-SEG-06, CA-SEG-16): o IP só vem de `x-forwarded-for` válido, e só em deploy da Vercel.
// Cabeçalhos forjados pelo cliente são ignorados; sem origem confiável, `null` (identificador
// compartilhado, P3).
import { describe, expect, it } from "vitest";

import { lerIpConfiavel } from "@/server/services/ip-confiavel";

const NA_VERCEL = { VERCEL: "1" };

function cabecalhos(valores: Record<string, string>) {
  return new Headers(valores);
}

describe("lerIpConfiavel", () => {
  it.each(["203.0.113.7", "2001:db8::1", " 198.51.100.4 "])(
    "CA-SEG-16 — com VERCEL=1, aceita x-forwarded-for com um endereço válido (%s)",
    (ip) => {
      expect(lerIpConfiavel(cabecalhos({ "x-forwarded-for": ip }), NA_VERCEL)).toBe(ip.trim());
    },
  );

  it("CA-SEG-16 — ignora x-real-ip, x-vercel-forwarded-for e x-client-ip forjados", () => {
    const forjados = cabecalhos({
      "x-real-ip": "198.51.100.1",
      "x-vercel-forwarded-for": "198.51.100.2",
      "x-client-ip": "198.51.100.3",
      forwarded: "for=198.51.100.4",
      "cf-connecting-ip": "198.51.100.5",
    });

    expect(lerIpConfiavel(forjados, NA_VERCEL)).toBeNull();
  });

  it("CA-SEG-16 — com x-forwarded-for válido, os outros cabeçalhos não mudam o resultado", () => {
    const misturados = cabecalhos({
      "x-forwarded-for": "203.0.113.7",
      "x-real-ip": "198.51.100.1",
      "x-vercel-forwarded-for": "198.51.100.2",
      "x-client-ip": "198.51.100.3",
    });

    expect(lerIpConfiavel(misturados, NA_VERCEL)).toBe("203.0.113.7");
  });

  it.each([
    ["ausente", {}],
    ["vazio", { "x-forwarded-for": "" }],
    ["com dois endereços", { "x-forwarded-for": "203.0.113.7, 198.51.100.1" }],
    ["com texto", { "x-forwarded-for": "desconhecido" }],
    ["com porta", { "x-forwarded-for": "203.0.113.7:443" }],
    ["com octeto inválido", { "x-forwarded-for": "203.0.113.256" }],
    ["com nome de host", { "x-forwarded-for": "localhost" }],
  ])("CA-SEG-16 — x-forwarded-for %s devolve null", (_caso, valores) => {
    expect(lerIpConfiavel(cabecalhos(valores), NA_VERCEL)).toBeNull();
  });

  it.each([
    ["sem VERCEL", {}],
    ["com VERCEL vazio", { VERCEL: "" }],
    ["com VERCEL=0", { VERCEL: "0" }],
    ["com VERCEL=true", { VERCEL: "true" }],
  ])("CA-SEG-16 — fora da Vercel (%s), ignora até x-forwarded-for válido", (_caso, ambiente) => {
    expect(lerIpConfiavel(cabecalhos({ "x-forwarded-for": "203.0.113.7" }), ambiente)).toBeNull();
  });

  it("CA-SEG-16 — por padrão lê VERCEL do process.env, ausente nos testes", () => {
    expect(process.env.VERCEL).toBeUndefined();
    expect(lerIpConfiavel(cabecalhos({ "x-forwarded-for": "203.0.113.7" }))).toBeNull();
  });
});
