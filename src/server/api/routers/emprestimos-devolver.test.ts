// @vitest-environment node
// T-DEVOL-02: serviço único de encerramento e `emprestimos.devolver`, com Postgres real.
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Client } from "pg";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

import { routerAplicacao } from "@/server/api/raiz";
import {
  MENSAGEM_EMPRESTIMO_JA_ENCERRADO,
  MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO,
} from "@/server/api/routers/emprestimos";
import type { ClienteSupabaseAutenticacao } from "@/server/services/autenticacao";
import {
  ACAO_DEVOLVER,
  ErroEmprestimoNaoEncontrado,
  encerrarEmprestimo,
  recursoEmprestimoEncerrado,
} from "@/server/services/encerramento-emprestimo";
import { iniciarBancoReal, type BancoReal } from "@/test/banco-real";

import { executarCargaDoManifesto } from "../../../../prisma/rotinas/carga";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const PESSOA = "00000000-0000-4000-8000-000000000001";
const OUTRA_PESSOA = "00000000-0000-4000-8000-000000000002";
const OPERACOES = "00000000-0000-4000-8000-000000000003";
const PESSOA_B = "00000000-0000-4000-8000-000000000004";

type Contexto = {
  prisma: PrismaClient;
  cliente: Client;
  tenantId: string;
  /** Grava um empréstimo aberto e devolve o id. */
  emprestar: (
    patrimonio: string,
    dados?: { usuario?: string; vencido?: boolean },
  ) => Promise<string>;
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
         ($1, $5, 'colaborador'), ($2, $5, 'colaborador'), ($3, $5, 'operacoes'),
         ($4, $6, 'colaborador')`,
      [PESSOA, OUTRA_PESSOA, OPERACOES, PESSOA_B, tenantId, TENANT_B],
    );

    const emprestar: Contexto["emprestar"] = async (patrimonio, dados = {}) => {
      const { rows: criados } = await cliente.query<{ id: string }>(
        `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate)
         SELECT tenant_id, id, $2, $3::timestamptz, $4::date
           FROM equipamentos WHERE tenant_id = $5 AND patrimonio = $1
         RETURNING id`,
        [
          patrimonio,
          dados.usuario ?? PESSOA,
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

const jaEncerrado = {
  code: "CONFLICT",
  message: MENSAGEM_EMPRESTIMO_JA_ENCERRADO,
  cause: { motivo: "EMPRESTIMO_JA_ENCERRADO" },
};
const naoEncontrado = { code: "NOT_FOUND", message: MENSAGEM_EMPRESTIMO_NAO_ENCONTRADO };

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

describe("emprestimos.devolver", () => {
  it("CA-DEVOL-02 — devolver encerra o empréstimo e libera o item", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");
      const caller = como(prisma, PESSOA);

      const saida = await caller.emprestimos.devolver({ emprestimoId: id });

      expect(saida).toEqual({ id, devolvidoEm: expect.any(Date) });
      expect(await linha(cliente, id)).toEqual({
        devolvido_em: saida.devolvidoEm,
        devolvido_por: PESSOA,
      });
      const { itens } = await caller.equipamentos.listar({});
      expect(itens.find((item) => item.patrimonio === "TI-0001")?.disponibilidade).toEqual({
        estado: "disponivel",
      });
    });
  });

  it("CA-DEVOL-03 — devolver duas vezes é recusado com EMPRESTIMO_JA_ENCERRADO", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");
      const caller = como(prisma, PESSOA);
      await caller.emprestimos.devolver({ emprestimoId: id });
      const antes = await linha(cliente, id);

      await expect(caller.emprestimos.devolver({ emprestimoId: id })).rejects.toMatchObject(
        jaEncerrado,
      );
      expect(await linha(cliente, id)).toEqual(antes);
      expect(await auditoria(cliente)).toHaveLength(1);
    });
  });

  it("RN-DEVOL-02 — devoluções simultâneas encerram uma única vez", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      const resultados = await Promise.allSettled(
        Array.from({ length: 4 }, () =>
          como(prisma, PESSOA).emprestimos.devolver({ emprestimoId: id }),
        ),
      );

      expect(resultados.filter((r) => r.status === "fulfilled")).toHaveLength(1);
      for (const r of resultados.filter(
        (r): r is PromiseRejectedResult => r.status === "rejected",
      )) {
        expect(r.reason).toMatchObject(jaEncerrado);
      }
      expect(await auditoria(cliente)).toHaveLength(1);
    });
  });

  it("CA-DEVOL-04 — colaborador não devolve empréstimo de outra pessoa", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001", { usuario: OUTRA_PESSOA });

      await expect(
        como(prisma, PESSOA).emprestimos.devolver({ emprestimoId: id }),
      ).rejects.toMatchObject(naoEncontrado);
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
      expect(await auditoria(cliente)).toEqual([]);
    });
  });

  it("RS-DEVOL-02 — também Operações só devolve, por aqui, o próprio empréstimo", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001", { usuario: PESSOA });

      await expect(
        como(prisma, OPERACOES).emprestimos.devolver({ emprestimoId: id }),
      ).rejects.toMatchObject(naoEncontrado);
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
    });
  });

  it("CA-DEVOL-05 — usuário do tenant B não devolve empréstimo do tenant A", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      await expect(
        como(prisma, PESSOA_B).emprestimos.devolver({ emprestimoId: id }),
      ).rejects.toMatchObject(naoEncontrado);
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
    });
  });

  it("CA-DEVOL-05 — empréstimo inexistente não é encontrado", async () => {
    await comAmbiente(async ({ prisma }) => {
      await expect(
        como(prisma, PESSOA).emprestimos.devolver({
          emprestimoId: "00000000-0000-4000-8000-0000000000ee",
        }),
      ).rejects.toMatchObject(naoEncontrado);
    });
  });

  it.each([
    ["sem sessão", null, "UNAUTHORIZED"],
    ["sem membership", "00000000-0000-4000-8000-0000000000ff", "FORBIDDEN"],
  ])("RS-DEVOL-01 — %s, devolver recusa", async (_caso, usuario, code) => {
    await comAmbiente(async ({ prisma, emprestar }) => {
      const id = await emprestar("TI-0001");
      await expect(
        como(prisma, usuario).emprestimos.devolver({ emprestimoId: id }),
      ).rejects.toMatchObject({ code });
    });
  });

  it("CA-DEVOL-08 — devolver o item atrasado libera novas solicitações", async () => {
    await comAmbiente(async ({ prisma, emprestar }) => {
      const id = await emprestar("TI-0001", { vencido: true });
      const caller = como(prisma, PESSOA);
      const { id: equipamentoId } = await caller.equipamentos.detalhar({ patrimonio: "TI-0002" });

      await expect(caller.emprestimos.solicitar({ equipamentoId })).rejects.toMatchObject({
        cause: { motivo: "ITEM_EM_ATRASO" },
      });

      await caller.emprestimos.devolver({ emprestimoId: id });

      await expect(caller.emprestimos.solicitar({ equipamentoId })).resolves.toBeDefined();
      await expect(caller.emprestimos.meuResumo()).resolves.toMatchObject({
        itensAbertos: 1,
        emAtraso: 0,
      });
    });
  });
});

describe("auditoria do encerramento", () => {
  it("CA-DEVOL-07 — a devolução grava auditoria com o UUID como ator", async () => {
    await comAmbiente(async ({ prisma, cliente, emprestar }) => {
      const id = await emprestar("TI-0001");

      await como(prisma, PESSOA).emprestimos.devolver({ emprestimoId: id });

      expect(await auditoria(cliente)).toEqual([
        { ator: PESSOA, acao: ACAO_DEVOLVER, recurso: recursoEmprestimoEncerrado(id) },
      ]);
    });
  });

  it("CA-DEVOL-07 — falha na auditoria desfaz a devolução", async () => {
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
        encerrarEmprestimo(
          auditoriaQuebrada,
          { tenantId, ator: PESSOA, somenteDoTomador: PESSOA },
          id,
          { agora: new Date() },
        ),
      ).rejects.toBe(falha);
      expect(await linha(cliente, id)).toEqual({ devolvido_em: null, devolvido_por: null });
      expect(await auditoria(cliente)).toEqual([]);
    });
  });
});

describe("serviço único de encerramento", () => {
  it("RN-DEVOL-03 — sem restrição de tomador, encerra empréstimo de outra pessoa do tenant", async () => {
    await comAmbiente(async ({ prisma, cliente, tenantId, emprestar }) => {
      const id = await emprestar("TI-0001", { usuario: PESSOA });
      const agora = new Date("2030-01-10T15:00:00Z");

      await expect(
        encerrarEmprestimo(prisma, { tenantId, ator: OPERACOES }, id, { agora }),
      ).resolves.toEqual({ id, devolvidoEm: agora });
      expect(await linha(cliente, id)).toEqual({ devolvido_em: agora, devolvido_por: OPERACOES });
    });
  });

  it("RN-DEVOL-03 — sem restrição de tomador, continua preso ao tenant", async () => {
    await comAmbiente(async ({ prisma, emprestar }) => {
      const id = await emprestar("TI-0001");

      await expect(
        encerrarEmprestimo(prisma, { tenantId: TENANT_B, ator: OPERACOES }, id, {
          agora: new Date(),
        }),
      ).rejects.toBeInstanceOf(ErroEmprestimoNaoEncontrado);
    });
  });
});
