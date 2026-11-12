// @vitest-environment node
// T-OPER-03: `operacoes.registrarDevolucao` (devolução no balcão), com Postgres real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import {
  MENSAGEM_EMPRESTIMO_JA_ENCERRADO,
  MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO,
} from "@/server/api/routers/emprestimos";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ACAO_DEVOLVER,
  encerrarEmprestimo,
  recursoEmprestimoEncerrado,
} from "@/server/services/encerramento-emprestimo";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const PESSOA = "00000000-0000-4000-8000-000000000001";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const OPERACOES_B = "00000000-0000-4000-8000-000000000004";

type Contexto = {
  prisma: PrismaClient;
  cliente: Client;
  tenantId: string;
  emprestar: (patrimonio: string, dados?: { vencido?: boolean }) => Promise<string>;
};

let banco: BancoReal;

async function comAmbiente<T>(acao: (contexto: Contexto) => Promise<T>) {
  const url = await banco.criarBanco();
  const prisma = new PrismaClient({ adapter: new PrismaPg(url) });
  const cliente = new Client({ connectionString: url });
  await cliente.connect();
  try {
    await executarCargaDoManifesto(prisma);
    const { rows } = await cliente.query<{ id: string }>(
      "SELECT id FROM tenants WHERE slug = 'suporte_ti'",
    );
    const tenantId = rows[0]?.id as string;
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $4, 'operacoes'), ($3, $5, 'operacoes')`,
      [PESSOA, OPERACOES, OPERACOES_B, tenantId, TENANT_B],
    );

    const emprestar: Contexto["emprestar"] = async (patrimonio, dados = {}) => {
      const { rows: criados } = await cliente.query<{ id: string }>(
        `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate)
         SELECT tenant_id, id, $2, $3::timestamptz, $4::date
           FROM equipamentos WHERE tenant_id = $5 AND patrimonio = $1
         RETURNING id`,
        [
          patrimonio,
          PESSOA,
          dados.vencido ? "2026-01-01T12:00:00Z" : "2030-01-01T12:00:00Z",
          dados.vencido ? "2026-01-15" : "2030-01-15",
          tenantId,
        ],
      );
      return criados[0]?.id as string;
    };

    return await acao({ prisma, cliente, tenantId, emprestar });
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

async function linha(cliente: Client, id: string) {
  const { rows } = await cliente.query<{ devolvido_em: Date | null; devolvido_por: string | null }>(
    "SELECT devolvido_em, devolvido_por FROM emprestimos WHERE id = $1",
    [id],
  );
  return rows[0];
}

async function auditoria(cliente: Client) {
  const { rows } = await cliente.query<{ ator: string; acao: string; recurso: string }>(
    "SELECT ator, acao, recurso FROM auditoria ORDER BY ocorrido_em, id",
  );
  return rows;
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

beforeEach(() => {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", "https://wdudlqacomnasnrxgbni.supabase.co");
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", "chave-publica-de-teste-sem-credencial-real");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("operacoes.registrarDevolucao", () => {
  it("CA-OPER-03 — Operações registra a devolução de empréstimo de outra pessoa, e o item é liberado", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      const saida = await como(prisma, OPERACOES).operacoes.registrarDevolucao({
        emprestimoId: id,
      });

      expect(saida).toEqual({ id, devolvidoEm: expect.any(Date) });
      expect(await linha(cliente, id)).toEqual({
        devolvido_em: saida.devolvidoEm,
        devolvido_por: OPERACOES,
      });
      const { itens } = await como(prisma, PESSOA).equipamentos.listar({});
      expect(itens.find((item) => item.patrimonio === "TI-0001")?.disponibilidade).toEqual({
        estado: "disponivel",
      });
      await expect(como(prisma, PESSOA).emprestimos.meus()).resolves.toEqual([]);
    });
  });

  it("CA-OPER-03 — a devolução de item atrasado no balcão libera novas solicitações da pessoa", async () => {
    await comAmbiente(async ({ prisma, emprestar }) => {
      const id = await emprestar("TI-0001", { vencido: true });
      const pessoa = como(prisma, PESSOA);
      await expect(pessoa.emprestimos.meuResumo()).resolves.toMatchObject({ emAtraso: 1 });

      await como(prisma, OPERACOES).operacoes.registrarDevolucao({ emprestimoId: id });

      await expect(pessoa.emprestimos.meuResumo()).resolves.toMatchObject({
        itensAbertos: 0,
        emAtraso: 0,
      });
    });
  });

  it("RN-DEVOL-02 — empréstimo já encerrado é recusado com EMPRESTIMO_JA_ENCERRADO", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");
      await como(prisma, PESSOA).emprestimos.devolver({ emprestimoId: id });

      await expect(
        como(prisma, OPERACOES).operacoes.registrarDevolucao({ emprestimoId: id }),
      ).rejects.toMatchObject({
        code: "CONFLICT",
        message: MENSAGEM_EMPRESTIMO_JA_ENCERRADO,
        cause: { motivo: "EMPRESTIMO_JA_ENCERRADO" },
      });
      expect(await linha(cliente, id)).toMatchObject({ devolvido_por: PESSOA });
    });
  });

  it("RN-DEVOL-02 — devolução simultânea pela pessoa e pelo balcão encerra uma vez", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      const resultados = await Promise.allSettled([
        como(prisma, PESSOA).emprestimos.devolver({ emprestimoId: id }),
        como(prisma, OPERACOES).operacoes.registrarDevolucao({ emprestimoId: id }),
      ]);

      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      expect(await auditoria(cliente)).toHaveLength(1);
    });
  });

  it("CA-OPER-04 — colaborador recebe FORBIDDEN e nada é encerrado", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      await expect(
        como(prisma, PESSOA).operacoes.registrarDevolucao({ emprestimoId: id }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
      });
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
    });
  });

  it("RS-OPER-01 — Operações do tenant B não encerra empréstimo do tenant A", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      await expect(
        como(prisma, OPERACOES_B).operacoes.registrarDevolucao({ emprestimoId: id }),
      ).rejects.toMatchObject({ code: "NOT_FOUND", message: MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO });
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
    });
  });
});

describe("auditoria da devolução no balcão", () => {
  it("CA-OPER-08 — a devolução grava auditoria com Operações como ator", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      await como(prisma, OPERACOES).operacoes.registrarDevolucao({ emprestimoId: id });

      expect(await auditoria(cliente)).toEqual([
        { ator: OPERACOES, acao: ACAO_DEVOLVER, recurso: recursoEmprestimoEncerrado(id) },
      ]);
    });
  });

  it("CA-OPER-08 — falha na auditoria desfaz a devolução no balcão", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantId, emprestar }) => {
      const id = await emprestar("TI-0001");
      const falha = new Error("falha simulada da auditoria");
      const auditoriaQuebrada = {
        $transaction: ((acao: (transacao: PrismaClient) => Promise<unknown>) =>
          prisma.$transaction(async (transacao) =>
            acao(
              new Proxy(transacao, {
                get(alvo, chave, receptor) {
                  if (chave === "auditoria") {
                    return {
                      create: async () => {
                        throw falha;
                      },
                    };
                  }
                  return Reflect.get(alvo, chave, receptor);
                },
              }) as unknown as PrismaClient,
            ),
          )) as unknown as PrismaClient["$transaction"],
      };

      await expect(
        encerrarEmprestimo(auditoriaQuebrada, { tenantId, ator: OPERACOES }, id, {
          agora: new Date(),
        }),
      ).rejects.toBe(falha);
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});
