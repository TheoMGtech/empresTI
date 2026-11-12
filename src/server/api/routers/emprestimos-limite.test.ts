// @vitest-environment node
// T-REGRAS-02: limite de 3 itens em aberto por pessoa, serializado por membership, com Postgres real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { LIMITE_ITENS_POR_PESSOA } from "@/lib/esquemas/emprestimos";
import { routerAplicacao } from "@/server/api/raiz";
import { RECUSAS_SOLICITACAO } from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const PESSOA = "00000000-0000-4000-8000-000000000001";
const OUTRA_PESSOA = "00000000-0000-4000-8000-000000000002";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const DISPONIVEIS = ["TI-0001", "TI-0002", "TI-0003", "TI-0005", "TI-0006", "TI-0008", "TI-0009"];

type Contexto = { prisma: PrismaClient; cliente: Client; ids: Record<string, string> };

let banco: BancoReal;

async function comAmbiente<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await executarCargaDoManifesto(prisma);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role)
       SELECT v.id::uuid, t.id, v.papel::papel_membership FROM tenants t,
              (VALUES ($1, 'colaborador'), ($2, 'colaborador'), ($3, 'operacoes')) AS v(id, papel)
        WHERE t.slug = 'suporte_ti'`,
      [PESSOA, OUTRA_PESSOA, OPERACOES],
    );
    const { rows } = await cliente.query<{ id: string; patrimonio: string }>(
      "SELECT id, patrimonio FROM equipamentos",
    );
    const ids = Object.fromEntries(rows.map((linha) => [linha.patrimonio, linha.id]));
    return await acao({ prisma, cliente, ids });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

function como(prisma: PrismaClient, usuarioId: string) {
  const supabase = {
    auth: { getUser: async () => ({ data: { user: { id: usuarioId } }, error: null }) },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => supabase,
  });
}

const solicitar = (prisma: PrismaClient, usuarioId: string, equipamentoId: string) =>
  como(prisma, usuarioId).emprestimos.solicitar({ equipamentoId });

async function abertosDe(cliente: Client, usuarioId: string) {
  const { rows } = await cliente.query<{ total: number }>(
    "SELECT count(*)::int AS total FROM emprestimos WHERE user_id = $1 AND devolvido_em IS NULL",
    [usuarioId],
  );
  return rows[0]?.total;
}

const limiteAtingido = {
  ...RECUSAS_SOLICITACAO.LIMITE_ATINGIDO,
  cause: { motivo: "LIMITE_ATINGIDO" },
};

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("limite de itens por pessoa", () => {
  it("CA-REGRAS-01 — o terceiro item é aceito, e o quarto é recusado com LIMITE_ATINGIDO", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await expect(solicitar(prisma, PESSOA, ids[patrimonio] as string)).resolves.toMatchObject({
          devolverAte: expect.any(String),
        });
      }

      await expect(
        solicitar(prisma, PESSOA, ids[DISPONIVEIS[3] as string] as string),
      ).rejects.toMatchObject(limiteAtingido);
      expect(await abertosDe(cliente, PESSOA)).toBe(LIMITE_ITENS_POR_PESSOA);
    });
  });

  it("CA-REGRAS-01 — a recusa por limite não grava empréstimo nem auditoria", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await solicitar(prisma, PESSOA, ids[patrimonio] as string);
      }
      const { rows: antes } = await cliente.query("SELECT count(*)::int AS n FROM auditoria");

      await solicitar(prisma, PESSOA, ids["TI-0008"] as string).catch(() => undefined);

      const { rows: depois } = await cliente.query("SELECT count(*)::int AS n FROM auditoria");
      expect(depois).toEqual(antes);
      expect(await abertosDe(cliente, PESSOA)).toBe(3);
    });
  });

  it("CA-REGRAS-01 — o limite vale antes das recusas de equipamento (ordem da Spec 006)", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await solicitar(prisma, PESSOA, ids[patrimonio] as string);
      }

      // TI-0004 está em manutenção, mas quem já tem 3 itens recebe o motivo de limite.
      await expect(solicitar(prisma, PESSOA, ids["TI-0004"] as string)).rejects.toMatchObject(
        limiteAtingido,
      );
    });
  });

  it("RS-REGRAS-02 — o limite é por pessoa: outra pessoa continua podendo pedir", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await solicitar(prisma, PESSOA, ids[patrimonio] as string);
      }

      await expect(
        solicitar(prisma, OUTRA_PESSOA, ids["TI-0008"] as string),
      ).resolves.toBeDefined();
      expect(await abertosDe(cliente, OUTRA_PESSOA)).toBe(1);
    });
  });

  it("RN-SOLIC-06 — Operações também respeita o limite de 3", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await solicitar(prisma, OPERACOES, ids[patrimonio] as string);
      }

      await expect(solicitar(prisma, OPERACOES, ids["TI-0008"] as string)).rejects.toMatchObject(
        limiteAtingido,
      );
    });
  });

  it("CA-REGRAS-01 — empréstimo devolvido libera uma vaga", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await solicitar(prisma, PESSOA, ids[patrimonio] as string);
      }
      await cliente.query(
        `UPDATE emprestimos SET devolvido_em = now(), devolvido_por = $2
          WHERE equipamento_id = $1`,
        [ids["TI-0001"], OPERACOES],
      );

      await expect(solicitar(prisma, PESSOA, ids["TI-0008"] as string)).resolves.toBeDefined();
      expect(await abertosDe(cliente, PESSOA)).toBe(3);
    });
  });

  it("RN-REGRAS-05 — empréstimo vencido e ainda aberto continua contando no limite", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      // Dois itens abertos e já vencidos, gravados direto no banco.
      await cliente.query(
        `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate)
         SELECT tenant_id, id, $1, '2026-01-01T12:00:00Z', '2026-01-15'
           FROM equipamentos WHERE patrimonio IN ('TI-0001', 'TI-0002')`,
        [PESSOA],
      );
      await solicitar(prisma, PESSOA, ids["TI-0003"] as string).catch(() => undefined);

      // Com o bloqueio por atraso (T-REGRAS-03) a recusa pode vir antes; em nenhum caso há 4 abertos.
      await solicitar(prisma, PESSOA, ids["TI-0005"] as string).catch(() => undefined);
      expect(await abertosDe(cliente, PESSOA)).toBeLessThanOrEqual(LIMITE_ITENS_POR_PESSOA);
    });
  });
});

describe("concorrência", () => {
  it("CA-REGRAS-02 — solicitações simultâneas da mesma pessoa não ultrapassam o limite de 3", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (let rodada = 0; rodada < 3; rodada += 1) {
        await cliente.query("DELETE FROM emprestimos");

        const resultados = await Promise.allSettled(
          DISPONIVEIS.map((patrimonio) => solicitar(prisma, PESSOA, ids[patrimonio] as string)),
        );

        const aceitas = resultados.filter((r) => r.status === "fulfilled");
        const recusadas = resultados.filter(
          (r): r is PromiseRejectedResult => r.status === "rejected",
        );
        expect(aceitas).toHaveLength(LIMITE_ITENS_POR_PESSOA);
        for (const recusa of recusadas) expect(recusa.reason).toMatchObject(limiteAtingido);
        expect(await abertosDe(cliente, PESSOA)).toBe(LIMITE_ITENS_POR_PESSOA);
      }
    });
  });

  it("CA-REGRAS-02 — pedidos simultâneos de pessoas diferentes não se bloqueiam no limite", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const resultados = await Promise.allSettled([
        ...DISPONIVEIS.slice(0, 3).map((p) => solicitar(prisma, PESSOA, ids[p] as string)),
        ...DISPONIVEIS.slice(3, 6).map((p) => solicitar(prisma, OUTRA_PESSOA, ids[p] as string)),
      ]);

      expect(resultados.every((r) => r.status === "fulfilled")).toBe(true);
      expect(await abertosDe(cliente, PESSOA)).toBe(3);
      expect(await abertosDe(cliente, OUTRA_PESSOA)).toBe(3);
    });
  });
});

describe("chamada direta ao servidor", () => {
  it("CA-REGRAS-08 — a chamada ao procedimento, sem a interface, também é recusada", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      const caller = como(prisma, PESSOA);
      for (const patrimonio of DISPONIVEIS.slice(0, 3)) {
        await caller.emprestimos.solicitar({ equipamentoId: ids[patrimonio] as string });
      }

      await expect(
        caller.emprestimos.solicitar({ equipamentoId: ids["TI-0009"] as string }),
      ).rejects.toMatchObject({ code: "CONFLICT", cause: { motivo: "LIMITE_ATINGIDO" } });
    });
  });
});
