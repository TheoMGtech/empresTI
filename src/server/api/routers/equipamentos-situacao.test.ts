// @vitest-environment node
// T-OPER-05: `equipamentos.alterarSituacao`, com Postgres real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import {
  MENSAGEM_EMPRESTIMO_EM_ABERTO,
  MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO,
} from "@/server/api/routers/equipamentos";
import { MENSAGENS_AUTORIZACAO } from "@/server/api/trpc";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ACAO_ALTERAR_SITUACAO,
  alterarSituacaoEquipamento,
  recursoEquipamento,
} from "@/server/services/equipamentos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR = "00000000-0000-4000-8000-000000000001";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const OPERACOES_B = "00000000-0000-4000-8000-000000000004";

type Contexto = {
  prisma: PrismaClient;
  cliente: Client;
  tenantId: string;
  ids: Record<string, string>;
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
      [COLABORADOR, OPERACOES, OPERACOES_B, tenantId, TENANT_B],
    );
    const { rows: equipamentos } = await cliente.query<{ id: string; patrimonio: string }>(
      "SELECT id, patrimonio FROM equipamentos WHERE tenant_id = $1",
      [tenantId],
    );
    const ids = Object.fromEntries(equipamentos.map((e) => [e.patrimonio, e.id]));
    return await acao({ prisma, cliente, tenantId, ids });
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

async function situacao(cliente: Client, id: string) {
  const { rows } = await cliente.query<{ situacao: string }>(
    "SELECT situacao::text FROM equipamentos WHERE id = $1",
    [id],
  );
  return rows[0]?.situacao;
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

describe("equipamentos.alterarSituacao", () => {
  it("CA-OPER-07 — colocado em manutenção, o item deixa de ser disponível e não pode ser solicitado", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;

      await expect(
        como(prisma, OPERACOES).equipamentos.alterarSituacao({
          equipamentoId,
          situacao: "em_manutencao",
        }),
      ).resolves.toEqual({ id: equipamentoId, situacao: "em_manutencao" });
      expect(await situacao(cliente, equipamentoId)).toBe("em_manutencao");

      const colaborador = como(prisma, COLABORADOR);
      const { itens, resumo } = await colaborador.equipamentos.listar({});
      expect(itens.find((item) => item.patrimonio === "TI-0001")?.disponibilidade).toEqual({
        estado: "manutencao",
      });
      expect(resumo.disponiveis).toBe(9);
      await expect(colaborador.emprestimos.solicitar({ equipamentoId })).rejects.toMatchObject({
        cause: { motivo: "EQUIPAMENTO_EM_MANUTENCAO" },
      });
    });
  });

  it("RN-OPER-03 — de volta a ativo, o item volta a ser disponível", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      const equipamentoId = ids["TI-0004"] as string;

      await como(prisma, OPERACOES).equipamentos.alterarSituacao({
        equipamentoId,
        situacao: "ativo",
      });

      await expect(
        como(prisma, COLABORADOR).emprestimos.solicitar({ equipamentoId }),
      ).resolves.toBeDefined();
    });
  });

  it("RN-CATALOGO-03 — fora de uso deixa de aparecer para colaborador", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      await como(prisma, OPERACOES).equipamentos.alterarSituacao({
        equipamentoId: ids["TI-0002"] as string,
        situacao: "fora_de_uso",
      });

      const { itens } = await como(prisma, COLABORADOR).equipamentos.listar({});
      expect(itens.map((item) => item.patrimonio)).not.toContain("TI-0002");
    });
  });

  it("CA-OPER-09 — com empréstimo em aberto responde EMPRESTIMO_EM_ABERTO e nada muda", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;
      await como(prisma, COLABORADOR).emprestimos.solicitar({ equipamentoId });
      const auditoriaAntes = await auditoria(cliente);

      for (const nova of ["em_manutencao", "fora_de_uso", "ativo"] as const) {
        await expect(
          como(prisma, OPERACOES).equipamentos.alterarSituacao({ equipamentoId, situacao: nova }),
        ).rejects.toMatchObject({
          code: "CONFLICT",
          message: MENSAGEM_EMPRESTIMO_EM_ABERTO,
          cause: { motivo: "EMPRESTIMO_EM_ABERTO" },
        });
      }
      expect(await situacao(cliente, equipamentoId)).toBe("ativo");
      expect(await auditoria(cliente)).toEqual(auditoriaAntes);
    });
  });

  it("CA-OPER-09 — depois da devolução, a situação pode ser alterada", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;
      const { id } = await como(prisma, COLABORADOR).emprestimos.solicitar({ equipamentoId });
      await como(prisma, OPERACOES).operacoes.registrarDevolucao({ emprestimoId: id });

      await como(prisma, OPERACOES).equipamentos.alterarSituacao({
        equipamentoId,
        situacao: "em_manutencao",
      });
      expect(await situacao(cliente, equipamentoId)).toBe("em_manutencao");
    });
  });

  it("CA-OPER-09 — solicitação e alteração simultâneas nunca deixam item em manutenção emprestado", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0003"] as string;

      for (let rodada = 0; rodada < 5; rodada += 1) {
        await cliente.query("DELETE FROM emprestimos");
        await cliente.query("UPDATE equipamentos SET situacao = 'ativo' WHERE id = $1", [
          equipamentoId,
        ]);

        await Promise.allSettled([
          como(prisma, COLABORADOR).emprestimos.solicitar({ equipamentoId }),
          como(prisma, OPERACOES).equipamentos.alterarSituacao({
            equipamentoId,
            situacao: "em_manutencao",
          }),
        ]);

        const { rows } = await cliente.query<{ situacao: string; abertos: number }>(
          `SELECT e.situacao::text,
                  (SELECT count(*)::int FROM emprestimos
                    WHERE equipamento_id = e.id AND devolvido_em IS NULL) AS abertos
             FROM equipamentos e WHERE e.id = $1`,
          [equipamentoId],
        );
        const estado = rows[0];
        // Exatamente uma das duas vence: emprestado e ativo, ou em manutenção sem empréstimo.
        expect(
          (estado?.situacao === "ativo" && estado.abertos === 1) ||
            (estado?.situacao === "em_manutencao" && estado.abertos === 0),
        ).toBe(true);
      }
    });
  });

  it("RF-OPER-07 — a mesma situação não muda nada e não é auditada", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await expect(
        como(prisma, OPERACOES).equipamentos.alterarSituacao({
          equipamentoId: ids["TI-0001"] as string,
          situacao: "ativo",
        }),
      ).resolves.toMatchObject({ situacao: "ativo" });
      expect(await auditoria(cliente)).toEqual([]);
    });
  });

  it("RS-OPER-01 — Operações do tenant B não altera equipamento do tenant A", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;

      await expect(
        como(prisma, OPERACOES_B).equipamentos.alterarSituacao({
          equipamentoId,
          situacao: "fora_de_uso",
        }),
      ).rejects.toMatchObject({
        code: "NOT_FOUND",
        message: MENSAGEM_EQUIPAMENTO_NAO_ENCONTRADO,
        cause: { motivo: "EQUIPAMENTO_NAO_ENCONTRADO" },
      });
      expect(await situacao(cliente, equipamentoId)).toBe("ativo");
    });
  });

  it("CA-OPER-04 — colaborador recebe FORBIDDEN e nada muda", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;

      await expect(
        como(prisma, COLABORADOR).equipamentos.alterarSituacao({
          equipamentoId,
          situacao: "fora_de_uso",
        }),
      ).rejects.toMatchObject({
        code: "FORBIDDEN",
        message: MENSAGENS_AUTORIZACAO.restritoOperacoes,
      });
      expect(await situacao(cliente, equipamentoId)).toBe("ativo");
    });
  });
});

describe("auditoria da alteração", () => {
  it("CA-OPER-08 — a alteração grava auditoria com Operações como ator", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;

      await como(prisma, OPERACOES).equipamentos.alterarSituacao({
        equipamentoId,
        situacao: "em_manutencao",
      });

      expect(await auditoria(cliente)).toEqual([
        {
          ator: OPERACOES,
          acao: ACAO_ALTERAR_SITUACAO,
          recurso: recursoEquipamento(equipamentoId),
        },
      ]);
    });
  });

  it("CA-OPER-08 — falha na auditoria desfaz a alteração", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantId, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;
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
        alterarSituacaoEquipamento(
          auditoriaQuebrada,
          { tenantId, ator: OPERACOES },
          equipamentoId,
          "em_manutencao",
        ),
      ).rejects.toBe(falha);
      expect(await situacao(cliente, equipamentoId)).toBe("ativo");
      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});
