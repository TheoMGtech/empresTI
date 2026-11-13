// @vitest-environment node
//
// Spec 009 (T-SEG-06): identificadores HMAC-SHA-256 por escopo (CA-SEG-13, RS-SEG-01), e-mail
// normalizado (RN-SEG-05), `<tenant_id>:<usuario_id>` nas mutações (RN-SEG-09) e o identificador
// compartilhado sem IP confiável (CA-SEG-16, P3).
import { createHash, createHmac } from "node:crypto";

import { afterEach, describe, expect, it, vi } from "vitest";

import { ErroLimiteIndisponivel } from "@/server/services/erros-limite";
import {
  identificador,
  identificadoresLogin,
  identificadoresMutacao,
  IP_INDISPONIVEL,
  normalizarEmail,
  type EscopoLimite,
} from "@/server/services/identificadores-limite";

const CHAVE = "chave-hmac-do-teste-de-identificadores-000";
const OUTRA_CHAVE = "outra-chave-hmac-do-teste-de-identificadores";
const HEX_64 = /^[0-9a-f]{64}$/;
const ESCOPOS: EscopoLimite[] = ["login_ip", "login_email", "mutacao_ip", "mutacao_usuario"];

const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";

function hmacEsperado(mensagem: string, chave = CHAVE) {
  return createHmac("sha256", chave).update(mensagem).digest("hex");
}

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("identificador", () => {
  it.each(ESCOPOS)("CA-SEG-13 — %s gera hex de 64 caracteres igual ao HMAC com a chave", (escopo) => {
    const valor = "203.0.113.7";

    const gerado = identificador(escopo, valor, CHAVE);

    expect(gerado).toMatch(HEX_64);
    expect(gerado).toBe(hmacEsperado(`${escopo}:${valor}`));
  });

  it("CA-SEG-13 — é diferente do SHA-256 sem chave", () => {
    const mensagem = "login_email:pessoa@exemplo.com";

    expect(identificador("login_email", "pessoa@exemplo.com", CHAVE)).not.toBe(
      createHash("sha256").update(mensagem).digest("hex"),
    );
  });

  it("CA-SEG-13 — muda com a chave", () => {
    expect(identificador("login_ip", "203.0.113.7", CHAVE)).not.toBe(
      identificador("login_ip", "203.0.113.7", OUTRA_CHAVE),
    );
  });

  it("CA-SEG-13 — o mesmo valor gera identificadores diferentes em escopos diferentes", () => {
    const gerados = ESCOPOS.map((escopo) => identificador(escopo, "203.0.113.7", CHAVE));

    expect(new Set(gerados).size).toBe(ESCOPOS.length);
  });

  it("CA-SEG-13 — não contém o valor em claro", () => {
    const gerado = identificador("login_email", "pessoa@exemplo.com", CHAVE);

    expect(gerado).not.toContain("pessoa");
    expect(gerado).not.toContain("exemplo");
  });

  it("CA-SEG-13 — sem chave informada, usa CHAVE_HMAC_LIMITES do ambiente", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    expect(identificador("login_ip", "203.0.113.7")).toBe(hmacEsperado("login_ip:203.0.113.7"));
  });

  it("CA-SEG-12 — sem CHAVE_HMAC_LIMITES, lança ErroLimiteIndisponivel", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", undefined);

    expect(() => identificador("login_ip", "203.0.113.7")).toThrow(ErroLimiteIndisponivel);
    expect(() => identificadoresLogin({ email: "a@b.com", ip: null })).toThrow(
      ErroLimiteIndisponivel,
    );
    expect(() =>
      identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null }),
    ).toThrow(ErroLimiteIndisponivel);
  });
});

describe("normalizarEmail", () => {
  it.each([
    ["  Pessoa@Exemplo.COM  ", "pessoa@exemplo.com"],
    ["pessoa@exemplo.com", "pessoa@exemplo.com"],
    ["\tPESSOA@EXEMPLO.COM\n", "pessoa@exemplo.com"],
  ])("CA-SEG-08/RN-SEG-05 — %j vira %j", (entrada, esperado) => {
    expect(normalizarEmail(entrada)).toBe(esperado);
  });
});

describe("identificadoresLogin", () => {
  it("CA-SEG-13 — gera os HMAC de login_ip e login_email com o e-mail normalizado", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    expect(identificadoresLogin({ email: "  Pessoa@Exemplo.COM ", ip: "203.0.113.7" })).toEqual({
      login_ip: hmacEsperado("login_ip:203.0.113.7"),
      login_email: hmacEsperado("login_email:pessoa@exemplo.com"),
    });
  });

  it("CA-SEG-08/RN-SEG-05 — variações de caixa e espaço do mesmo e-mail geram o mesmo identificador", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    const a = identificadoresLogin({ email: "Pessoa@Exemplo.com", ip: null });
    const b = identificadoresLogin({ email: " pessoa@exemplo.COM ", ip: null });

    expect(a.login_email).toBe(b.login_email);
  });

  it("CA-SEG-16 — sem IP confiável, pessoas diferentes dividem o mesmo login_ip", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    const a = identificadoresLogin({ email: "a@exemplo.com", ip: null });
    const b = identificadoresLogin({ email: "b@exemplo.com", ip: null });

    expect(a.login_ip).toBe(b.login_ip);
    expect(a.login_ip).toBe(hmacEsperado(`login_ip:${IP_INDISPONIVEL}`));
    expect(a.login_email).not.toBe(b.login_email);
  });
});

describe("identificadoresMutacao", () => {
  it("CA-SEG-13 — gera os HMAC de mutacao_ip e de <tenant_id>:<usuario_id>", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    expect(
      identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: "2001:db8::1" }),
    ).toEqual({
      mutacao_ip: hmacEsperado("mutacao_ip:2001:db8::1"),
      mutacao_usuario: hmacEsperado(`mutacao_usuario:${TENANT}:${USUARIO}`),
    });
  });

  it("RN-SEG-09 — o mesmo usuário em outro tenant tem outro contador", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);
    const outroTenant = "00000000-0000-4000-8000-00000000000b";

    expect(
      identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null }).mutacao_usuario,
    ).not.toBe(
      identificadoresMutacao({ tenantId: outroTenant, usuarioId: USUARIO, ip: null })
        .mutacao_usuario,
    );
  });

  it("CA-SEG-16 — sem IP confiável, usuários diferentes dividem o mesmo mutacao_ip", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);
    const outroUsuario = "00000000-0000-4000-8000-000000000002";

    const a = identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: null });
    const b = identificadoresMutacao({ tenantId: TENANT, usuarioId: outroUsuario, ip: null });

    expect(a.mutacao_ip).toBe(b.mutacao_ip);
    expect(a.mutacao_ip).toBe(hmacEsperado(`mutacao_ip:${IP_INDISPONIVEL}`));
    expect(a.mutacao_usuario).not.toBe(b.mutacao_usuario);
  });

  it("CA-SEG-13 — login_ip e mutacao_ip do mesmo IP são contadores diferentes", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", CHAVE);

    expect(identificadoresLogin({ email: "a@b.com", ip: "203.0.113.7" }).login_ip).not.toBe(
      identificadoresMutacao({ tenantId: TENANT, usuarioId: USUARIO, ip: "203.0.113.7" })
        .mutacao_ip,
    );
  });
});
