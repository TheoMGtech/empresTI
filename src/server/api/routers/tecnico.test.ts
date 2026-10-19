import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";

describe("router técnico", () => {
  it("AZ-05/AZ-06 — responde pelo createCaller com a fundação vinculada", async () => {
    const caller = routerAplicacao.createCaller({});

    const resposta = await caller.tecnico.status();

    expect(resposta).toMatchObject({
      supabaseVinculado: true,
      versao: "0.1.0",
    });
    expect(new Date(resposta.verificadoEm).toString()).not.toBe("Invalid Date");
  });
});
