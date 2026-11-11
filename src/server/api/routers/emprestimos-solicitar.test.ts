// @vitest-environment node
// T-SOLIC-05: `emprestimos.solicitar` com Postgres real, carga inicial e relógio fixo.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import { RECUSAS_SOLICITACAO } from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ACAO_SOLICITAR,
  ErroSolicitacao,
  recursoEmprestimo,
  solicitarEmprestimo,
} from "@/server/services/emprestimos";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const COLABORADOR_A = "00000000-0000-4000-8000-000000000001";
const OPERACOES_A = "00000000-0000-4000-8000-000000000002";
const COLABORADOR_B = "00000000-0000-4000-8000-000000000003";
const OUTRO_COLABORADOR_A = "00000000-0000-4000-8000-000000000004";
const SEM_VINCULO = "00000000-0000-4000-8000-0000000000ff";

type Contexto = {
  prisma: PrismaClient;
  cliente: Client;
  tenantA: string;
  /** id do equipamento por patrimônio, no tenant A; `B:` para o tenant B. */
  ids: Record<string, string>;
};

let banco: BancoReal;

/** Banco novo por teste: carga inicial, tenant B, memberships e um item fora de uso. */
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
    const tenantA = rows[0]?.id as string;
    await cliente.query("INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_b')", [TENANT_B]);
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $5, 'colaborador'), ($2, $5, 'operacoes'), ($3, $6, 'colaborador'),
         ($4, $5, 'colaborador')`,
      [COLABORADOR_A, OPERACOES_A, COLABORADOR_B, OUTRO_COLABORADOR_A, tenantA, TENANT_B],
    );
    await cliente.query(
      `INSERT INTO equipamentos (tenant_id, patrimonio, nome, categoria, situacao) VALUES
         ($1, 'TI-9001', 'Monitor descartado', 'monitor', 'fora_de_uso'),
         ($2, 'TB-0001', 'Câmera do tenant B', 'camera', 'ativo')`,
      [tenantA, TENANT_B],
    );
    const { rows: equipamentos } = await cliente.query<{
      id: string;
      patrimonio: string;
      tenant_id: string;
    }>("SELECT id, patrimonio, tenant_id FROM equipamentos");
    const ids = Object.fromEntries(
      equipamentos.map((e) => [e.tenant_id === tenantA ? e.patrimonio : `B:${e.patrimonio}`, e.id]),
    );

    return await acao({ prisma, cliente, tenantA, ids });
  } finally {
    await cliente.end();
    await prisma.$disconnect();
  }
}

function como(prisma: PrismaClient, usuarioId: string | null) {
  const cliente = {
    auth: {
      getUser: async () => ({ data: { user: usuarioId ? { id: usuarioId } : null }, error: null }),
    },
  } as unknown as ClienteSupabaseAutenticacao;

  return routerAplicacao.createCaller({
    obterClientePrisma: () => prisma,
    obterClienteSupabase: async () => cliente,
  });
}

async function emprestimos(cliente: Client) {
  const { rows } = await cliente.query<{
    id: string;
    equipamento_id: string;
    user_id: string;
    tenant_id: string;
    retirado_em: Date;
    devolver_ate: string;
    devolvido_em: Date | null;
  }>(
    `SELECT id, equipamento_id, user_id, tenant_id, retirado_em,
            to_char(devolver_ate, 'YYYY-MM-DD') AS devolver_ate, devolvido_em
       FROM emprestimos ORDER BY retirado_em, id`,
  );
  return rows;
}

async function auditoria(cliente: Client) {
  const { rows } = await cliente.query<{
    tenant_id: string;
    ator: string;
    acao: string;
    recurso: string;
  }>("SELECT tenant_id, ator, acao, recurso FROM auditoria ORDER BY ocorrido_em, id");
  return rows;
}

const recusa = (motivo: keyof typeof RECUSAS_SOLICITACAO) => ({
  ...RECUSAS_SOLICITACAO[motivo],
  cause: { motivo },
});

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

describe("solicitação válida", () => {
  it("CA-SOLIC-01 — cria o empréstimo com prazo de 14 dias corridos, com data fixa", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantA, ids }) => {
      const agora = new Date("2026-11-11T15:00:00Z");

      const saida = await solicitarEmprestimo(
        prisma,
        { tenantId: tenantA, usuarioId: COLABORADOR_A, papel: "colaborador" },
        ids["TI-0001"] as string,
        { agora },
      );

      expect(saida.devolverAte).toBe("2026-11-25");
      expect(await emprestimos(cliente)).toEqual([
        {
          id: saida.id,
          equipamento_id: ids["TI-0001"],
          user_id: COLABORADOR_A,
          tenant_id: tenantA,
          retirado_em: agora,
          devolver_ate: "2026-11-25",
          devolvido_em: null,
        },
      ]);
    });
  });

  it("CA-SOLIC-01 — retirada à noite em São Paulo conta o prazo da data local", async () => {
    await comAmbiente(async ({ prisma, tenantA, ids }) => {
      const saida = await solicitarEmprestimo(
        prisma,
        { tenantId: tenantA, usuarioId: COLABORADOR_A, papel: "colaborador" },
        ids["TI-0001"] as string,
        { agora: new Date("2026-11-12T02:30:00Z") },
      );

      expect(saida.devolverAte).toBe("2026-11-25");
    });
  });

  it("CA-SOLIC-10 — o prazo gravado coincide com o devolverAtePrevisto do detalhe", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const caller = como(prisma, COLABORADOR_A);
      const detalhe = await caller.equipamentos.detalhar({ patrimonio: "TI-0001" });

      const saida = await caller.emprestimos.solicitar({ equipamentoId: ids["TI-0001"] as string });

      expect(saida.devolverAte).toBe(detalhe.devolverAtePrevisto);
      expect((await emprestimos(cliente))[0]?.devolver_ate).toBe(detalhe.devolverAtePrevisto);
    });
  });

  it("RF-SOLIC-02 — pelo procedimento, usuário e tenant vêm da sessão", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantA, ids }) => {
      const entrada = {
        equipamentoId: ids["TI-0002"] as string,
        usuarioId: OUTRO_COLABORADOR_A,
        tenantId: TENANT_B,
        devolverAte: "2030-01-01",
      } as { equipamentoId: string };

      const saida = await como(prisma, COLABORADOR_A).emprestimos.solicitar(entrada);

      expect(Object.keys(saida).sort()).toEqual(["devolverAte", "id"]);
      expect(await emprestimos(cliente)).toMatchObject([
        { user_id: COLABORADOR_A, tenant_id: tenantA, devolver_ate: saida.devolverAte },
      ]);
    });
  });

  it("RN-SOLIC-06 — Operações também pode solicitar", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await como(prisma, OPERACOES_A).emprestimos.solicitar({
        equipamentoId: ids["TI-0003"] as string,
      });

      expect(await emprestimos(cliente)).toMatchObject([{ user_id: OPERACOES_A }]);
    });
  });

  it("RF-SOLIC-04 — após confirmar, o detalhe mostra o item emprestado", async () => {
    await comAmbiente(async ({ prisma, ids }) => {
      const caller = como(prisma, COLABORADOR_A);
      const { devolverAte } = await caller.emprestimos.solicitar({
        equipamentoId: ids["TI-0001"] as string,
      });

      await expect(caller.equipamentos.detalhar({ patrimonio: "TI-0001" })).resolves.toMatchObject({
        disponibilidade: { estado: "emprestado", devolverAte },
      });
    });
  });
});

describe("recusas", () => {
  it("CA-SOLIC-02 — item em manutenção é recusado com EQUIPAMENTO_EM_MANUTENCAO", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      for (const patrimonio of ["TI-0004", "TI-0007"]) {
        await expect(
          como(prisma, COLABORADOR_A).emprestimos.solicitar({
            equipamentoId: ids[patrimonio] as string,
          }),
        ).rejects.toMatchObject(recusa("EQUIPAMENTO_EM_MANUTENCAO"));
      }
      expect(await emprestimos(cliente)).toEqual([]);
    });
  });

  it("RN-SOLIC-02 — item já emprestado é recusado com EQUIPAMENTO_INDISPONIVEL", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;
      await como(prisma, COLABORADOR_A).emprestimos.solicitar({ equipamentoId });

      await expect(
        como(prisma, OUTRO_COLABORADOR_A).emprestimos.solicitar({ equipamentoId }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_INDISPONIVEL"));
      expect(await emprestimos(cliente)).toHaveLength(1);
    });
  });

  it("CA-SOLIC-04 — usuário do tenant B não solicita item do tenant A", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await expect(
        como(prisma, COLABORADOR_B).emprestimos.solicitar({
          equipamentoId: ids["TI-0001"] as string,
        }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_NAO_ENCONTRADO"));
      expect(await emprestimos(cliente)).toEqual([]);
      expect(await auditoria(cliente)).toEqual([]);
    });
  });

  it("CA-SOLIC-04 — usuário do tenant A não solicita item do tenant B", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await expect(
        como(prisma, COLABORADOR_A).emprestimos.solicitar({
          equipamentoId: ids["B:TB-0001"] as string,
        }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_NAO_ENCONTRADO"));
      expect(await emprestimos(cliente)).toEqual([]);
    });
  });

  it("CA-SOLIC-04 — equipamento inexistente não é encontrado", async () => {
    await comAmbiente(async ({ prisma }) => {
      await expect(
        como(prisma, COLABORADOR_A).emprestimos.solicitar({
          equipamentoId: "00000000-0000-4000-8000-0000000000ee",
        }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_NAO_ENCONTRADO"));
    });
  });

  it("RN-SOLIC-07 — fora_de_uso não existe para colaborador e é indisponível para Operações", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-9001"] as string;

      await expect(
        como(prisma, COLABORADOR_A).emprestimos.solicitar({ equipamentoId }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_NAO_ENCONTRADO"));
      await expect(
        como(prisma, OPERACOES_A).emprestimos.solicitar({ equipamentoId }),
      ).rejects.toMatchObject(recusa("EQUIPAMENTO_INDISPONIVEL"));
      expect(await emprestimos(cliente)).toEqual([]);
    });
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", SEM_VINCULO, "FORBIDDEN"],
  ])("RS-SOLIC-01 — %s o procedimento recusa sem gravar", async (_caso, usuario, code) => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await expect(
        como(prisma, usuario).emprestimos.solicitar({ equipamentoId: ids["TI-0001"] as string }),
      ).rejects.toMatchObject({ code });
      expect(await emprestimos(cliente)).toEqual([]);
    });
  });
});

describe("concorrência", () => {
  it("CA-SOLIC-03 — duas solicitações simultâneas do mesmo item resultam em um único empréstimo", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;

      for (let rodada = 0; rodada < 5; rodada += 1) {
        await cliente.query("DELETE FROM emprestimos");
        const resultados = await Promise.allSettled(
          [COLABORADOR_A, OUTRO_COLABORADOR_A, OPERACOES_A].map((usuario) =>
            como(prisma, usuario).emprestimos.solicitar({ equipamentoId }),
          ),
        );

        const aceitas = resultados.filter((r) => r.status === "fulfilled");
        const recusadas = resultados.filter((r) => r.status === "rejected");
        expect(aceitas).toHaveLength(1);
        for (const r of recusadas) {
          expect(r.reason).toMatchObject(recusa("EQUIPAMENTO_INDISPONIVEL"));
        }
        expect(await emprestimos(cliente)).toHaveLength(1);
      }
    });
  });

  it("CA-SOLIC-03 — conflito no índice parcial vira EQUIPAMENTO_INDISPONIVEL", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantA, ids }) => {
      const equipamentoId = ids["TI-0001"] as string;
      // Outra transação grava o empréstimo entre a leitura e a inserção desta.
      const comCorrida = {
        $transaction: ((acao: (transacao: PrismaClient) => Promise<unknown>) =>
          prisma.$transaction(async (transacao) => {
            const original = transacao.emprestimo.findFirst.bind(transacao.emprestimo);
            const espiao = new Proxy(transacao, {
              get(alvo, chave, receptor) {
                if (chave !== "emprestimo") return Reflect.get(alvo, chave, receptor);
                return new Proxy(alvo.emprestimo, {
                  get(modelo, metodo, r) {
                    if (metodo !== "findFirst") return Reflect.get(modelo, metodo, r);
                    return async (args: Parameters<typeof original>[0]) => {
                      const resposta = await original(args);
                      await prisma.emprestimo.create({
                        data: {
                          tenantId: tenantA,
                          equipamentoId,
                          userId: OUTRO_COLABORADOR_A,
                          devolverAte: new Date("2030-01-01T00:00:00Z"),
                        },
                      });
                      return resposta;
                    };
                  },
                });
              },
            });
            return acao(espiao as unknown as PrismaClient);
          })) as unknown as PrismaClient["$transaction"],
      };

      const erro = await solicitarEmprestimo(
        comCorrida,
        { tenantId: tenantA, usuarioId: COLABORADOR_A, papel: "colaborador" },
        equipamentoId,
        { agora: new Date() },
      ).catch((falha: unknown) => falha);

      expect(erro).toBeInstanceOf(ErroSolicitacao);
      expect(erro).toMatchObject({ motivo: "EQUIPAMENTO_INDISPONIVEL" });
      expect(await emprestimos(cliente)).toMatchObject([{ user_id: OUTRO_COLABORADOR_A }]);
      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});

describe("auditoria", () => {
  it("CA-SOLIC-07 — a solicitação grava auditoria com o UUID como ator", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantA, ids }) => {
      const { id } = await como(prisma, COLABORADOR_A).emprestimos.solicitar({
        equipamentoId: ids["TI-0001"] as string,
      });

      expect(await auditoria(cliente)).toEqual([
        {
          tenant_id: tenantA,
          ator: COLABORADOR_A,
          acao: ACAO_SOLICITAR,
          recurso: recursoEmprestimo(id),
        },
      ]);
    });
  });

  it("CA-SOLIC-07 — falha na auditoria desfaz o empréstimo", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantA, ids }) => {
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
        solicitarEmprestimo(
          auditoriaQuebrada,
          { tenantId: tenantA, usuarioId: COLABORADOR_A, papel: "colaborador" },
          ids["TI-0001"] as string,
          { agora: new Date() },
        ),
      ).rejects.toBe(falha);
      expect(await emprestimos(cliente)).toEqual([]);
      expect(await auditoria(cliente)).toEqual([]);
    });
  });

  it("CA-SOLIC-07 — recusa não grava auditoria", async () => {
    await comAmbiente(async ({ prisma, cliente, ids }) => {
      await como(prisma, COLABORADOR_A)
        .emprestimos.solicitar({ equipamentoId: ids["TI-0004"] as string })
        .catch(() => undefined);

      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});
