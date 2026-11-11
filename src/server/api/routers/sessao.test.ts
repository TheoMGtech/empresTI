import { PapelMembership } from "@prisma/client";
import type { inferRouterOutputs } from "@trpc/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import { PAPEIS, esquemaSessaoAtual, type SessaoAtual } from "@/lib/esquemas/sessao";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import { MENSAGEM_NAO_IMPLEMENTADO } from "@/server/api/routers/sessao";

function criarCaller() {
  return routerAplicacao.createCaller({
    obterClientePrisma: () => {
      throw new Error("Prisma não usado neste teste.");
    },
    obterClienteSupabase: async () => {
      throw new Error("Supabase não usado neste teste.");
    },
  });
}

describe("contrato de sessao.atual", () => {
  it("CA-SESSAO-05 — aceita só nomeExibicao e papel", () => {
    expect(esquemaSessaoAtual.parse({ nomeExibicao: "Ana", papel: "colaborador" })).toEqual({
      nomeExibicao: "Ana",
      papel: "colaborador",
    });
    expect(esquemaSessaoAtual.parse({ nomeExibicao: null, papel: "operacoes" })).toEqual({
      nomeExibicao: null,
      papel: "operacoes",
    });
  });

  it.each([
    ["tenantId", { tenantId: "tenant-1" }],
    ["email", { email: "ana@empresa.com" }],
    ["usuarioId", { usuarioId: "usuario-1" }],
  ])("CA-SESSAO-05 — recusa o campo extra %s", (_campo, extra) => {
    expect(
      esquemaSessaoAtual.safeParse({ nomeExibicao: "Ana", papel: "colaborador", ...extra })
        .success,
    ).toBe(false);
  });

  it.each([
    ["papel desconhecido", { nomeExibicao: "Ana", papel: "admin" }],
    ["nome vazio", { nomeExibicao: "   ", papel: "colaborador" }],
    ["sem papel", { nomeExibicao: "Ana" }],
    ["sem nomeExibicao", { papel: "colaborador" }],
  ])("CA-SESSAO-05 — recusa %s", (_caso, valor) => {
    expect(esquemaSessaoAtual.safeParse(valor).success).toBe(false);
  });

  it("RN-SESSAO-01 — os papéis do contrato são os do enum PapelMembership", () => {
    expect([...PAPEIS].sort()).toEqual(Object.values(PapelMembership).sort());
  });

  it("CA-SESSAO-05 — o AppRouter expõe sessao.atual com o tipo do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toContain("sessao.atual");
    expectTypeOf<inferRouterOutputs<RouterAplicacao>["sessao"]["atual"]>().toEqualTypeOf<
      SessaoAtual
    >();
  });

  it("T-SESSAO-02 — responde NOT_IMPLEMENTED sem inventar identidade", async () => {
    await expect(criarCaller().sessao.atual()).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      message: MENSAGEM_NAO_IMPLEMENTADO,
    });
  });
});
