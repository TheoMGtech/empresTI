import { afterEach, describe, expect, it, vi } from "vitest";

import { lerAmbientePublico } from "@/env";

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
