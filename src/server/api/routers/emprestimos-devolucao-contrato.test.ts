import type { PrismaClient } from "@prisma/client";
import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { describe, expect, expectTypeOf, it } from "vitest";

import {
  MOTIVOS_DEVOLUCAO,
  esquemaEmprestimoAberto,
  esquemaEmprestimoEncerrado,
  esquemaEntradaDevolver,
  esquemaEntradaHistorico,
  esquemaSaidaDevolver,
  esquemaSaidaHistorico,
  type EmprestimoAberto,
  type EntradaDevolver,
  type EntradaHistorico,
  type SaidaDevolver,
  type SaidaHistorico,
} from "@/lib/esquemas/emprestimos";
import { routerAplicacao, type RouterAplicacao } from "@/server/api/raiz";
import { MENSAGEM_DEVOLUCAO_NAO_IMPLEMENTADA } from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";

const TENANT = "00000000-0000-4000-8000-00000000000a";
const USUARIO = "00000000-0000-4000-8000-000000000001";
const EMPRESTIMO = "00000000-0000-4000-8000-0000000000a1";

const EQUIPAMENTO = {
  patrimonio: "TI-0001",
  nome: "Notebook Dell Latitude",
  categoria: "notebook",
  imagemUrl: null,
} as const;

const ABERTO = {
  id: EMPRESTIMO,
  equipamento: EQUIPAMENTO,
  retiradoEm: new Date("2026-11-11T15:00:00Z"),
  devolverAte: "2026-11-25",
  emAtraso: false,
};

const ENCERRADO = {
  id: EMPRESTIMO,
  equipamento: EQUIPAMENTO,
  retiradoEm: new Date("2026-10-01T15:00:00Z"),
  devolverAte: "2026-10-15",
  devolvidoEm: new Date("2026-10-14T18:00:00Z"),
  noPrazo: true,
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

describe("contrato de emprestimos.meus", () => {
  it("RF-DEVOL-01 — o item aberto tem equipamento, datas e atraso, e nada da pessoa", () => {
    expect(esquemaEmprestimoAberto.parse(ABERTO)).toEqual(ABERTO);
    for (const extra of [{ userId: USUARIO }, { tenantId: TENANT }, { tomador: "Ana" }]) {
      expect(esquemaEmprestimoAberto.safeParse({ ...ABERTO, ...extra }).success).toBe(false);
    }
    expect(
      esquemaEmprestimoAberto.safeParse({ ...ABERTO, equipamento: { ...EQUIPAMENTO, id: "x" } })
        .success,
    ).toBe(false);
  });
});

describe("contrato de emprestimos.historico", () => {
  it("RF-DEVOL-02 — a página tem itens encerrados e proximoCursor", () => {
    const saida = { itens: [ENCERRADO], proximoCursor: null };

    expect(esquemaSaidaHistorico.parse(saida)).toEqual(saida);
    expect(esquemaEmprestimoEncerrado.safeParse({ ...ENCERRADO, devolvidoEm: null }).success).toBe(
      false,
    );
  });

  it("RF-DEVOL-02 — a entrada aceita cursor e limite, e descarta a pessoa", () => {
    expect(
      esquemaEntradaHistorico.parse({ cursor: EMPRESTIMO, limite: 10, usuarioId: USUARIO }),
    ).toEqual({ cursor: EMPRESTIMO, limite: 10 });
    expect(esquemaEntradaHistorico.parse({})).toEqual({});
    expect(esquemaEntradaHistorico.safeParse({ cursor: "TI-0001" }).success).toBe(false);
    expect(esquemaEntradaHistorico.safeParse({ limite: 0 }).success).toBe(false);
  });
});

describe("contrato de emprestimos.devolver", () => {
  it("RF-DEVOL-03 — a entrada é só o empréstimo, e a saída é id e devolvidoEm", () => {
    expect(
      esquemaEntradaDevolver.parse({
        emprestimoId: EMPRESTIMO,
        usuarioId: USUARIO,
        tenantId: TENANT,
      }),
    ).toEqual({ emprestimoId: EMPRESTIMO });
    const saida = { id: EMPRESTIMO, devolvidoEm: new Date() };
    expect(esquemaSaidaDevolver.parse(saida)).toEqual(saida);
  });

  it("RF-DEVOL-07 — o motivo de recusa é EMPRESTIMO_JA_ENCERRADO", () => {
    expect(MOTIVOS_DEVOLUCAO).toEqual(["EMPRESTIMO_JA_ENCERRADO"]);
  });
});

describe("registro no AppRouter", () => {
  it("RF-DEVOL-01/02/03 — os procedimentos existem com os tipos do contrato", () => {
    expect(Object.keys(routerAplicacao._def.procedures)).toEqual(
      expect.arrayContaining(["emprestimos.meus", "emprestimos.historico", "emprestimos.devolver"]),
    );
    type Entradas = inferRouterInputs<RouterAplicacao>["emprestimos"];
    type Saidas = inferRouterOutputs<RouterAplicacao>["emprestimos"];
    expectTypeOf<Saidas["meus"]>().toEqualTypeOf<EmprestimoAberto[]>();
    expectTypeOf<Entradas["historico"]>().toEqualTypeOf<EntradaHistorico>();
    expectTypeOf<Saidas["historico"]>().toEqualTypeOf<SaidaHistorico>();
    expectTypeOf<Entradas["devolver"]>().toEqualTypeOf<EntradaDevolver>();
    expectTypeOf<Saidas["devolver"]>().toEqualTypeOf<SaidaDevolver>();
  });

  it("RS-DEVOL-01 — sem sessão os três recusam", async () => {
    const semSessao = caller(null).emprestimos;
    for (const chamada of [
      () => semSessao.meus(),
      () => semSessao.historico({}),
      () => semSessao.devolver({ emprestimoId: EMPRESTIMO }),
    ]) {
      await expect(chamada()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
  });

  it("T-DEVOL-01 — com sessão respondem NOT_IMPLEMENTED sem inventar dados", async () => {
    const comSessao = caller(USUARIO).emprestimos;
    for (const chamada of [
      () => comSessao.meus(),
      () => comSessao.historico({}),
      () => comSessao.devolver({ emprestimoId: EMPRESTIMO }),
    ]) {
      await expect(chamada()).rejects.toMatchObject({
        code: "NOT_IMPLEMENTED",
        message: MENSAGEM_DEVOLUCAO_NAO_IMPLEMENTADA,
      });
    }
  });
});
