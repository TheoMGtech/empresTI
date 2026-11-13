// @vitest-environment node
//
// T-SEG-05: tabela técnica `limites_requisicao` (Spec 009), provada em Postgres real.
// CA-SEG-14: `anon` e `authenticated` não leem, inserem, alteram nem apagam linhas, e a RLS está
// habilitada. As CHECKs e a ausência de `tenant_id` seguem o DDL aprovado no plano.
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { iniciarBancoReal, PAPEL_DONO, type BancoReal } from "@/test/banco-real";

const TEMPO_DE_SUBIDA_MS = 300_000;
const TEMPO_DE_ENCERRAMENTO_MS = 60_000;

const VIOLACAO_CHECK = "23514";
const SEM_PRIVILEGIO = "42501";

const PAPEIS = ["anon", "authenticated"] as const;
const PRIVILEGIOS = ["SELECT", "INSERT", "UPDATE", "DELETE", "TRUNCATE"] as const;

const HMAC_A = "a".repeat(64);
const HMAC_B = "0123456789abcdef".repeat(4);

type Linha = {
  escopo?: string;
  identificador?: string;
  janelaInicio?: string;
  expiraEm?: string;
  contador?: number;
};

let banco: BancoReal;

async function comBanco<T>(acao: (cliente: Client) => Promise<T>) {
  const cliente = new Client({ connectionString: await banco.criarBanco() });
  await cliente.connect();
  try {
    return await acao(cliente);
  } finally {
    await cliente.end();
  }
}

function inserir(cliente: Client, dados: Linha = {}) {
  return cliente.query(
    `INSERT INTO limites_requisicao (escopo, identificador, janela_inicio, expira_em, contador)
     VALUES ($1, $2, $3::timestamptz, $4::timestamptz, $5)`,
    [
      dados.escopo ?? "login_email",
      dados.identificador ?? HMAC_A,
      dados.janelaInicio ?? "2026-11-12T12:00:00Z",
      dados.expiraEm ?? "2026-11-12T12:15:00Z",
      dados.contador ?? 1,
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
    "SELECT t::text AS linha FROM limites_requisicao t ORDER BY 1",
  );
  return rows.map((item) => item.linha);
}

beforeAll(async () => {
  banco = await iniciarBancoReal();
}, TEMPO_DE_SUBIDA_MS);

afterAll(async () => {
  await banco?.encerrar();
}, TEMPO_DE_ENCERRAMENTO_MS);

describe("estrutura de limites_requisicao", () => {
  it("CA-SEG-14 — a migration aplica do zero e cria as colunas previstas, sem tenant_id", async () => {
    await comBanco(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT column_name, data_type, is_nullable, column_default, datetime_precision
           FROM information_schema.columns
          WHERE table_schema = 'public' AND table_name = 'limites_requisicao'
          ORDER BY ordinal_position`,
      );

      expect(rows).toEqual([
        col("escopo", "text"),
        col("identificador", "text"),
        col("janela_inicio", "timestamp with time zone", null, 6),
        col("expira_em", "timestamp with time zone", null, 6),
        col("contador", "integer", "0"),
      ]);
    });
  });

  it("CA-SEG-14 — chave primária por escopo, identificador e janela, e índice em expira_em", async () => {
    await comBanco(async (cliente) => {
      const { rows } = await cliente.query<{ indexname: string; indexdef: string }>(
        `SELECT indexname, indexdef FROM pg_indexes
          WHERE tablename = 'limites_requisicao' ORDER BY indexname`,
      );

      expect(rows.map((linha) => linha.indexname)).toEqual([
        "limites_requisicao_expira_em_idx",
        "limites_requisicao_pkey",
      ]);
      expect(rows[0]?.indexdef).toContain("(expira_em)");
      expect(rows[1]?.indexdef).toContain("(escopo, identificador, janela_inicio)");
    });
  });

  it("CA-SEG-14 — o dono da tabela é o papel das migrations", async () => {
    await comBanco(async (cliente) => {
      const { rows } = await cliente.query(
        `SELECT pg_get_userbyid(relowner) AS dono FROM pg_class
          WHERE oid = 'limites_requisicao'::regclass`,
      );

      expect(rows).toEqual([{ dono: PAPEL_DONO }]);
    });
  });
});

describe("CHECKs", () => {
  it.each(["login_ip", "login_email", "mutacao_ip", "mutacao_usuario"])(
    "CA-SEG-14 — aceita o escopo %s",
    async (escopo) => {
      await comBanco(async (cliente) => {
        await expect(inserir(cliente, { escopo })).resolves.toMatchObject({ rowCount: 1 });
      });
    },
  );

  it.each<[string, Linha]>([
    ["escopo desconhecido", { escopo: "leitura" }],
    ["identificador em claro", { identificador: "pessoa@exemplo.com" }],
    ["identificador com maiúsculas", { identificador: "A".repeat(64) }],
    ["identificador curto", { identificador: "a".repeat(63) }],
    ["identificador longo", { identificador: "a".repeat(65) }],
    ["contador negativo", { contador: -1 }],
    ["expiração igual ao início", { expiraEm: "2026-11-12T12:00:00Z" }],
    ["expiração antes do início", { expiraEm: "2026-11-12T11:59:59Z" }],
  ])("CA-SEG-14 — rejeita %s", async (_caso, dados) => {
    await comBanco(async (cliente) => {
      await expect(inserir(cliente, dados)).rejects.toMatchObject({ code: VIOLACAO_CHECK });
    });
  });

  it("CA-SEG-14 — o contador começa em zero quando omitido", async () => {
    await comBanco(async (cliente) => {
      await cliente.query(
        `INSERT INTO limites_requisicao (escopo, identificador, janela_inicio, expira_em)
         VALUES ('mutacao_ip', $1, '2026-11-12T12:00:00Z', '2026-11-12T12:01:00Z')`,
        [HMAC_B],
      );
      const { rows } = await cliente.query("SELECT contador FROM limites_requisicao");

      expect(rows).toEqual([{ contador: 0 }]);
    });
  });
});

describe("RLS e privilégios", () => {
  it("CA-SEG-14 — a tabela tem RLS habilitada e as policies de negação", async () => {
    await comBanco(async (cliente) => {
      const { rows } = await cliente.query(
        "SELECT relrowsecurity FROM pg_class WHERE oid = 'limites_requisicao'::regclass",
      );
      const { rows: policies } = await cliente.query(
        `SELECT policyname, roles::text[] AS papeis, cmd, qual, with_check
           FROM pg_policies
          WHERE schemaname = 'public' AND tablename = 'limites_requisicao'
          ORDER BY policyname`,
      );

      expect(rows).toEqual([{ relrowsecurity: true }]);
      expect(policies).toEqual(
        PAPEIS.map((papel) => ({
          policyname: `limites_requisicao_negar_${papel}`,
          papeis: [papel],
          cmd: "ALL",
          qual: "false",
          with_check: "false",
        })),
      );
    });
  });

  it.each(["public", ...PAPEIS].flatMap((papel) => PRIVILEGIOS.map((p) => [papel, p] as const)))(
    "CA-SEG-14 — %s não tem o privilégio %s",
    async (papel, privilegio) => {
      await comBanco(async (cliente) => {
        const { rows } = await cliente.query(
          "SELECT has_table_privilege($1, 'limites_requisicao', $2) AS tem",
          [papel, privilegio],
        );

        expect(rows).toEqual([{ tem: false }]);
      });
    },
  );

  it.each(PAPEIS)(
    "CA-SEG-14 — %s não lê, não insere, não altera nem apaga linhas",
    async (papel) => {
      await comBanco(async (cliente) => {
        await inserir(cliente);
        const antes = await retrato(cliente);

        await comoPapel(cliente, papel, async () => {
          await expect(cliente.query("SELECT * FROM limites_requisicao")).rejects.toMatchObject({
            code: SEM_PRIVILEGIO,
          });
          await expect(inserir(cliente, { identificador: HMAC_B })).rejects.toMatchObject({
            code: SEM_PRIVILEGIO,
          });
          await expect(
            cliente.query("UPDATE limites_requisicao SET contador = contador + 1"),
          ).rejects.toMatchObject({ code: SEM_PRIVILEGIO });
          await expect(cliente.query("DELETE FROM limites_requisicao")).rejects.toMatchObject({
            code: SEM_PRIVILEGIO,
          });
        });

        expect(await retrato(cliente)).toEqual(antes);
      });
    },
  );

  // Defesa em profundidade: mesmo que um GRANT futuro devolvesse os privilégios, a RLS ainda nega.
  // O GRANT fica dentro de uma transação desfeita e não sobrevive ao teste.
  it.each(PAPEIS)(
    "CA-SEG-14 — com privilégios concedidos numa transação, a RLS ainda nega tudo a %s",
    async (papel) => {
      await comBanco(async (cliente) => {
        await inserir(cliente);
        const antes = await retrato(cliente);

        await cliente.query("BEGIN");
        try {
          await cliente.query(`GRANT ALL ON limites_requisicao TO ${papel}`);
          await cliente.query(`SET LOCAL ROLE ${papel}`);

          expect((await cliente.query("SELECT * FROM limites_requisicao")).rows).toEqual([]);
          expect(
            (await cliente.query("UPDATE limites_requisicao SET contador = contador + 1"))
              .rowCount,
          ).toBe(0);
          expect((await cliente.query("DELETE FROM limites_requisicao")).rowCount).toBe(0);
          await expect(inserir(cliente, { identificador: HMAC_B })).rejects.toThrow(
            /row-level security/,
          );
        } finally {
          await cliente.query("ROLLBACK");
        }

        expect(await retrato(cliente)).toEqual(antes);
        const { rows } = await cliente.query(
          "SELECT has_table_privilege($1, 'limites_requisicao', 'SELECT') AS tem",
          [papel],
        );
        expect(rows).toEqual([{ tem: false }]);
      });
    },
  );
});

function col(
  column_name: string,
  data_type: string,
  column_default: string | null = null,
  datetime_precision: number | null = null,
) {
  return { column_name, data_type, is_nullable: "NO", column_default, datetime_precision };
}
