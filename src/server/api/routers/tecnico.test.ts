import { describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import type { PrismaClient } from "@prisma/client";

describe("router técnico", () => {
  it("AZ-05/AZ-06 — responde pelo createCaller com a fundação vinculada", async () => {
    const clientePrisma = {
      saudeSistema: {
        count: async () => 0,
      },
    } as unknown as PrismaClient;
    const caller = routerAplicacao.createCaller({
      obterClientePrisma: () => clientePrisma,
    });

    const resposta = await caller.tecnico.status();

    expect(resposta).toMatchObject({
      bancoOperacional: true,
      quantidadeRegistros: 0,
      supabaseVinculado: true,
      versao: "0.1.0",
    });
    expect(new Date(resposta.verificadoEm).toString()).not.toBe("Invalid Date");
  });
});
