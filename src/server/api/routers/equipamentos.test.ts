import { CategoriaEquipamento, type PrismaClient } from "@prisma/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  CATEGORIAS,
  LIMITE_MAXIMO_LISTAGEM,
  esquemaEntradaListarEquipamentos,
  esquemaItemCatalogo,
  esquemaSaidaListarEquipamentos,
  type EntradaListarEquipamentos,
  type SaidaListarEquipamentos,
} from "@/lib/esquemas/equipamentos";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import { MENSAGEM_LISTAGEM_NAO_IMPLEMENTADA } from "@/server/api/routers/equipamentos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const URL_FOTO =
  "https://wdudlqacomnasnrxgbni.supabase.co/storage/v1/object/public/equipamentos/x.jpg";

const ITEM = {
  patrimonio: "TI-0001",
  nome: "Notebook Dell Latitude",
  categoria: "notebook",
  imagemUrl: URL_FOTO,
  disponibilidade: { estado: "disponivel" },
} as const;

function caller(usuarioId: string | null) {
  return routerAplicacao.createCaller({
    obterClientePrisma: () =>
      ({
        membership: {
          findMany: async () => (usuarioId ? [{ tenantId: TENANT, role: "colaborador" }] : []),
        },
      }) as unknown as PrismaClient,
    obterClienteSupabase: async () =>
      ({
        auth: {
          getUser: async () => ({
            data: { user: usuarioId ? { id: usuarioId } : null },
            error: null,
          }),
        },
      }) as unknown as ClienteSupabaseAutenticacao,
  });
}

describe("contrato de equipamentos.listar", () => {
  it("CA-CATALOGO-10 — item aceita só os campos do catálogo", () => {
    expect(esquemaItemCatalogo.parse(ITEM)).toEqual(ITEM);
    expect(esquemaItemCatalogo.parse({ ...ITEM, imagemUrl: null }).imagemUrl).toBeNull();
  });

  it.each([
    ["nome do tomador", { tomador: "Ana Souza" }],
    ["nomeTomador", { nomeTomador: "Ana Souza" }],
    ["usuarioId", { usuarioId: "00000000-0000-4000-8000-000000000001" }],
    ["tenantId", { tenantId: TENANT }],
    ["id interno", { id: "00000000-0000-4000-8000-000000000009" }],
  ])("CA-CATALOGO-10 — item recusa o campo extra %s", (_campo, extra) => {
    expect(esquemaItemCatalogo.safeParse({ ...ITEM, ...extra }).success).toBe(false);
  });

  it("CA-CATALOGO-10 — disponibilidade emprestada não carrega o tomador", () => {
    const emprestado = { estado: "emprestado", devolverAte: "2026-11-25" };

    expect(esquemaItemCatalogo.parse({ ...ITEM, disponibilidade: emprestado })).toMatchObject({
      disponibilidade: emprestado,
    });
    expect(
      esquemaItemCatalogo.safeParse({
        ...ITEM,
        disponibilidade: { ...emprestado, tomador: "Ana Souza" },
      }).success,
    ).toBe(false);
  });

  it.each([
    ["estado desconhecido", { estado: "reservado" }],
    ["emprestado sem data", { estado: "emprestado" }],
    ["data em outro formato", { estado: "emprestado", devolverAte: "25/11/2026" }],
  ])("RN-CATALOGO-01 — recusa disponibilidade com %s", (_caso, disponibilidade) => {
    expect(esquemaItemCatalogo.safeParse({ ...ITEM, disponibilidade }).success).toBe(false);
  });

  it("RN-CATALOGO-01 — aceita as quatro variantes de disponibilidade", () => {
    for (const disponibilidade of [
      { estado: "disponivel" },
      { estado: "emprestado", devolverAte: "2026-11-25" },
      { estado: "manutencao" },
      { estado: "fora_de_uso" },
    ]) {
      expect(esquemaItemCatalogo.safeParse({ ...ITEM, disponibilidade }).success).toBe(true);
    }
  });

  it("RF-CATALOGO-01 — a saída tem itens, proximoCursor e resumo, e nada mais", () => {
    const saida = { itens: [ITEM], proximoCursor: null, resumo: { total: 12, disponiveis: 10 } };

    expect(esquemaSaidaListarEquipamentos.parse(saida)).toEqual(saida);
    expect(esquemaSaidaListarEquipamentos.safeParse({ ...saida, tomadores: [] }).success).toBe(
      false,
    );
  });

  it("RS-CATALOGO-01 — tenantId no input é descartado", () => {
    expect(esquemaEntradaListarEquipamentos.parse({ categoria: "cabo", tenantId: TENANT })).toEqual(
      { categoria: "cabo" },
    );
  });

  it.each([
    ["categoria desconhecida", { categoria: "impressora" }],
    ["limite zero", { limite: 0 }],
    ["limite acima do máximo", { limite: LIMITE_MAXIMO_LISTAGEM + 1 }],
    ["limite fracionário", { limite: 2.5 }],
    ["cursor vazio", { cursor: " " }],
    ["somenteDisponiveis como texto", { somenteDisponiveis: "sim" }],
  ])("RS-CATALOGO-02 — entrada recusa %s", (_caso, entrada) => {
    expect(esquemaEntradaListarEquipamentos.safeParse(entrada).success).toBe(false);
  });

  it("RS-CATALOGO-02 — entrada vazia é válida", () => {
    expect(esquemaEntradaListarEquipamentos.parse({})).toEqual({});
  });

  it("RF-CATALOGO-04 — as categorias do contrato são as do enum CategoriaEquipamento", () => {
    expect([...CATEGORIAS].sort()).toEqual(Object.values(CategoriaEquipamento).sort());
  });

  it("RF-CATALOGO-01 — o AppRouter expõe equipamentos.listar com os tipos do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toContain("equipamentos.listar");
    expectTypeOf<
      inferRouterInputs<RouterAplicacao>["equipamentos"]["listar"]
    >().toEqualTypeOf<EntradaListarEquipamentos>();
    expectTypeOf<
      inferRouterOutputs<RouterAplicacao>["equipamentos"]["listar"]
    >().toEqualTypeOf<SaidaListarEquipamentos>();
  });

  it("CA-CATALOGO-03 — sem sessão recusa antes de responder", async () => {
    await expect(caller(null).equipamentos.listar({})).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
  });

  it("T-CATALOGO-01 — com sessão e membership responde NOT_IMPLEMENTED sem inventar dados", async () => {
    await expect(
      caller("00000000-0000-4000-8000-000000000001").equipamentos.listar({}),
    ).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      message: MENSAGEM_LISTAGEM_NAO_IMPLEMENTADA,
    });
  });
});
