import type { PrismaClient } from "@prisma/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  LIMITE_ITENS_POR_PESSOA,
  MOTIVOS_SOLICITACAO,
  esquemaEntradaSolicitarEmprestimo,
  esquemaMeuResumo,
  esquemaSaidaSolicitarEmprestimo,
  type EntradaSolicitarEmprestimo,
  type MeuResumo,
  type SaidaSolicitarEmprestimo,
} from "@/lib/esquemas/emprestimos";
import {
  esquemaDetalheEquipamento,
  esquemaEntradaDetalharEquipamento,
  type DetalheEquipamento,
  type EntradaDetalharEquipamento,
} from "@/lib/esquemas/equipamentos";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import {
  MENSAGEM_RESUMO_NAO_IMPLEMENTADO,
  RECUSAS_SOLICITACAO,
} from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const EQUIPAMENTO = "00000000-0000-4000-8000-0000000000e1";
const USUARIO = "00000000-0000-4000-8000-000000000001";

const DETALHE_COLABORADOR = {
  id: EQUIPAMENTO,
  patrimonio: "TI-0001",
  nome: "Notebook Dell Latitude",
  categoria: "notebook",
  imagemUrl: null,
  disponibilidade: { estado: "disponivel" },
  local: null,
  ultimaDevolucao: null,
  devolverAtePrevisto: "2026-11-25",
} as const;

const DETALHE_OPERACOES = {
  ...DETALHE_COLABORADOR,
  numeroSerie: "SN-123",
  observacoes: null,
  historico: [
    {
      retiradoEm: new Date("2026-10-01T12:00:00Z"),
      devolverAte: "2026-10-15",
      devolvidoEm: new Date("2026-10-10T18:00:00Z"),
      tomadorNome: "Ana Souza",
    },
  ],
};

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

describe("contrato de equipamentos.detalhar", () => {
  it("CA-SOLIC-09 — o detalhe de colaborador não traz numeroSerie, observacoes nem historico", () => {
    const detalhe = esquemaDetalheEquipamento.parse(DETALHE_COLABORADOR);

    expect(detalhe).toEqual(DETALHE_COLABORADOR);
    expect(detalhe).not.toHaveProperty("numeroSerie");
    expect(detalhe).not.toHaveProperty("observacoes");
    expect(detalhe).not.toHaveProperty("historico");
  });

  it("CA-SOLIC-09 — o detalhe de Operações aceita numeroSerie, observacoes e historico", () => {
    expect(esquemaDetalheEquipamento.parse(DETALHE_OPERACOES)).toEqual(DETALHE_OPERACOES);
  });

  it.each([
    ["tenantId", { tenantId: TENANT }],
    ["usuarioId", { usuarioId: USUARIO }],
    ["tomador fora do histórico", { tomador: "Ana Souza" }],
  ])("RS-SOLIC-05 — o detalhe recusa o campo extra %s", (_campo, extra) => {
    expect(esquemaDetalheEquipamento.safeParse({ ...DETALHE_COLABORADOR, ...extra }).success).toBe(
      false,
    );
  });

  it("RS-SOLIC-05 — o histórico não carrega identificador do tomador", () => {
    const historico = [{ ...DETALHE_OPERACOES.historico[0], usuarioId: USUARIO }];

    expect(esquemaDetalheEquipamento.safeParse({ ...DETALHE_OPERACOES, historico }).success).toBe(
      false,
    );
  });

  it.each([
    ["prazo previsto fora do formato", { devolverAtePrevisto: "25/11/2026" }],
    ["local vazio", { local: "" }],
    ["id que não é UUID", { id: "TI-0001" }],
  ])("RF-SOLIC-01 — o detalhe recusa %s", (_caso, extra) => {
    expect(esquemaDetalheEquipamento.safeParse({ ...DETALHE_COLABORADOR, ...extra }).success).toBe(
      false,
    );
  });

  it("RS-SOLIC-01 — a entrada aceita só o patrimônio e descarta o tenant", () => {
    expect(
      esquemaEntradaDetalharEquipamento.parse({ patrimonio: "TI-0001", tenantId: TENANT }),
    ).toEqual({ patrimonio: "TI-0001" });
    expect(esquemaEntradaDetalharEquipamento.safeParse({ patrimonio: " " }).success).toBe(false);
  });
});

describe("contrato de emprestimos.solicitar", () => {
  it("RF-SOLIC-02 — a entrada é só o identificador do equipamento", () => {
    expect(
      esquemaEntradaSolicitarEmprestimo.parse({
        equipamentoId: EQUIPAMENTO,
        usuarioId: USUARIO,
        tenantId: TENANT,
        devolverAte: "2030-01-01",
      }),
    ).toEqual({ equipamentoId: EQUIPAMENTO });
  });

  it.each([
    ["sem equipamento", {}],
    ["patrimônio no lugar do id", { equipamentoId: "TI-0001" }],
  ])("RF-SOLIC-02 — a entrada recusa %s", (_caso, entrada) => {
    expect(esquemaEntradaSolicitarEmprestimo.safeParse(entrada).success).toBe(false);
  });

  it("RF-SOLIC-02 — a saída é só id e devolverAte", () => {
    const saida = { id: "00000000-0000-4000-8000-0000000000a1", devolverAte: "2026-11-25" };

    expect(esquemaSaidaSolicitarEmprestimo.parse(saida)).toEqual(saida);
    expect(
      esquemaSaidaSolicitarEmprestimo.safeParse({ ...saida, usuarioId: USUARIO }).success,
    ).toBe(false);
  });

  it("RF-SOLIC-06/RF-REGRAS-04 — os motivos de recusa são os das specs 005 e 006", () => {
    expect(MOTIVOS_SOLICITACAO).toEqual([
      "EQUIPAMENTO_NAO_ENCONTRADO",
      "EQUIPAMENTO_INDISPONIVEL",
      "EQUIPAMENTO_EM_MANUTENCAO",
      "LIMITE_ATINGIDO",
      "ITEM_EM_ATRASO",
    ]);
  });

  it("RF-REGRAS-04 — cada motivo tem código e mensagem de recusa", () => {
    for (const motivo of MOTIVOS_SOLICITACAO) {
      expect(RECUSAS_SOLICITACAO[motivo]).toEqual({
        code: expect.stringMatching(/^(NOT_FOUND|CONFLICT)$/),
        message: expect.stringMatching(/\S/),
      });
    }
  });
});

describe("contrato de emprestimos.meuResumo", () => {
  it("RF-REGRAS-01 — devolve itensAbertos, limite, emAtraso e prazoDias, e nada mais", () => {
    const resumo = { itensAbertos: 2, limite: 3, emAtraso: 0, prazoDias: 14 };

    expect(esquemaMeuResumo.parse(resumo)).toEqual(resumo);
    expect(esquemaMeuResumo.safeParse({ ...resumo, usuarioId: USUARIO }).success).toBe(false);
    expect(esquemaMeuResumo.safeParse({ ...resumo, emAtraso: true }).success).toBe(false);
    expect(esquemaMeuResumo.safeParse({ ...resumo, itensAbertos: -1 }).success).toBe(false);
  });

  it("RN-REGRAS-01 — o limite publicado é 3", () => {
    expect(LIMITE_ITENS_POR_PESSOA).toBe(3);
  });

  it("RF-REGRAS-01 — o AppRouter expõe meuResumo com o tipo do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toContain("emprestimos.meuResumo");
    expectTypeOf<
      inferRouterOutputs<RouterAplicacao>["emprestimos"]["meuResumo"]
    >().toEqualTypeOf<MeuResumo>();
  });

  it("T-REGRAS-01 — sem sessão recusa; com sessão responde NOT_IMPLEMENTED", async () => {
    await expect(caller(null).emprestimos.meuResumo()).rejects.toMatchObject({
      code: "UNAUTHORIZED",
    });
    await expect(caller(USUARIO).emprestimos.meuResumo()).rejects.toMatchObject({
      code: "NOT_IMPLEMENTED",
      message: MENSAGEM_RESUMO_NAO_IMPLEMENTADO,
    });
  });
});

describe("registro no AppRouter", () => {
  it("RF-SOLIC-01/RF-SOLIC-02 — os procedimentos existem com os tipos do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toEqual(
      expect.arrayContaining(["equipamentos.detalhar", "emprestimos.solicitar"]),
    );
    expectTypeOf<
      inferRouterInputs<RouterAplicacao>["equipamentos"]["detalhar"]
    >().toEqualTypeOf<EntradaDetalharEquipamento>();
    expectTypeOf<
      inferRouterOutputs<RouterAplicacao>["equipamentos"]["detalhar"]
    >().toEqualTypeOf<DetalheEquipamento>();
    expectTypeOf<
      inferRouterInputs<RouterAplicacao>["emprestimos"]["solicitar"]
    >().toEqualTypeOf<EntradaSolicitarEmprestimo>();
    expectTypeOf<
      inferRouterOutputs<RouterAplicacao>["emprestimos"]["solicitar"]
    >().toEqualTypeOf<SaidaSolicitarEmprestimo>();
  });

  it("RS-SOLIC-01 — sem sessão os dois procedimentos recusam", async () => {
    await expect(
      caller(null).equipamentos.detalhar({ patrimonio: "TI-0001" }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      caller(null).emprestimos.solicitar({ equipamentoId: EQUIPAMENTO }),
    ).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
