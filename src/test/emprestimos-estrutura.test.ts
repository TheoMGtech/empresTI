// @vitest-environment node
//
// T-SOLIC-03: tabela `emprestimos` e colunas novas de `equipamentos`, provadas em Postgres real.
// CA-SOLIC-05 (empréstimo não cruza tenants), CA-SOLIC-06 (RLS e bloqueio de TRUNCATE) e
// RN-SOLIC-02 (no máximo um empréstimo aberto por equipamento, garantido pelo banco).
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, PAPEL_DONO, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const VIOLACAO_FK = "23503";
const VIOLACAO_UNICIDADE = "23505";
const VIOLACAO_CHECK = "23514";
const SEM_PRIVILEGIO = "42501";
const EXCECAO_DO_TRIGGER = "P0001";

const TENANT_A = "00000000-0000-4000-8000-00000000000a";
const TENANT_B = "00000000-0000-4000-8000-00000000000b";
const USUARIO_A = "00000000-0000-4000-8000-000000000001";
const USUARIO_B = "00000000-0000-4000-8000-000000000002";
const OPERACOES_A = "00000000-0000-4000-8000-000000000003";
const EQUIPAMENTO_A = "00000000-0000-4000-8000-0000000000e1";
const EQUIPAMENTO_B = "00000000-0000-4000-8000-0000000000e2";

const PAPEIS = ["anon", "authenticated"] as const;

type Emprestimo = {
  id?: string;
  tenantId?: string;
  equipamentoId?: string;
  userId?: string;
  retiradoEm?: string;
  devolverAte?: string;
  devolvidoEm?: string | null;
  devolvidoPor?: string | null;
};

let banco: BancoReal;

async function comDados<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    await cliente.query(
      "INSERT INTO tenants (id, slug) VALUES ($1, 'tenant_a'), ($2, 'tenant_b')",
      [TENANT_A, TENANT_B],
    );
    await cliente.query(
      `INSERT INTO memberships (user_id, tenant_id, role) VALUES
         ($1, $4, 'colaborador'), ($2, $5, 'colaborador'), ($3, $4, 'operacoes')`,
      [USUARIO_A, USUARIO_B, OPERACOES_A, TENANT_A, TENANT_B],
    );
    await cliente.query(
      `INSERT INTO equipamentos (id, tenant_id, patrimonio, nome, categoria) VALUES
         ($1, $3, 'TI-9001', 'Item do tenant A', 'notebook'),
         ($2, $4, 'TI-9001', 'Item do tenant B', 'monitor')`,
      [EQUIPAMENTO_A, EQUIPAMENTO_B, TENANT_A, TENANT_B],
    );
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

function criarEmprestimo(cliente: Client, dados: Emprestimo = {}) {
  return cliente.query<{ id: string }>(
    `INSERT INTO emprestimos
       (tenant_id, equipamento_id, user_id, retirado_em, devolver_ate, devolvido_em, devolvido_por)
     VALUES ($1, $2, $3, $4::timestamptz, $5::date, $6::timestamptz, $7)
     RETURNING id`,
    [
      dados.tenantId ?? TENANT_A,
      dados.equipamentoId ?? EQUIPAMENTO_A,
      dados.userId ?? USUARIO_A,
      dados.retiradoEm ?? "2026-11-11T12:00:00Z",
      dados.devolverAte ?? "2026-11-25",
      dados.devolvidoEm ?? null,
      dados.devolvidoPor ?? null,
    ],
  );
}

async function comoPapel<T>(cliente: Client, papel: string, acao: () => Promise<T>) {
  await cliente.query(`SET ROLE ${papel}`);
  try {
    return await acao();
  } finally {
    await cliente.query("RESET ROLE");
  }
}

async function retrato(cliente: Client) {
  const { rows } = await cliente.query<{ linha: string }>(
    "SELECT t::text AS linha FROM emprestimos t ORDER BY 1",
  );
  return rows.map((item) => item.linha);
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("estrutura de emprestimos", () => {
  it("CA-SOLIC-11 — a migration aplica do zero e cria a tabela com as colunas previstas", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT column_name, data_type, is_nullable FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'emprestimos'
          ORDER BY ordinal_position`,
      );

      expect(rows).toEqual([
        { column_name: "id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "tenant_id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "equipamento_id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "user_id", data_type: "uuid", is_nullable: "NO" },
        { column_name: "retirado_em", data_type: "timestamp with time zone", is_nullable: "NO" },
        { column_name: "devolver_ate", data_type: "date", is_nullable: "NO" },
        { column_name: "devolvido_em", data_type: "timestamp with time zone", is_nullable: "YES" },
        { column_name: "devolvido_por", data_type: "uuid", is_nullable: "YES" },
      ]);
    });
  });

  it("CA-SOLIC-01 — empréstimo válido é aceito, aberto e com retirada no momento da inserção", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `INSERT INTO emprestimos (tenant_id, equipamento_id, user_id, devolver_ate)
         VALUES ($1, $2, $3, (now() AT TIME ZONE 'America/Sao_Paulo')::date + 14)
         RETURNING devolvido_em, devolvido_por, retirado_em <= now() AS retirado_agora`,
        [TENANT_A, EQUIPAMENTO_A, USUARIO_A],
      );

      expect(rows).toEqual([{ devolvido_em: null, devolvido_por: null, retirado_agora: true }]);
    });
  });

  it("D-SOLIC-02 — equipamentos ganha numero_serie, local e observacoes opcionais", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT column_name, data_type, is_nullable, column_default
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'equipamentos'
            AND column_name IN ('numero_serie', 'local', 'observacoes')
          ORDER BY column_name`,
      );
      const { rows: valores } = await cliente.query(
        "SELECT numero_serie, local, observacoes FROM equipamentos",
      );

      expect(rows).toEqual(
        ["local", "numero_serie", "observacoes"].map((column_name) => ({
          column_name,
          data_type: "text",
          is_nullable: "YES",
          column_default: null,
        })),
      );
      expect(valores.every((linha) => Object.values(linha).every((v) => v === null))).toBe(true);
    });
  });
});

describe("empréstimo não cruza tenants", () => {
  it("CA-SOLIC-05 — o banco rejeita equipamento de outro tenant", async () => {
    await comDados(async (cliente) => {
      await expect(
        criarEmprestimo(cliente, { tenantId: TENANT_A, equipamentoId: EQUIPAMENTO_B }),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-SOLIC-05 — o banco rejeita pessoa sem membership no tenant do empréstimo", async () => {
    await comDados(async (cliente) => {
      await expect(criarEmprestimo(cliente, { userId: USUARIO_B })).rejects.toMatchObject({
        code: VIOLACAO_FK,
      });
    });
  });

  it("CA-SOLIC-05 — o banco rejeita tenant do empréstimo diferente dos dois", async () => {
    await comDados(async (cliente) => {
      await expect(
        criarEmprestimo(cliente, { tenantId: TENANT_B, equipamentoId: EQUIPAMENTO_A }),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });

  it("CA-SOLIC-05 — equipamento e membership com empréstimo não podem ser excluídos", async () => {
    await comDados(async (cliente) => {
      await criarEmprestimo(cliente);

      await expect(
        cliente.query("DELETE FROM equipamentos WHERE id = $1", [EQUIPAMENTO_A]),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
      await expect(
        cliente.query("DELETE FROM memberships WHERE user_id = $1", [USUARIO_A]),
      ).rejects.toMatchObject({ code: VIOLACAO_FK });
    });
  });
});

describe("um empréstimo aberto por equipamento", () => {
  it("RN-SOLIC-02 — segundo empréstimo aberto do mesmo equipamento é rejeitado", async () => {
    await comDados(async (cliente) => {
      await criarEmprestimo(cliente);

      await expect(criarEmprestimo(cliente, { userId: OPERACOES_A })).rejects.toMatchObject({
        code: VIOLACAO_UNICIDADE,
        constraint: "emprestimos_equipamento_aberto_key",
      });
    });
  });

  it("RN-SOLIC-02 — depois da devolução, o equipamento aceita novo empréstimo", async () => {
    await comDados(async (cliente) => {
      await criarEmprestimo(cliente, {
        devolvidoEm: "2026-11-12T12:00:00Z",
        devolvidoPor: OPERACOES_A,
      });

      await expect(criarEmprestimo(cliente, { userId: OPERACOES_A })).resolves.toMatchObject({
        rowCount: 1,
      });
    });
  });

  it("RN-SOLIC-02 — os índices parciais filtram por devolvido_em nulo", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes
          WHERE tablename = 'emprestimos' AND indexname LIKE 'emprestimos_%aberto%'
          ORDER BY indexname`,
      );

      expect(rows.map((linha) => linha.indexname)).toEqual([
        "emprestimos_equipamento_aberto_key",
        "emprestimos_tenant_user_aberto_idx",
      ]);
      expect(rows[0]?.indexdef).toMatch(
        /CREATE UNIQUE INDEX .*\(equipamento_id\) WHERE \(devolvido_em IS NULL\)/,
      );
      expect(rows[1]?.indexdef).toMatch(/\(tenant_id, user_id\) WHERE \(devolvido_em IS NULL\)/);
    });
  });
});

describe("consistência das datas", () => {
  it.each<[string, Emprestimo]>([
    ["devolução sem quem registrou", { devolvidoEm: "2026-11-12T12:00:00Z" }],
    ["quem registrou sem devolução", { devolvidoPor: OPERACOES_A }],
    ["prazo no mesmo dia da retirada", { devolverAte: "2026-11-11" }],
    ["prazo antes da retirada", { devolverAte: "2026-11-01" }],
  ])("CA-SOLIC-11 — rejeita %s", async (_caso, dados) => {
    await comDados(async (cliente) => {
      await expect(criarEmprestimo(cliente, dados)).rejects.toMatchObject({ code: VIOLACAO_CHECK });
    });
  });

  it("CA-SOLIC-11 — o prazo usa a data de São Paulo da retirada", async () => {
    await comDados(async (cliente) => {
      // 02:00 UTC de 12/11 ainda é 11/11 em São Paulo: prazo em 12/11 é válido.
      await expect(
        criarEmprestimo(cliente, { retiradoEm: "2026-11-12T02:00:00Z", devolverAte: "2026-11-12" }),
      ).resolves.toMatchObject({ rowCount: 1 });
    });
  });
});

describe("RLS e bloqueio de TRUNCATE", () => {
  it("CA-SOLIC-06 — a tabela tem RLS habilitada e as policies de negação", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        "SELECT relrowsecurity FROM pg_class WHERE relname = 'emprestimos'",
      );
      const { rows: policies } = await cliente.query<{ policyname: string }>(
        "SELECT policyname FROM pg_policies WHERE tablename = 'emprestimos' ORDER BY policyname",
      );

      expect(rows).toEqual([{ relrowsecurity: true }]);
      expect(policies.map((linha) => linha.policyname)).toEqual([
        "emprestimos_negar_anon",
        "emprestimos_negar_authenticated",
      ]);
    });
  });

  it.each(PAPEIS)("CA-SOLIC-06 — %s não lê nem grava empréstimos", async (papel) => {
    await comDados(async (cliente) => {
      await criarEmprestimo(cliente);
      const antes = await retrato(cliente);

      await comoPapel(cliente, papel, async () => {
        expect((await cliente.query("SELECT * FROM emprestimos")).rows).toEqual([]);
        await expect(
          criarEmprestimo(cliente, { equipamentoId: EQUIPAMENTO_A, userId: OPERACOES_A }),
        ).rejects.toThrow(/row-level security/);
        expect(
          (await cliente.query("UPDATE emprestimos SET devolver_ate = devolver_ate")).rowCount,
        ).toBe(0);
        expect((await cliente.query("DELETE FROM emprestimos")).rowCount).toBe(0);
      });

      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it.each(["public", ...PAPEIS])(
    "CA-SOLIC-06 — %s não tem o privilégio TRUNCATE",
    async (papel) => {
      await comDados(async (cliente) => {
        const { rows } = await cliente.query(
          "SELECT has_table_privilege($1, 'emprestimos', 'TRUNCATE') AS tem",
          [papel],
        );

        expect(rows).toEqual([{ tem: false }]);
      });
    },
  );

  it.each(PAPEIS)("CA-SOLIC-06 — TRUNCATE como %s é negado", async (papel) => {
    await comDados(async (cliente) => {
      await criarEmprestimo(cliente);
      const antes = await retrato(cliente);

      await comoPapel(cliente, papel, async () => {
        await expect(cliente.query("TRUNCATE emprestimos")).rejects.toMatchObject({
          code: SEM_PRIVILEGIO,
        });
      });

      expect(await retrato(cliente)).toEqual(antes);
    });
  });

  it.each([...PAPEIS, PAPEL_DONO])(
    "CA-SOLIC-06 — mesmo com o privilégio, o trigger barra TRUNCATE como %s",
    async (papel) => {
      await comDados(async (cliente) => {
        await criarEmprestimo(cliente);
        if (papel !== PAPEL_DONO) await cliente.query(`GRANT TRUNCATE ON emprestimos TO ${papel}`);
        const antes = await retrato(cliente);

        const executar = () => cliente.query("TRUNCATE emprestimos");
        const erro = await (
          papel === PAPEL_DONO ? executar() : comoPapel(cliente, papel, executar)
        ).catch((falha: unknown) => falha);

        expect(erro).toMatchObject({
          code: EXCECAO_DO_TRIGGER,
          message: expect.stringContaining("TRUNCATE não é permitido em emprestimos"),
        });
        expect(await retrato(cliente)).toEqual(antes);
      });
    },
  );

  it("CA-SOLIC-06 — o trigger de TRUNCATE dispara sempre, inclusive em réplica", async () => {
    await comDados(async (cliente) => {
      const { rows } = await cliente.query(
        "SELECT tgenabled FROM pg_trigger WHERE tgname = 'emprestimos_sem_truncate'",
      );

      expect(rows).toEqual([{ tgenabled: "A" }]);
    });
  });
});
