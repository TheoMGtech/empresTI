// @vitest-environment node
// T-REGRAS-03: bloqueio por atraso e `emprestimos.meuResumo`, com Postgres real e datas fixas.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import { RECUSAS_SOLICITACAO } from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ErroSolicitacao,
  consultarMeuResumo,
  solicitarEmprestimo,
} from "@/server/services/emprestimos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const PESSOA = "00000000-0000-4000-8000-000000000001";
const OUTRA_PESSOA = "00000000-0000-4000-8000-000000000002";
const OPERACOES = "00000000-0000-4000-8000-000000000003";

type Contexto = {
  prisma: PrismaClient;
  cliente: Client;
  tenantId: string;
  ids: Record<string, string>;
  /** Grava um empréstimo direto no banco, como fixture (CA-REGRAS-05). */
  gravar: (dados: {
    patrimonio: string;
    usuario?: string;
    retirado: string;
    devolverAte: string;
    devolvido?: string;
  }) => Promise<void>;
};

let banco: BancoReal;

async function comAmbiente<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await executarCargaDoManifesto(prisma);
    const { rows: tenants } = await cliente.query<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = 'suporte_ti'",
    );
    const tenantId = tenants[0]?.id as string;
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $4, 'colaborador'), ($3, $4, 'operacoes')`,
      [PESSOA, OUTRA_PESSOA, OPERACOES, tenantId],
    );
    const { rows } = await cliente.query<{ id: string; patrimonio: string }>(
      "SELECT id, patrimonio FROM equipamentos",
    );
    const ids = Object.fromEntries(rows.map((linha) => [linha.patrimonio, linha.id]));

    const gravar: Contexto["gravar"] = async (dados) => {
      await cliente.query(
        `INSERT INTO emprestimos
           (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
         VALUES ($1, $2, $3, $4::timestamptz, $5::date, $6::timestamptz, $7)`,
        [
          tenantId,
          ids[dados.patrimonio],
          dados.usuario ?? PESSOA,
          dados.retirado,
          dados.devolverAte,
          dados.devolvido ?? null,
          dados.devolvido ? OPERACOES : null,
        ],
      );
    };

    return await acao({ prisma, cliente, tenantId, ids, gravar });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

function como(prisma: PrismaClient, usuarioId: string | null) {
  const supabase = {
    auth: {
      getUser: async () => ({ data: { user: usuarioId ? { id: usuarioId } : null }, error: null }),
    },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
}

async function contar(cliente: Client, tabela: string) {
  const { rows } = await cliente.query<{ n: number }>(`SELECT count(*)::int AS n FROM ${tabela}`);
  return rows[0]?.n;
}

const recusa = (motivo: "ITEM_EM_ATRASO" | "LIMITE_ATINGIDO") => ({
  ...RECUSAS_SOLICITACAO[motivo],
  cause: { motivo },
});

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("bloqueio por atraso", () => {
  it("CA-REGRAS-04 — quem tem item em atraso é recusado com ITEM_EM_ATRASO, mesmo abaixo do limite", async () => {
    await comAmbiente(async ({ prisma, cliente, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });
      const auditoriaAntes = await contar(cliente, "auditoria");

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0002"] as string }),
      ).rejects.toMatchObject(recusa("ITEM_EM_ATRASO"));
      expect(await contar(cliente, "emprestimos")).toBe(1);
      expect(await contar(cliente, "auditoria")).toBe(auditoriaAntes);
    });
  });

  it("CA-REGRAS-05 — empréstimo vencido com devolvido_em preenchido não bloqueia", async () => {
    await comAmbiente(async ({ prisma, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
        devolvido: "2026-02-10T12:00:00Z",
      });

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0002"] as string }),
      ).resolves.toMatchObject({ devolverAte: expect.any(String) });
    });
  });

  it("CA-REGRAS-04 — o atraso vem antes do limite (ordem da Spec 006)", async () => {
    await comAmbiente(async ({ prisma, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });
      await gravar({
        patrimonio: "TI-0002",
        retirado: "2030-01-01T12:00:00Z",
        devolverAte: "2030-01-15",
      });
      await gravar({
        patrimonio: "TI-0003",
        retirado: "2030-01-01T12:00:00Z",
        devolverAte: "2030-01-15",
      });

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0005"] as string }),
      ).rejects.toMatchObject(recusa("ITEM_EM_ATRASO"));
    });
  });

  it("CA-REGRAS-04 — o atraso vem antes das recusas de equipamento", async () => {
    await comAmbiente(async ({ prisma, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0004"] as string }),
      ).rejects.toMatchObject(recusa("ITEM_EM_ATRASO"));
    });
  });

  it("RS-REGRAS-02 — o atraso de uma pessoa não bloqueia outra", async () => {
    await comAmbiente(async ({ prisma, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });

      await expect(
        como(prisma, OUTRA_PESSOA).emprestimos.solicitar({
          equipamentoId: ids["TI-0002"] as string,
        }),
      ).resolves.toBeDefined();
    });
  });

  it("RN-REGRAS-05 — com três itens, um deles vencido, a recusa é por atraso e nada passa de 3", async () => {
    await comAmbiente(async ({ prisma, cliente, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });
      await gravar({
        patrimonio: "TI-0002",
        retirado: "2030-01-01T12:00:00Z",
        devolverAte: "2030-01-15",
      });

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0003"] as string }),
      ).rejects.toMatchObject(recusa("ITEM_EM_ATRASO"));
      expect(await contar(cliente, "emprestimos")).toBe(2);
    });
  });

  it("CA-REGRAS-08 — a chamada direta ao procedimento também é recusada", async () => {
    await comAmbiente(async ({ prisma, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });

      await expect(
        como(prisma, PESSOA).emprestimos.solicitar({ equipamentoId: ids["TI-0009"] as string }),
      ).rejects.toMatchObject({ code: "CONFLICT", cause: { motivo: "ITEM_EM_ATRASO" } });
    });
  });
});

describe("vencimento no fuso de São Paulo", () => {
  // Vence em 20/11/2026. O atraso começa às 00:00 de 21/11 em São Paulo (03:00 UTC).
  const VENCIMENTO = "2026-11-20";

  it.each([
    ["no próprio dia do vencimento, à tarde", "2026-11-20T18:00:00Z", 0],
    ["no último segundo do dia em São Paulo", "2026-11-21T02:59:59Z", 0],
    ["no primeiro segundo do dia seguinte em São Paulo", "2026-11-21T03:00:00Z", 1],
    ["no dia seguinte, à tarde", "2026-11-21T18:00:00Z", 1],
  ])("CA-REGRAS-09 — %s: emAtraso = %i", async (_caso, agora, esperado) => {
    await comAmbiente(async ({ prisma, tenantId, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-11-06T12:00:00Z",
        devolverAte: VENCIMENTO,
      });

      await expect(
        consultarMeuResumo(prisma, { tenantId, usuarioId: PESSOA }, { agora: new Date(agora) }),
      ).resolves.toMatchObject({ itensAbertos: 1, emAtraso: esperado });
    });
  });

  it.each([
    ["último segundo do dia de vencimento", "2026-11-21T02:59:59Z", null],
    ["primeiro segundo do dia seguinte", "2026-11-21T03:00:00Z", "ITEM_EM_ATRASO"],
  ])("CA-REGRAS-09 — solicitar no %s", async (_caso, agora, motivo) => {
    await comAmbiente(async ({ prisma, tenantId, ids, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-11-06T12:00:00Z",
        devolverAte: VENCIMENTO,
      });

      const resultado = await solicitarEmprestimo(
        prisma,
        { tenantId, usuarioId: PESSOA, papel: "colaborador" },
        ids["TI-0002"] as string,
        { agora: new Date(agora) },
      ).catch((falha: unknown) => falha);

      if (motivo === null) {
        expect(resultado).toMatchObject({ devolverAte: "2026-12-04" });
      } else {
        expect(resultado).toBeInstanceOf(ErroSolicitacao);
        expect(resultado).toMatchObject({ motivo });
      }
    });
  });
});

describe("emprestimos.meuResumo", () => {
  it("RF-REGRAS-01 — sem empréstimos, devolve zero itens, limite 3 e prazo de 14 dias", async () => {
    await comAmbiente(async ({ prisma }) => {
      await expect(como(prisma, PESSOA).emprestimos.meuResumo()).resolves.toEqual({
        itensAbertos: 0,
        limite: 3,
        emAtraso: 0,
        prazoDias: 14,
      });
    });
  });

  it("RN-REGRAS-05 — conta abertos com os atrasados e ignora os devolvidos", async () => {
    await comAmbiente(async ({ prisma, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });
      await gravar({
        patrimonio: "TI-0002",
        retirado: "2030-01-01T12:00:00Z",
        devolverAte: "2030-01-15",
      });
      await gravar({
        patrimonio: "TI-0003",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
        devolvido: "2026-01-10T12:00:00Z",
      });

      await expect(como(prisma, PESSOA).emprestimos.meuResumo()).resolves.toEqual({
        itensAbertos: 2,
        limite: 3,
        emAtraso: 1,
        prazoDias: 14,
      });
    });
  });

  it("RS-REGRAS-02 — o resumo é da própria pessoa", async () => {
    await comAmbiente(async ({ prisma, gravar }) => {
      await gravar({
        patrimonio: "TI-0001",
        retirado: "2026-01-01T12:00:00Z",
        devolverAte: "2026-01-15",
      });
      await gravar({
        patrimonio: "TI-0002",
        usuario: OUTRA_PESSOA,
        retirado: "2030-01-01T12:00:00Z",
        devolverAte: "2030-01-15",
      });

      await expect(como(prisma, OUTRA_PESSOA).emprestimos.meuResumo()).resolves.toMatchObject({
        itensAbertos: 1,
        emAtraso: 0,
      });
      await expect(como(prisma, OPERACOES).emprestimos.meuResumo()).resolves.toMatchObject({
        itensAbertos: 0,
        emAtraso: 0,
      });
    });
  });

  it("RF-REGRAS-01 — o resumo acompanha a solicitação feita pelo procedimento", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      const caller = como(prisma, PESSOA);
      await caller.emprestimos.solicitar({ equipamentoId: ids["TI-0001"] as string });

      await expect(caller.emprestimos.meuResumo()).resolves.toMatchObject({
        itensAbertos: 1,
        emAtraso: 0,
      });
    });
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", "00000000-0000-4000-8000-0000000000ff", "FORBIDDEN"],
  ])("RS-REGRAS-02 — %s, meuResumo recusa", async (_caso, usuario, code) => {
    await comAmbiente(async ({ prisma }) => {
      await expect(como(prisma, usuario).emprestimos.meuResumo()).rejects.toMatchObject({ code });
    });
  });
});
