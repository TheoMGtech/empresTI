import { afterEach, describe, expect, it, vi } from "vitest";

import { lerAmbientePublico, lerChaveHmacLimites } from "@/env";
import { ErroLimiteIndisponivel } from "@/server/services/erros-limite";

const CHAVE_PUBLICA = "chave-publica-de-teste-sem-credencial-real";

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("ambiente público do Supabase", () => {
  it("T-LOGIN-01/RS-LOGIN-01 — expõe apenas URLs e chave publishable", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", CHAVE_PUBLICA);
    vi.stubEnv("SUPABASE_SERVICE_ROLE_KEY", "valor-exclusivo-do-servidor");
    vi.stubEnv("DATABASE_URL", "postgresql://usuario:senha@localhost:5432/postgres");

    const ambiente = lerAmbientePublico();

    expect(Object.keys(ambiente).sort()).toEqual([
      "NEXT_PUBLIC_APP_URL",
      "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
      "NEXT_PUBLIC_SUPABASE_URL",
    ]);
    expect(ambiente.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY).toBe(CHAVE_PUBLICA);
  });

  it("T-LOGIN-01 — usa o projeto oficial quando a URL não é informada", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", undefined);

    expect(lerAmbientePublico().NEXT_PUBLIC_SUPABASE_URL).toBe(
      "https://wdudlqacomnasnrxgbni.supabase.co",
    );
  });

  it("T-LOGIN-01 — rejeita URL fora do domínio Supabase", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://exemplo.com");

    expect(() => lerAmbientePublico()).toThrow(
      "NEXT_PUBLIC_SUPABASE_URL deve apontar para um projeto Supabase.",
    );
  });

  it("T-LOGIN-01 — rejeita chave publishable ausente ou curta", () => {
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", undefined);
    expect(() => lerAmbientePublico()).toThrow();

    vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "curta");
    expect(() => lerAmbientePublico()).toThrow();
  });
});

describe("chave HMAC dos limites (Spec 009)", () => {
  it("CA-SEG-13 — devolve a chave com 32 caracteres ou mais", () => {
    const chave = "k".repeat(32);
    vi.stubEnv("CHAVE_HMAC_LIMITES", chave);

    expect(lerChaveHmacLimites()).toBe(chave);
  });

  it.each([
    ["ausente", undefined],
    ["vazia", ""],
    ["com 31 caracteres", "k".repeat(31)],
  ])("CA-SEG-12 — chave %s deixa o limitador indisponível, sem expor o valor", (_caso, valor) => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", valor);

    let erro: unknown;
    try {
      lerChaveHmacLimites();
    } catch (capturado) {
      erro = capturado;
    }

    expect(erro).toBeInstanceOf(ErroLimiteIndisponivel);
    expect((erro as Error).message).toBe("Limitador de requisições indisponível.");
    if (valor) expect((erro as Error).message).not.toContain(valor);
  });

  it("RS-SEG-02 — a chave não entra no ambiente público", () => {
    vi.stubEnv("CHAVE_HMAC_LIMITES", "k".repeat(40));

    expect(JSON.stringify(lerAmbientePublico())).not.toContain("k".repeat(40));
    expect(Object.keys(lerAmbientePublico())).not.toContain("CHAVE_HMAC_LIMITES");
  });
});
